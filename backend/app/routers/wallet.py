"""Wallet: balance from the ledger, cash top-ups at agencies, card top-ups (sandbox), payouts.

Cash agency integration (to agree with Cash Plus / Wafacash):
  POST /api/payments/cash/lookup   {"reference"}                          → amount + masked name
  POST /api/payments/cash/webhook  {"reference","amount","agency_txn_id"} → credits the wallet
Both requests carry header X-Signature = hex(HMAC-SHA256(CASH_WEBHOOK_SECRET, raw body)).
"""
import hashlib
import hmac
import json
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import CashTopup, LedgerEntry, Parcel, Payout, Trip, User, now
from ..security import current_user, limiter
from ..services import (
    CASH_MAX_CENTS, CASH_MIN_CENTS, CASH_NETWORKS, balance_cents, cash_out, cents, expire_cash_topups, ledger,
    ledger_out, mad, mark_cash_paid, net_for_traveler, new_cash_reference, notify,
)

router = APIRouter(prefix="/api", tags=["wallet"])


def withdrawable_cents(db: Session, user_id: str) -> int:
    """Only earnings can be paid out (not top-ups), and never more than the balance."""
    earned = db.scalar(select(func.coalesce(func.sum(LedgerEntry.amount_cents), 0)).where(
        LedgerEntry.user_id == user_id, LedgerEntry.kind == "earning")) or 0
    paid_out = db.scalar(select(func.coalesce(func.sum(Payout.amount_cents), 0)).where(
        Payout.user_id == user_id, Payout.status != "rejected")) or 0
    return max(0, min(balance_cents(db, user_id), earned - paid_out))


@router.get("/me/wallet")
def wallet(user: User = Depends(current_user), db: Session = Depends(get_db)):
    expire_cash_topups(db, user.id)
    db.commit()
    entries = db.scalars(select(LedgerEntry).where(LedgerEntry.user_id == user.id).order_by(LedgerEntry.id.desc()).limit(200)).all()
    topups = db.scalars(select(CashTopup).where(CashTopup.user_id == user.id).order_by(CashTopup.created_at.desc()).limit(50)).all()
    payouts = db.scalars(select(Payout).where(Payout.user_id == user.id).order_by(Payout.created_at.desc())).all()
    mine = db.scalars(select(Parcel).join(Trip).where(Trip.traveler_id == user.id)).all()
    month = now().date().isoformat()[:7]
    delivered = [p for p in mine if p.status == "delivered"]
    total = sum(net_for_traveler(p) for p in delivered)
    return {
        "balance": mad(balance_cents(db, user.id)),
        "transactions": [ledger_out(e) for e in entries],
        "cashTopups": [cash_out(c) for c in topups],
        "payouts": [{"id": p.id, "amount": mad(p.amount_cents), "status": p.status, "method": p.method,
                     "date": p.created_at.date().isoformat()} for p in payouts],
        "earnings": {
            "total": mad(total),
            "thisMonth": mad(sum(net_for_traveler(p) for p in delivered if p.delivered_at and p.delivered_at.isoformat().startswith(month))),
            "pending": mad(sum(net_for_traveler(p) for p in mine if p.status in ("accepted", "picked_up"))),
            "withdrawn": mad(sum(p.amount_cents for p in payouts if p.status != "rejected")),
            "available": mad(withdrawable_cents(db, user.id)),
        },
        "sandbox": settings.sandbox,
    }


class AmountIn(BaseModel):
    amount: float = Field(gt=0, le=10000)


