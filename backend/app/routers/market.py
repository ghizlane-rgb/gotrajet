"""Trips (travellers) and parcels (senders), with escrow:
sender pays → money held → traveller enters the recipient's code → money released minus commission."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import Dispute, Parcel, Review, RouteAlert, TravelerCancellation, Trip, User, now
from ..security import current_user, limiter
from ..services import (
    ACTIVE, CITIES, balance_cents, cancellation_out, cancels_this_month, cents, ensure_subscription,
    is_verified_traveler, ledger, mad, normalize_phone, notify, parcel_for_sender, parcel_for_traveler, plan_out,
    refund_escrow, release_escrow, transport_cents, trip_load, trip_out, trip_serves,
)

router = APIRouter(prefix="/api", tags=["market"])


def morocco_today() -> str:
    # Morocco uses UTC+1 most of the year (UTC+0 during Ramadan); close enough for "is this trip in the past".
    return (datetime.now(timezone.utc) + timedelta(hours=1)).date().isoformat()


def _trip(db: Session, trip_id: str) -> Trip:
    t = db.get(Trip, trip_id)
    if not t:
        raise HTTPException(404, "trip_not_found")
    return t


def _parcel(db: Session, parcel_id: str) -> Parcel:
    p = db.get(Parcel, parcel_id)
    if not p:
        raise HTTPException(404, "parcel_not_found")
    return p


def _route(t: Trip) -> str:
    return f"{t.from_city} → {t.to_city}"


# ---------- Trips ----------

class TripIn(BaseModel):
    from_: str = Field(alias="from")
    to: str
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    price: float = Field(gt=0, le=5000)
    seats: int = Field(ge=1, le=20)
    weight: float = Field(gt=0, le=500)
    vehicle: str = Field(default="car", max_length=30)
    vehicleModel: str = Field(default="", max_length=80)
    pickup: str = Field(default="", max_length=200)
    dropoff: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=1000)


@router.get("/trips")
def search_trips(
    from_: str | None = Query(default=None, alias="from"), to: str | None = None, date: str | None = None,
    db: Session = Depends(get_db),
):
    q = select(Trip).where(Trip.status == "upcoming", Trip.date >= morocco_today())
    both = bool(from_ and to)
    # With both cities, longer trips that pass through them are matched too ("along the way"),
    # so the city filter is applied in Python on the road network instead of in SQL.
    if from_ and not both:
        q = q.where(Trip.from_city == from_)
    if to and not both:
        q = q.where(Trip.to_city == to)
    if date:
        q = q.where(Trip.date == date)
    trips = db.scalars(q.order_by(Trip.date, Trip.time).limit(500)).all()
    out = []
    for t in trips:
        match = trip_serves(t.from_city, t.to_city, from_, to) if both else "direct"
        if not match:
            continue
        o = trip_out(db, t)
        if o["freeSeats"] > 0:
            out.append({**o, "match": match})
        if len(out) >= 200:
            break
    return {"trips": out}


@router.get("/trips/{trip_id}")
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    return {"trip": trip_out(db, _trip(db, trip_id))}


@router.post("/trips")
def publish_trip(data: TripIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.from_ not in CITIES or data.to not in CITIES or data.from_ == data.to:
        raise HTTPException(422, "invalid_cities")
    if data.date < morocco_today():
        raise HTTPException(422, "date_in_past")
    if settings.require_verified_traveler and not is_verified_traveler(db, user):
        raise HTTPException(403, "traveler_not_verified")
    limiter.check("trip:" + user.id, 20, 86400)
    ensure_subscription(db, user)  # monthly traveller fee, taken once per month from the balance
    t = Trip(
        traveler_id=user.id, from_city=data.from_, to_city=data.to, date=data.date, time=data.time,
        price_cents=cents(data.price), seats=data.seats, max_weight_kg=data.weight, vehicle=data.vehicle,
        vehicle_model=data.vehicleModel.strip(), pickup=data.pickup.strip(), dropoff=data.dropoff.strip(),
        notes=data.notes.strip(),
    )
    db.add(t)
    db.flush()
    # Senders waiting for this route (or a section of it) are told right away.
    for a in db.scalars(select(RouteAlert).where(RouteAlert.user_id != user.id)):
        if trip_serves(t.from_city, t.to_city, a.from_city, a.to_city):
            notify(db, db.get(User, a.user_id), "routeAlert",
                   f"{a.from_city} → {a.to_city} · {t.date} {t.time} · {user.name}", f"detail/{t.id}")
    db.commit()
    return {"trip": trip_out(db, t)}


# ---------- Route alerts ----------

MAX_ALERTS = 10


class AlertIn(BaseModel):
    from_: str = Field(alias="from")
    to: str


def _alert_out(a: RouteAlert) -> dict:
    return {"id": a.id, "from": a.from_city, "to": a.to_city}


@router.get("/me/alerts")
def my_alerts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    alerts = db.scalars(select(RouteAlert).where(RouteAlert.user_id == user.id).order_by(RouteAlert.created_at)).all()
    return {"alerts": [_alert_out(a) for a in alerts]}


@router.post("/me/alerts")
def add_alert(data: AlertIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.from_ not in CITIES or data.to not in CITIES or data.from_ == data.to:
        raise HTTPException(422, "invalid_cities")
    existing = db.scalar(select(RouteAlert).where(
        RouteAlert.user_id == user.id, RouteAlert.from_city == data.from_, RouteAlert.to_city == data.to))
    if existing:
        return {"alert": _alert_out(existing)}
    if len(db.scalars(select(RouteAlert.id).where(RouteAlert.user_id == user.id)).all()) >= MAX_ALERTS:
        raise HTTPException(409, "too_many_alerts")
    a = RouteAlert(user_id=user.id, from_city=data.from_, to_city=data.to)
    db.add(a)
    db.commit()
    return {"alert": _alert_out(a)}


@router.delete("/me/alerts/{alert_id}")
def delete_alert(alert_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(RouteAlert, alert_id)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "alert_not_found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.get("/me/trips")
def my_trips(user: User = Depends(current_user), db: Session = Depends(get_db)):
    trips = db.scalars(select(Trip).where(Trip.traveler_id == user.id).order_by(Trip.date.desc())).all()
    return {"trips": [trip_out(db, t) for t in trips]}


def _own_trip(db: Session, trip_id: str, user: User) -> Trip:
    t = _trip(db, trip_id)
    if t.traveler_id != user.id:
        raise HTTPException(403, "not_your_trip")
    return t


@router.post("/trips/{trip_id}/start")
def start_trip(trip_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _own_trip(db, trip_id, user)
    if t.status != "upcoming":
        raise HTTPException(409, "trip_not_upcoming")
    t.status = "in_progress"
    # Requests nobody answered before departure are declined and refunded.
    for p in db.scalars(select(Parcel).where(Parcel.trip_id == t.id, Parcel.status == "awaiting")):
        p.status = "declined"
        refund_escrow(db, p, f"{p.id} · départ sans réponse")
        notify(db, p.sender, "requestDeclined", f"{_route(t)} · #{p.id}", f"parcel/{p.id}", sms=True)
    db.commit()
    return {"trip": trip_out(db, t)}


@router.post("/trips/{trip_id}/complete")
def complete_trip(trip_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _own_trip(db, trip_id, user)
    if t.status != "in_progress":
        raise HTTPException(409, "trip_not_in_progress")
    if db.scalar(select(Parcel.id).where(Parcel.trip_id == t.id, Parcel.status.in_(("accepted", "picked_up")))):
        raise HTTPException(409, "parcels_not_delivered")
    t.status = "completed"
    db.commit()
    return {"trip": trip_out(db, t)}


@router.delete("/trips/{trip_id}")
def cancel_trip(trip_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _own_trip(db, trip_id, user)
    if t.status != "upcoming":
        raise HTTPException(409, "trip_not_upcoming")
    if db.scalar(select(Parcel.id).where(Parcel.trip_id == t.id, Parcel.status.in_(("accepted", "picked_up")))):
        raise HTTPException(409, "trip_has_bookings")
    for p in db.scalars(select(Parcel).where(Parcel.trip_id == t.id, Parcel.status == "awaiting")):
        p.status = "declined"
        refund_escrow(db, p, f"{p.id} · trajet annulé")
        notify(db, p.sender, "requestDeclined", f"{_route(t)} · #{p.id}", f"parcel/{p.id}", sms=True)
    t.status = "cancelled"
    db.commit()
    return {"ok": True}


# ---------- Parcels ----------

class ParcelIn(BaseModel):
    tripId: str
    quantity: int = Field(default=1, ge=1, le=20)
    weight: float = Field(gt=0, le=500)
    insurance: bool = False
    payment: str = Field(default="wallet", pattern="^(wallet|card)$")
    type: str = Field(default="small", pattern="^(documents|small|medium|large)$")
    content: str = Field(default="", max_length=200)
    value: float = Field(default=0, ge=0, le=100000)
    length: float | None = Field(default=None, ge=0, le=500)
    width: float | None = Field(default=None, ge=0, le=500)
    height: float | None = Field(default=None, ge=0, le=500)
    recipient: str = Field(min_length=2, max_length=80)
    recipientPhone: str = Field(min_length=8, max_length=30)
    pickup: str = Field(default="", max_length=200)
    dropoff: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=1000)
    acceptRules: bool = False  # sender confirms the parcel contains no prohibited item


@router.post("/parcels")
def book_parcel(data: ParcelIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not data.acceptRules:
        raise HTTPException(422, "prohibited_items_not_confirmed")
    t = _trip(db, data.tripId)
    if t.status != "upcoming" or t.date < morocco_today():
        raise HTTPException(409, "trip_not_bookable")
    if t.traveler_id == user.id:
        raise HTTPException(409, "own_trip")
    used, _ = trip_load(db, t)
    if data.quantity > t.seats - used:
        raise HTTPException(409, "not_enough_capacity")
    if data.weight > t.max_weight_kg:  # max weight per parcel, as shown on the trip
        raise HTTPException(409, "too_heavy")
    limiter.check("book:" + user.id, 30, 3600)
    price = t.price_cents * data.quantity + (settings.insurance_fee_cents * data.quantity if data.insurance else 0)
    if data.payment == "card":
        if not settings.sandbox:
            raise HTTPException(501, "card_provider_not_configured")
        ledger(db, user.id, "topup", price, None, "Carte bancaire (sandbox)")
    elif balance_cents(db, user.id) < price:
        raise HTTPException(402, "insufficient_balance")
    p = Parcel(
        trip_id=t.id, sender_id=user.id, type=data.type, content=data.content.strip(),
        declared_value_cents=cents(data.value), weight_kg=data.weight, length_cm=data.length,
        width_cm=data.width, height_cm=data.height, quantity=data.quantity, recipient=data.recipient.strip(),
        recipient_phone=normalize_phone(data.recipientPhone), pickup=data.pickup.strip(),
        dropoff=data.dropoff.strip(), notes=data.notes.strip(), insurance=data.insurance,
        payment=data.payment, price_cents=price, handoff_code=f"{secrets.randbelow(9000) + 1000}",
    )
    db.add(p)
    db.flush()
    ledger(db, user.id, "payment", -price, p.id, _route(t))
    notify(db, user, "requestSent", _route(t), f"parcel/{p.id}")
    notify(db, t.traveler, "newRequest", f"{user.name} · {_route(t)}", f"request/{p.id}", sms=True)
    db.commit()
    return {"parcel": parcel_for_sender(db, p)}


@router.get("/me/parcels")
def my_parcels(user: User = Depends(current_user), db: Session = Depends(get_db)):
    ps = db.scalars(select(Parcel).where(Parcel.sender_id == user.id).order_by(Parcel.created_at.desc())).all()
    return {"parcels": [parcel_for_sender(db, p) for p in ps]}


@router.get("/me/incoming")
def incoming(user: User = Depends(current_user), db: Session = Depends(get_db)):
    ps = db.scalars(
        select(Parcel).join(Trip).where(Trip.traveler_id == user.id).order_by(Parcel.created_at.desc())
    ).all()
    return {"requests": [parcel_for_traveler(db, p) for p in ps]}


def _as_traveler(db: Session, parcel_id: str, user: User) -> Parcel:
    p = _parcel(db, parcel_id)
    if p.trip.traveler_id != user.id:
        raise HTTPException(403, "not_your_trip")
    return p


@router.post("/parcels/{parcel_id}/accept")
def accept(parcel_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _as_traveler(db, parcel_id, user)
    if p.status != "awaiting":
        raise HTTPException(409, "not_awaiting")
    if p.trip.status != "upcoming":
        raise HTTPException(409, "trip_not_upcoming")
    ensure_subscription(db, user)
    p.status, p.accepted_at = "accepted", now()
    notify(db, p.sender, "requestAccepted", f"{user.name} · {_route(p.trip)}", f"parcel/{p.id}", sms=True)
    db.commit()
    return {"request": parcel_for_traveler(db, p)}


@router.post("/parcels/{parcel_id}/decline")
def decline(parcel_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Saying no to a new request is free. Cancelling a parcel the traveller had accepted costs them
    a fee (2% of the transport price by default), at most 30 times a month; the sender is refunded in full."""
    p = _as_traveler(db, parcel_id, user)
    if p.status not in ("awaiting", "accepted"):
        raise HTTPException(409, "cannot_decline")
    fee = 0
    if p.status == "accepted":
        if cancels_this_month(db, user.id) >= settings.max_cancels_per_month:
            raise HTTPException(409, "cancel_limit_reached")
        fee = int(round(transport_cents(p) * settings.cancel_fee_rate))
        db.add(TravelerCancellation(parcel_id=p.id, traveler_id=user.id, fee_cents=fee))
        if fee:
            ledger(db, user.id, "cancel_fee", -fee, p.id, f"Annulation #{p.id}")
            ledger(db, None, "commission", fee, p.id, f"Frais d'annulation #{p.id}")
    p.status = "declined"
    refund_escrow(db, p, f"{p.id} · refusé")
    notify(db, p.sender, "requestDeclined", f"{_route(p.trip)} · #{p.id}", f"parcel/{p.id}", sms=True)
    db.commit()
    return {"request": parcel_for_traveler(db, p), "cancelFee": mad(fee)}


