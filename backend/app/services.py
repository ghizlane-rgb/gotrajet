"""Business rules shared by the routes: wallet ledger, escrow, notifications, output formats."""
import re
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import messaging
from .config import settings
from .models import (
    CashTopup, Dispute, LedgerEntry, Notification, Parcel, Review, Trip, User, VerificationDoc, now,
)

CITIES = ["Casablanca", "Rabat", "Marrakech", "Agadir", "Fès", "Tanger", "Oujda", "Meknès"]
CASH_NETWORKS = ["Cash Plus", "Wafacash", "Barid Cash", "Damane Cash"]
CASH_MIN_CENTS, CASH_MAX_CENTS = 20_00, 5000_00
DOC_KINDS = ["id", "photo", "license", "vehicle"]
TRAVELER_REQUIRED_DOCS = ["id", "photo"]


# ---------- Road network (along-the-way matching, distances) ----------
# Main road links between the served cities, in km (approximate, motorway / national road).
# Keep in sync with ROAD_LINKS in dist/js/smart.js.
ROAD_LINKS = [
    ("Tanger", "Rabat", 250), ("Rabat", "Casablanca", 87), ("Casablanca", "Marrakech", 240),
    ("Marrakech", "Agadir", 250), ("Rabat", "Meknès", 140), ("Meknès", "Fès", 60),
    ("Fès", "Oujda", 340), ("Tanger", "Meknès", 290), ("Tanger", "Fès", 300),
]


def road_path(a: str, b: str) -> tuple[list[str], int]:
    """Shortest road path a → b (cities in order) and its length in km. ([], 0) when unknown."""
    if a == b or a not in CITIES or b not in CITIES:
        return [], 0
    graph: dict[str, list[tuple[str, int]]] = {c: [] for c in CITIES}
    for x, y, km in ROAD_LINKS:
        graph[x].append((y, km))
        graph[y].append((x, km))
    dist, prev, todo = {a: 0}, {}, set(CITIES)
    while todo:
        city = min(todo, key=lambda c: (dist.get(c, 10**9), CITIES.index(c)))
        if dist.get(city, 10**9) >= 10**9:
            break
        todo.discard(city)
        for nxt, km in graph[city]:
            if dist[city] + km < dist.get(nxt, 10**9):
                dist[nxt], prev[nxt] = dist[city] + km, city
    if b not in dist:
        return [], 0
    path = [b]
    while path[-1] != a:
        path.append(prev[path[-1]])
    return path[::-1], dist[b]


def trip_serves(trip_from: str, trip_to: str, a: str, b: str) -> str | None:
    """'direct' when the trip is exactly a → b, 'along' when the trip passes through a then b, else None."""
    if (trip_from, trip_to) == (a, b):
        return "direct"
    path, _ = road_path(trip_from, trip_to)
    if a in path and b in path and path.index(a) < path.index(b):
        return "along"
    return None


def mad(cents: int) -> float:
    return round(cents / 100, 2)


def cents(amount: float) -> int:
    return int(round(float(amount) * 100))


def iso(d: datetime | None) -> str | None:
    return d.isoformat() + "Z" if d else None


def normalize_phone(phone: str) -> str:
    p = re.sub(r"[\s.\-()]", "", phone or "")
    if p.startswith("00"):
        p = "+" + p[2:]
    if p.startswith("0") and len(p) == 10:  # Moroccan national format 06xxxxxxxx
        p = "+212" + p[1:]
    if not re.fullmatch(r"\+\d{8,15}", p):
        raise HTTPException(422, "invalid_phone")
    return p


# ---------- Wallet ----------

def balance_cents(db: Session, user_id: str) -> int:
    return db.scalar(select(func.coalesce(func.sum(LedgerEntry.amount_cents), 0)).where(LedgerEntry.user_id == user_id)) or 0


def ledger(db: Session, user_id: str | None, kind: str, amount_cents: int, parcel_id: str | None = None, ref: str = "") -> LedgerEntry:
    entry = LedgerEntry(user_id=user_id, kind=kind, amount_cents=amount_cents, parcel_id=parcel_id, ref=ref[:200])
    db.add(entry)
    return entry


def transport_cents(p: Parcel) -> int:
    """Price without the insurance fee: the part the traveller earns from (minus commission)."""
    return p.price_cents - (settings.insurance_fee_cents * p.quantity if p.insurance else 0)


def net_for_traveler(p: Parcel) -> int:
    return int(round(transport_cents(p) * (1 - settings.commission_rate)))


def release_escrow(db: Session, p: Parcel, ref: str = "") -> None:
    if p.escrow not in ("held", "frozen"):
        return
    net = net_for_traveler(p)
    ledger(db, p.trip.traveler_id, "earning", net, p.id, ref or f"{p.trip.from_city} → {p.trip.to_city}")
    ledger(db, None, "commission", p.price_cents - net, p.id, "commission + assurance")
    p.escrow = "released"


def refund_escrow(db: Session, p: Parcel, ref: str = "") -> None:
    if p.escrow not in ("held", "frozen"):
        return
    ledger(db, p.sender_id, "refund", p.price_cents, p.id, ref or p.id)
    p.escrow = "refunded"


