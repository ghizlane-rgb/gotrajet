"""Back-office for the GOTRAJET team. Every action is written to the audit log."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import (
    AuditLog, CashTopup, Dispute, LedgerEntry, Parcel, Payout, SupportTicket, TravelerCancellation, Trip, TwoFactor,
    User, VerificationDoc, now,
)
from ..security import admin_base, admin_user, totp_new_secret, totp_verify
from ..services import (
    cancellation_out, cancels_this_month, cash_out, iso, is_verified_traveler, ledger, mad, notify, parcel_for_sender,
    refund_escrow, release_escrow, user_out, verification_state,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def audit(db: Session, admin: User, action: str, target: str, detail: str = "") -> None:
    db.add(AuditLog(admin_id=admin.id, action=action, target=target, detail=detail[:2000]))


class NoteIn(BaseModel):
    note: str = Field(default="", max_length=1000)


# ---------- Two-factor login for admins (authenticator app) ----------

@router.get("/2fa")
def twofa_status(admin: User = Depends(admin_base), db: Session = Depends(get_db)):
    tf = db.get(TwoFactor, admin.id)
    return {"enabled": bool(tf and tf.enabled), "required": settings.admin_require_2fa}


@router.post("/2fa/setup")
def twofa_setup(admin: User = Depends(admin_base), db: Session = Depends(get_db)):
    tf = db.get(TwoFactor, admin.id)
    if tf and tf.enabled:
        raise HTTPException(409, "2fa_already_enabled")
    if not tf:
        tf = TwoFactor(user_id=admin.id, secret=totp_new_secret())
        db.add(tf)
    else:
        tf.secret = totp_new_secret()
    db.commit()
    label = f"GOTRAJET:{admin.email}"
    return {"secret": tf.secret, "uri": f"otpauth://totp/{label}?secret={tf.secret}&issuer=GOTRAJET&digits=6&period=30"}


class OtpIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


@router.post("/2fa/enable")
def twofa_enable(data: OtpIn, admin: User = Depends(admin_base), db: Session = Depends(get_db)):
    tf = db.get(TwoFactor, admin.id)
    if not tf or tf.enabled:
        raise HTTPException(409, "2fa_not_in_setup")
    step = totp_verify(tf.secret, data.code)
    if step is None:
        raise HTTPException(400, "wrong_otp")
    tf.enabled, tf.last_step = True, step
    admin.token_version += 1  # other sessions must log in again with the code
    audit(db, admin, "2fa_enable", admin.id)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def stats(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    count = lambda q: db.scalar(q) or 0  # noqa: E731
    by_status = dict(db.execute(select(Parcel.status, func.count(Parcel.id)).group_by(Parcel.status)).all())
    held = count(select(func.sum(Parcel.price_cents)).where(Parcel.escrow.in_(("held", "frozen"))))
    revenue = count(select(func.sum(LedgerEntry.amount_cents)).where(LedgerEntry.user_id.is_(None)))
    users = db.scalars(select(User)).all()
    return {
        "users": len(users),
        "verifiedTravelers": sum(1 for u in users if is_verified_traveler(db, u)),
        "upcomingTrips": count(select(func.count(Trip.id)).where(Trip.status == "upcoming")),
        "parcels": by_status,
        "escrowHeld": mad(held),
        "platformRevenue": mad(revenue),
        "pendingDocs": count(select(func.count(VerificationDoc.id)).where(VerificationDoc.status == "pending")),
        "openDisputes": count(select(func.count(Dispute.id)).where(Dispute.status == "open")),
        "requestedPayouts": count(select(func.count(Payout.id)).where(Payout.status == "requested")),
        "requestedPayoutsAmount": mad(count(select(func.sum(Payout.amount_cents)).where(Payout.status == "requested"))),
        "pendingCash": count(select(func.count(CashTopup.id)).where(CashTopup.status == "pending")),
        "openTickets": count(select(func.count(SupportTicket.id)).where(SupportTicket.status == "open")),
        "pendingClaims": count(select(func.count(TravelerCancellation.id)).where(TravelerCancellation.claim_status == "pending")),
        "sandbox": settings.sandbox,
    }


# ---------- Users ----------

@router.get("/users")
def users(q: str = "", admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    query = select(User).order_by(User.created_at.desc()).limit(200)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(or_(func.lower(User.name).like(like), func.lower(User.email).like(like), User.phone.like(f"%{q}%")))
    return {"users": [{**user_out(db, u), "status": u.status, "verification": verification_state(db, u),
                       "verifiedTraveler": is_verified_traveler(db, u)} for u in db.scalars(query)]}


@router.post("/users/{user_id}/{action}")
def user_action(user_id: str, action: str, data: NoteIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "user_not_found")
    if action == "suspend":
        if u.id == admin.id:
            raise HTTPException(409, "cannot_suspend_self")
        u.status = "suspended"
        u.token_version += 1  # logs the user out
    elif action == "activate":
        u.status = "active"
    else:
        raise HTTPException(404, "unknown_action")
    audit(db, admin, "user_" + action, u.id, data.note)
    db.commit()
    return {"ok": True}


# ---------- Identity documents ----------

@router.get("/docs")
def docs(status: str = "pending", admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    q = select(VerificationDoc).order_by(VerificationDoc.created_at)
    if status != "all":
        q = q.where(VerificationDoc.status == status)
    out = []
    for d in db.scalars(q.limit(200)):
        u = db.get(User, d.user_id)
        out.append({"id": d.id, "userId": d.user_id, "userName": u.name, "userEmail": u.email, "phone": u.phone,
                    "phoneVerified": u.phone_verified, "kind": d.kind, "status": d.status, "note": d.note,
                    "contentType": d.content_type, "createdAt": iso(d.created_at)})
    return {"docs": out}


@router.get("/docs/{doc_id}/file")
def doc_file(doc_id: str, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    d = db.get(VerificationDoc, doc_id)
    if not d:
        raise HTTPException(404, "doc_not_found")
    path = settings.upload_dir / d.stored_name
    if not path.is_file():
        raise HTTPException(404, "file_missing")
    return FileResponse(path, media_type=d.content_type, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.post("/docs/{doc_id}/{action}")
def doc_action(doc_id: str, action: str, data: NoteIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    d = db.get(VerificationDoc, doc_id)
    if not d:
        raise HTTPException(404, "doc_not_found")
    if action not in ("approve", "reject"):
        raise HTTPException(404, "unknown_action")
    d.status = "approved" if action == "approve" else "rejected"
    d.note, d.reviewed_at, d.reviewed_by = data.note, now(), admin.id
    u = db.get(User, d.user_id)
    notify(db, u, "docApprovedN" if action == "approve" else "docRejectedN", d.kind, "verification")
    audit(db, admin, "doc_" + action, d.id, data.note)
    db.commit()
    return {"ok": True}


# ---------- Parcels & disputes ----------

@router.get("/parcels")
def parcels(status: str = "all", admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    q = select(Parcel).order_by(Parcel.created_at.desc()).limit(300)
    if status != "all":
        q = q.where(Parcel.status == status)
    out = []
    for p in db.scalars(q):
        o = parcel_for_sender(db, p)
        o.pop("code")  # staff never needs the handoff code
        out.append({**o, "senderName": p.sender.name, "travelerName": p.trip.traveler.name, "rawStatus": p.status})
    return {"parcels": out}


@router.get("/disputes")
def disputes(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    out = []
    for d in db.scalars(select(Dispute).order_by(Dispute.status.desc(), Dispute.created_at.desc()).limit(200)):
        p = d.parcel
        opener = db.get(User, d.opened_by)
        out.append({"id": d.id, "parcelId": p.id, "status": d.status, "reason": d.reason, "resolution": d.resolution,
                    "adminNote": d.admin_note, "openedBy": opener.name if opener else "", "createdAt": iso(d.created_at),
                    "parcelStatus": p.status, "escrow": p.escrow, "amount": mad(p.price_cents),
                    "sender": p.sender.name, "traveler": p.trip.traveler.name,
                    "route": f"{p.trip.from_city} → {p.trip.to_city}"})
    return {"disputes": out}


class ResolveIn(BaseModel):
    resolution: str = Field(pattern="^(refund_sender|release_traveler)$")
    note: str = Field(default="", max_length=1000)


@router.post("/disputes/{dispute_id}/resolve")
def resolve_dispute(dispute_id: str, data: ResolveIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    d = db.get(Dispute, dispute_id)
    if not d or d.status != "open":
        raise HTTPException(404, "dispute_not_open")
    p = d.parcel
    if p.escrow not in ("held", "frozen"):
        raise HTTPException(409, "escrow_already_settled")  # handle by manual adjustment
    if data.resolution == "refund_sender":
        refund_escrow(db, p, f"{p.id} · litige")
        if p.status != "delivered":
            p.status = "cancelled"
        notify(db, p.sender, "disputeRefund", p.id, f"parcel/{p.id}", sms=True)
    else:
        release_escrow(db, p, f"{p.id} · litige")
        notify(db, p.trip.traveler, "disputeReleased", p.id, f"request/{p.id}", sms=True)
    d.status, d.resolution, d.admin_note, d.resolved_at = "resolved", data.resolution, data.note, now()
    audit(db, admin, "dispute_" + data.resolution, d.id, data.note)
    db.commit()
    return {"ok": True}


# ---------- Money ----------

@router.get("/payouts")
def payouts(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    ps = db.scalars(select(Payout).order_by(Payout.status.desc(), Payout.created_at.desc()).limit(300)).all()
    return {"payouts": [{"id": p.id, "userId": p.user_id, "userName": p.user.name, "phone": p.user.phone,
                         "amount": mad(p.amount_cents), "method": p.method, "details": p.details, "status": p.status,
                         "createdAt": iso(p.created_at)} for p in ps]}


@router.post("/payouts/{payout_id}/{action}")
def payout_action(payout_id: str, action: str, data: NoteIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    p = db.get(Payout, payout_id)
    if not p or p.status != "requested":
        raise HTTPException(404, "payout_not_requested")
    if action == "paid":
        p.status = "paid"
        notify(db, p.user, "payoutPaid", f"{mad(p.amount_cents):g} MAD", "earnings", sms=True)
    elif action == "reject":
        p.status = "rejected"
        ledger(db, p.user_id, "payout_reversal", p.amount_cents, None, f"Retrait {p.id} refusé")
        notify(db, p.user, "payoutRejected", f"{mad(p.amount_cents):g} MAD", "earnings")
    else:
        raise HTTPException(404, "unknown_action")
    p.processed_at = now()
    audit(db, admin, "payout_" + action, p.id, data.note)
    db.commit()
    return {"ok": True}


@router.get("/cancel-claims")
def cancel_claims(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    """Traveller cancellations that carry a fee claim, pending first."""
    cs = db.scalars(select(TravelerCancellation).where(TravelerCancellation.claim_status != "none")
                    .order_by(TravelerCancellation.claim_status.asc(), TravelerCancellation.created_at.desc()).limit(300)).all()
    out = []
    for c in cs:
        t, p = db.get(User, c.traveler_id), db.get(Parcel, c.parcel_id)
        out.append({**cancellation_out(c), "traveler": t.name if t else "", "phone": t.phone if t else "",
                    "route": f"{p.trip.from_city} → {p.trip.to_city}" if p else "",
                    "cancelsThisMonth": cancels_this_month(db, c.traveler_id), "createdAt": iso(c.created_at)})
    return {"claims": out}


class ClaimAnswerIn(BaseModel):
    note: str = Field(default="", max_length=1000)


@router.post("/cancel-claims/{cancel_id}/{action}")
def cancel_claim_action(cancel_id: str, action: str, data: ClaimAnswerIn, admin: User = Depends(admin_user),
                        db: Session = Depends(get_db)):
    c = db.get(TravelerCancellation, cancel_id)
    if not c or c.claim_status != "pending":
        raise HTTPException(404, "claim_not_pending")
    traveler = db.get(User, c.traveler_id)
    if action == "refund":
        ledger(db, c.traveler_id, "fee_refund", c.fee_cents, c.parcel_id, f"Frais d'annulation #{c.parcel_id} remboursés")
        ledger(db, None, "commission", -c.fee_cents, c.parcel_id, f"Remboursement frais d'annulation #{c.parcel_id}")
        c.claim_status = "refunded"
        notify(db, traveler, "cancelFeeRefunded", f"{mad(c.fee_cents):g} MAD · #{c.parcel_id}", "earnings")
    elif action == "reject":
        c.claim_status = "rejected"
        notify(db, traveler, "cancelClaimRejected", f"#{c.parcel_id}", "earnings")
    else:
        raise HTTPException(404, "unknown_action")
    c.claim_answer, c.resolved_at = data.note.strip(), now()
    audit(db, admin, "cancel_claim_" + action, c.id, data.note)
    db.commit()
    return {"ok": True}


@router.get("/cash-topups")
def cash_topups(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    cs = db.scalars(select(CashTopup).order_by(CashTopup.created_at.desc()).limit(300)).all()
    return {"topups": [{**cash_out(c), "userName": db.get(User, c.user_id).name, "agencyTxn": c.agency_txn_id} for c in cs]}


# ---------- Support ----------

@router.get("/tickets")
def tickets(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    ts = db.scalars(select(SupportTicket).order_by(SupportTicket.status.desc(), SupportTicket.created_at.desc()).limit(300)).all()
    return {"tickets": [{"id": t.id, "userName": db.get(User, t.user_id).name, "userEmail": db.get(User, t.user_id).email,
                         "topic": t.topic, "subject": t.subject, "message": t.message, "status": t.status,
                         "createdAt": iso(t.created_at)} for t in ts]}


@router.post("/tickets/{ticket_id}/close")
def close_ticket(ticket_id: str, data: NoteIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    t = db.get(SupportTicket, ticket_id)
    if not t:
        raise HTTPException(404, "ticket_not_found")
    t.status = "closed"
    audit(db, admin, "ticket_close", t.id, data.note)
    db.commit()
    return {"ok": True}


@router.get("/audit")
def audit_log(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(300)).all()
    names = {u.id: u.name for u in db.scalars(select(User).where(User.is_admin.is_(True)))}
    return {"entries": [{"at": iso(a.created_at), "admin": names.get(a.admin_id, a.admin_id), "action": a.action,
                         "target": a.target, "detail": a.detail} for a in rows]}