# ---------- Traveller plan, cancellations and fee claims ----------

@router.get("/me/plan")
def my_plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"plan": plan_out(db, user)}


@router.post("/me/subscription/pay")
def pay_subscription(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Lets the traveller settle the month in advance (otherwise it is taken at the first publish/accept)."""
    ensure_subscription(db, user)
    db.commit()
    return {"plan": plan_out(db, user)}


@router.get("/me/cancellations")
def my_cancellations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    cs = db.scalars(select(TravelerCancellation).where(TravelerCancellation.traveler_id == user.id)
                    .order_by(TravelerCancellation.created_at.desc()).limit(100)).all()
    return {"cancellations": [cancellation_out(c) for c in cs]}


class ClaimIn(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


@router.post("/me/cancellations/{cancel_id}/claim")
def claim_cancel_fee(cancel_id: str, data: ClaimIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(TravelerCancellation, cancel_id)
    if not c or c.traveler_id != user.id:
        raise HTTPException(404, "cancellation_not_found")
    if c.claim_status != "none" or c.fee_cents <= 0:
        raise HTTPException(409, "claim_not_possible")
    c.claim_status, c.claim_reason = "pending", data.reason.strip()
    db.commit()
    return {"cancellation": cancellation_out(c)}


@router.post("/parcels/{parcel_id}/pickup")
def pickup(parcel_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _as_traveler(db, parcel_id, user)
    if p.status != "accepted":
        raise HTTPException(409, "not_accepted")
    p.status, p.picked_at = "picked_up", now()
    notify(db, p.sender, "onRoad", f"{_route(p.trip)} · #{p.id}", f"tracking/{p.id}", sms=True)
    # The recipient gets the handoff code by SMS so they can give it to the traveller on delivery.
    from .. import messaging
    messaging.send_sms(
        p.recipient_phone,
        f"GOTRAJET : un colis de {p.sender.name} est en route ({_route(p.trip)}). "
        f"Donnez le code {p.handoff_code} au voyageur {user.name} à la remise.",
        "gotrajet_recipient", [p.sender.name, _route(p.trip), p.handoff_code, user.name],
    )
    db.commit()
    return {"request": parcel_for_traveler(db, p)}


class CodeIn(BaseModel):
    code: str = Field(pattern=r"^\d{4}$")


@router.post("/parcels/{parcel_id}/deliver")
def deliver(parcel_id: str, data: CodeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _as_traveler(db, parcel_id, user)
    if p.status != "picked_up":
        raise HTTPException(409, "not_picked_up")
    if p.code_attempts >= 5:
        raise HTTPException(429, "too_many_attempts")
    if not secrets.compare_digest(data.code, p.handoff_code):
        p.code_attempts += 1
        db.commit()
        raise HTTPException(400, "wrong_code")
    p.status, p.delivered_at = "delivered", now()
    if p.escrow == "held":
        release_escrow(db, p)
    notify(db, p.sender, "delivered", f"#{p.id}", f"parcel/{p.id}", sms=True)
    db.commit()
    return {"request": parcel_for_traveler(db, p)}


@router.post("/parcels/{parcel_id}/cancel")
def cancel(parcel_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _parcel(db, parcel_id)
    if p.sender_id != user.id:
        raise HTTPException(403, "not_your_parcel")
    if p.status not in ("awaiting", "accepted"):
        raise HTTPException(409, "cannot_cancel")
    p.status = "cancelled"
    refund_escrow(db, p, p.id)
    notify(db, user, "cancelled", p.id, f"parcel/{p.id}")
    notify(db, p.trip.traveler, "cancelled", f"{user.name} · #{p.id}", f"request/{p.id}")
    db.commit()
    return {"parcel": parcel_for_sender(db, p)}


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


@router.post("/parcels/{parcel_id}/review")
def review(parcel_id: str, data: ReviewIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _parcel(db, parcel_id)
    if p.status != "delivered":
        raise HTTPException(409, "not_delivered")
    if user.id == p.sender_id:
        target = p.trip.traveler_id
    elif user.id == p.trip.traveler_id:
        target = p.sender_id
    else:
        raise HTTPException(403, "not_your_parcel")
    r = db.scalar(select(Review).where(Review.parcel_id == p.id, Review.author_id == user.id))
    if r:
        r.rating, r.comment = data.rating, data.comment.strip()
    else:
        db.add(Review(parcel_id=p.id, author_id=user.id, target_id=target, rating=data.rating, comment=data.comment.strip()))
    db.commit()
    return {"ok": True}


@router.get("/me/reviews")
def my_reviews(user: User = Depends(current_user), db: Session = Depends(get_db)):
    def out(r: Review, other_id: str):
        other = db.get(User, other_id)
        p = db.get(Parcel, r.parcel_id)
        return {"id": r.id, "parcelId": r.parcel_id, "name": other.name if other else "", "rating": r.rating,
                "comment": r.comment, "date": r.created_at.date().isoformat(),
                "route": _route(p.trip) if p else ""}
    given = db.scalars(select(Review).where(Review.author_id == user.id).order_by(Review.created_at.desc())).all()
    received = db.scalars(select(Review).where(Review.target_id == user.id).order_by(Review.created_at.desc())).all()
    return {"given": [out(r, r.target_id) for r in given], "received": [out(r, r.author_id) for r in received]}


class DisputeIn(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


@router.post("/parcels/{parcel_id}/dispute")
def open_dispute(parcel_id: str, data: DisputeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _parcel(db, parcel_id)
    if user.id not in (p.sender_id, p.trip.traveler_id):
        raise HTTPException(403, "not_your_parcel")
    if p.status in ("declined", "cancelled"):
        raise HTTPException(409, "parcel_closed")
    if db.scalar(select(Dispute.id).where(Dispute.parcel_id == p.id, Dispute.status == "open")):
        raise HTTPException(409, "dispute_already_open")
    d = Dispute(parcel_id=p.id, opened_by=user.id, reason=data.reason.strip(), escrow_before=p.escrow)
    if p.escrow == "held":
        p.escrow = "frozen"  # no automatic release until support decides
    db.add(d)
    db.commit()
    return {"dispute": {"id": d.id, "status": d.status}}