def expire_cash_topups(db: Session, user_id: str | None = None) -> None:
    q = select(CashTopup).where(CashTopup.status == "pending", CashTopup.expires_at < now())
    if user_id:
        q = q.where(CashTopup.user_id == user_id)
    for c in db.scalars(q):
        c.status = "expired"


def mark_cash_paid(db: Session, c: CashTopup, agency_txn_id: str = "") -> None:
    if c.status != "pending":
        raise HTTPException(409, f"topup_{c.status}")
    if c.expires_at < now():
        c.status = "expired"
        raise HTTPException(409, "topup_expired")
    c.status = "paid"
    c.paid_at = now()
    c.agency_txn_id = agency_txn_id[:80]
    ledger(db, c.user_id, "topup", c.amount_cents, None, f"{c.network} · {c.reference}")
    user = db.get(User, c.user_id)
    notify(db, user, "paymentConfirmed", f"{mad(c.amount_cents):g} MAD · {c.network}", "wallet", sms=True)


def new_cash_reference(db: Session) -> str:
    while True:
        ref = "".join(secrets.choice("0123456789") for _ in range(10))
        if ref[0] != "0" and not db.scalar(select(CashTopup.id).where(CashTopup.reference == ref)):
            return ref


# ---------- Notifications ----------

SMS_TEXT = {
    "requestAccepted": "GOTRAJET : votre demande {body} a été acceptée.",
    "newRequest": "GOTRAJET : nouvelle demande de colis {body}.",
    "requestDeclined": "GOTRAJET : votre demande {body} a été refusée. Montant remboursé sur votre solde.",
    "onRoad": "GOTRAJET : votre colis {body} est pris en charge et en route.",
    "delivered": "GOTRAJET : colis {body} livré. Merci !",
    "paymentConfirmed": "GOTRAJET : recharge confirmée, {body}.",
}


def notify(db: Session, user: User | None, key: str, body: str, target: str = "", sms: bool = False) -> None:
    if not user:
        return
    db.add(Notification(user_id=user.id, key=key, body=body[:300], target=target))
    if sms and user.phone and user.phone_verified:
        messaging.send_sms(user.phone, SMS_TEXT.get(key, "GOTRAJET : {body}").format(body=body), key, [body])


# ---------- Verification ----------

def verification_state(db: Session, user: User) -> dict:
    out = {"phone": "verified" if user.phone_verified else "missing"}
    docs = db.scalars(
        select(VerificationDoc).where(VerificationDoc.user_id == user.id).order_by(VerificationDoc.created_at)
    ).all()
    for kind in DOC_KINDS:
        latest = [d for d in docs if d.kind == kind]
        status = latest[-1].status if latest else "missing"
        out[kind] = {"approved": "verified", "pending": "inReview", "rejected": "rejected"}.get(status, "missing")
    return out


def is_verified_traveler(db: Session, user: User) -> bool:
    v = verification_state(db, user)
    return v["phone"] == "verified" and all(v[k] == "verified" for k in TRAVELER_REQUIRED_DOCS)


# ---------- Ratings ----------

def rating_of(db: Session, user_id: str) -> tuple[float, int]:
    avg, count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.target_id == user_id)
    ).one()
    return (round(float(avg), 1) if avg else 0.0, int(count or 0))


# ---------- Output formats (match the website's existing data shapes) ----------

TRIP_STATUS_OUT = {"upcoming": "upcoming", "in_progress": "inProgress", "completed": "completed", "cancelled": "cancelled"}
SENDER_STATUS_OUT = {
    "awaiting": "awaiting", "accepted": "reserved", "picked_up": "transit",
    "delivered": "delivered", "declined": "declined", "cancelled": "cancelled",
}
TRAVELER_STATUS_OUT = {
    "awaiting": "awaiting", "accepted": "accepted", "picked_up": "pickedUp",
    "delivered": "delivered", "declined": "declined", "cancelled": "cancelled",
}
ACTIVE = ("awaiting", "accepted", "picked_up")
ON_BOARD = ("accepted", "picked_up", "delivered")


def trip_load(db: Session, trip: Trip) -> tuple[int, float]:
    count, kg = db.execute(
        select(func.coalesce(func.sum(Parcel.quantity), 0), func.coalesce(func.sum(Parcel.weight_kg), 0.0))
        .where(Parcel.trip_id == trip.id, Parcel.status.in_(ACTIVE))
    ).one()
    return int(count), float(kg)


def delivered_count(db: Session, traveler_id: str) -> int:
    """Parcels this traveller has delivered (confirmed with the recipient's code)."""
    return int(db.scalar(
        select(func.count(Parcel.id)).join(Trip).where(Trip.traveler_id == traveler_id, Parcel.status == "delivered")
    ) or 0)