@router.post("/wallet/card-topup")
def card_topup(data: AmountIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not settings.sandbox:
        raise HTTPException(501, "card_provider_not_configured")
    ledger(db, user.id, "topup", cents(data.amount), None, "Carte bancaire (sandbox)")
    db.commit()
    return {"balance": mad(balance_cents(db, user.id))}


class CashIn(BaseModel):
    amount: float
    network: str


@router.post("/wallet/cash-topups")
def create_cash_topup(data: CashIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.network not in CASH_NETWORKS:
        raise HTTPException(422, "unknown_network")
    amount = cents(data.amount)
    if not CASH_MIN_CENTS <= amount <= CASH_MAX_CENTS:
        raise HTTPException(422, "cash_limits")
    limiter.check("cash:" + user.id, 10, 86400)
    expire_cash_topups(db, user.id)
    if db.scalar(select(func.count(CashTopup.id)).where(CashTopup.user_id == user.id, CashTopup.status == "pending")) >= 3:
        raise HTTPException(409, "too_many_pending")
    c = CashTopup(user_id=user.id, network=data.network, amount_cents=amount, reference=new_cash_reference(db),
                  expires_at=now() + timedelta(hours=settings.cash_ttl_hours))
    db.add(c)
    db.commit()
    return {"topup": cash_out(c)}


def _own_topup(db: Session, topup_id: str, user: User) -> CashTopup:
    c = db.get(CashTopup, topup_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "topup_not_found")
    return c


@router.post("/wallet/cash-topups/{topup_id}/cancel")
def cancel_cash_topup(topup_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_topup(db, topup_id, user)
    if c.status != "pending":
        raise HTTPException(409, f"topup_{c.status}")
    c.status = "cancelled"
    db.commit()
    return {"topup": cash_out(c)}


@router.post("/wallet/cash-topups/{topup_id}/simulate-paid")
def simulate_cash_paid(topup_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Sandbox only: stands in for the agency's webhook."""
    if not settings.sandbox:
        raise HTTPException(403, "sandbox_only")
    c = _own_topup(db, topup_id, user)
    mark_cash_paid(db, c, "SANDBOX")
    db.commit()
    return {"topup": cash_out(c), "balance": mad(balance_cents(db, user.id))}


async def _signed_json(request: Request) -> dict:
    raw = await request.body()
    expected = hmac.new(settings.cash_webhook_secret.encode(), raw, hashlib.sha256).hexdigest()
    if not settings.cash_webhook_secret or not hmac.compare_digest(expected, request.headers.get("x-signature", "")):
        raise HTTPException(401, "bad_signature")
    try:
        return json.loads(raw)
    except ValueError:
        raise HTTPException(400, "bad_json")


@router.post("/payments/cash/lookup")
async def agency_lookup(request: Request, db: Session = Depends(get_db)):
    data = await _signed_json(request)
    c = db.scalar(select(CashTopup).where(CashTopup.reference == str(data.get("reference", ""))))
    if not c:
        raise HTTPException(404, "unknown_reference")
    expire_cash_topups(db, c.user_id)
    db.commit()
    u = db.get(User, c.user_id)
    return {"reference": c.reference, "amount": mad(c.amount_cents), "status": c.status,
            "customer": u.name.split(" ")[0] + " " + (u.name.split(" ")[-1][:1] + "." if " " in u.name else "")}


@router.post("/payments/cash/webhook")
async def agency_webhook(request: Request, db: Session = Depends(get_db)):
    data = await _signed_json(request)
    c = db.scalar(select(CashTopup).where(CashTopup.reference == str(data.get("reference", ""))))
    if not c:
        raise HTTPException(404, "unknown_reference")
    txn = str(data.get("agency_txn_id", ""))
    if c.status == "paid" and c.agency_txn_id == txn:
        return {"ok": True, "duplicate": True}  # retries are safe
    if cents(data.get("amount", 0)) != c.amount_cents:
        raise HTTPException(409, "amount_mismatch")
    mark_cash_paid(db, c, txn)
    db.commit()
    return {"ok": True}


class PayoutIn(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    method: str = Field(default="bank", pattern="^(bank|cash)$")
    details: str = Field(default="", max_length=200)  # RIB, or the agency network for cash


@router.post("/wallet/payouts")
def request_payout(data: PayoutIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    available = withdrawable_cents(db, user.id)
    amount = cents(data.amount) if data.amount else available
    if amount <= 0 or amount > available:
        raise HTTPException(409, "nothing_to_withdraw")
    po = Payout(user_id=user.id, amount_cents=amount, method=data.method, details=data.details.strip())
    db.add(po)
    db.flush()
    ledger(db, user.id, "payout", -amount, None, f"Retrait {po.id}")
    notify(db, user, "payoutRequested", f"{mad(amount):g} MAD", "earnings")
    db.commit()
    return {"payout": {"id": po.id, "amount": mad(amount), "status": po.status}}