def trip_out(db: Session, t: Trip, ratings: dict | None = None) -> dict:
    rating, reviews = (ratings or {}).get(t.traveler_id) or rating_of(db, t.traveler_id)
    used, _ = trip_load(db, t)
    _, km = road_path(t.from_city, t.to_city)
    return {
        # Trust facts computed from real records, never typed in by the traveller
        "verified": is_verified_traveler(db, t.traveler),
        "deliveries": delivered_count(db, t.traveler_id),
        "memberSince": iso(t.traveler.created_at),
        "distanceKm": km,
        "id": t.id,
        "travelerId": t.traveler_id,
        "name": t.traveler.name,
        "from": t.from_city,
        "to": t.to_city,
        "date": t.date,
        "time": t.time,
        "price": mad(t.price_cents),
        "seats": t.seats,
        "freeSeats": max(0, t.seats - used),
        "weight": t.max_weight_kg,
        "vehicle": t.vehicle,
        "vehicleModel": t.vehicle_model,
        "pickup": t.pickup,
        "dropoff": t.dropoff,
        "notes": t.notes,
        "status": TRIP_STATUS_OUT.get(t.status, t.status),
        "rating": rating,
        "reviews": reviews,
        "duration": "—",
        "photo": 0,
    }


def dispute_of(db: Session, parcel_id: str) -> dict | None:
    d = db.scalar(select(Dispute).where(Dispute.parcel_id == parcel_id).order_by(Dispute.created_at.desc()))
    return {"id": d.id, "status": d.status, "reason": d.reason, "resolution": d.resolution} if d else None


def parcel_for_sender(db: Session, p: Parcel) -> dict:
    t = p.trip
    return {
        "id": p.id, "tripId": t.id, "travelerId": t.traveler_id, "name": t.traveler.name,
        "from": t.from_city, "to": t.to_city, "date": t.date, "time": t.time,
        "weight": p.weight_kg, "quantity": p.quantity, "price": mad(p.price_cents),
        "payment": p.payment, "insurance": p.insurance,
        "status": SENDER_STATUS_OUT[p.status], "escrow": p.escrow,
        "content": p.content, "type": p.type,
        "length": p.length_cm or "", "width": p.width_cm or "", "height": p.height_cm or "",
        "notes": p.notes, "recipient": p.recipient, "recipientPhone": p.recipient_phone,
        "pickup": p.pickup, "dropoff": p.dropoff,
        "code": p.handoff_code,  # only ever sent to the sender
        "travelerPhone": t.traveler.phone if p.status in ("accepted", "picked_up") else "",
        "createdAt": iso(p.created_at), "acceptedAt": iso(p.accepted_at), "deliveredAt": iso(p.delivered_at),
        "dispute": dispute_of(db, p.id),
    }


def parcel_for_traveler(db: Session, p: Parcel, ratings: dict | None = None) -> dict:
    contact_ok = p.status in ("accepted", "picked_up")
    rating, _ = (ratings or {}).get(p.sender_id) or rating_of(db, p.sender_id)
    return {
        "id": p.id, "tripId": p.trip_id, "sender": p.sender.name, "senderId": p.sender_id,
        "senderRating": rating or 0,
        "senderPhone": p.sender.phone if contact_ok else "",
        "recipient": p.recipient, "recipientPhone": p.recipient_phone if contact_ok else "",
        "type": p.type, "length": p.length_cm or "", "width": p.width_cm or "", "height": p.height_cm or "",
        "weight": p.weight_kg, "quantity": p.quantity, "content": p.content,
        "value": mad(p.declared_value_cents), "notes": p.notes, "insurance": p.insurance,
        "pickup": p.pickup, "dropoff": p.dropoff,
        "price": mad(transport_cents(p)), "net": mad(net_for_traveler(p)),
        "status": TRAVELER_STATUS_OUT[p.status],
        "receivedAt": iso(p.created_at), "acceptedAt": iso(p.accepted_at),
        "deliveredAt": p.delivered_at.date().isoformat() if p.delivered_at else None,
        "dispute": dispute_of(db, p.id),
    }


LEDGER_KEY = {
    "topup": "topup", "payment": "reservation", "refund": "refund", "earning": "earning",
    "payout": "payout", "payout_reversal": "refund", "adjustment": "adjustment",
}


def ledger_out(e: LedgerEntry) -> dict:
    key = LEDGER_KEY.get(e.kind, e.kind)
    if e.kind == "topup" and any(n in e.ref for n in CASH_NETWORKS):
        key = "topupCash"
    return {"id": e.id, "key": key, "kind": e.kind, "amount": mad(e.amount_cents), "ref": e.ref,
            "date": e.created_at.date().isoformat(), "at": iso(e.created_at)}


def cash_out(c: CashTopup) -> dict:
    return {
        "id": c.id, "network": c.network, "amount": mad(c.amount_cents), "ref": c.reference,
        "status": c.status, "created": ms(c.created_at), "expires": ms(c.expires_at),
    }


def ms(d: datetime | None) -> int | None:
    """Naive-UTC datetime → JavaScript milliseconds."""
    return int(d.replace(tzinfo=timezone.utc).timestamp() * 1000) if d else None


def user_out(db: Session, u: User) -> dict:
    rating, reviews = rating_of(db, u.id)
    return {
        "id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "phoneVerified": u.phone_verified,
        "role": u.role, "isAdmin": u.is_admin, "rating": rating, "reviews": reviews,
        "createdAt": iso(u.created_at),
    }
