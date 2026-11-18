"""Database tables. Money is stored in centimes (integers) to avoid rounding errors."""
import secrets
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    """Naive UTC timestamp (stored the same way on SQLite and PostgreSQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id(prefix: str, n: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return prefix + "".join(secrets.choice(alphabet) for _ in range(n))


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("U"))
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(30), default="")
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="individual")  # individual | carrier
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | suspended
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # bump to log out everywhere
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class PhoneCode(Base):
    __tablename__ = "phone_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    phone: Mapped[str] = mapped_column(String(30))
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class TwoFactor(Base):
    """Authenticator-app (TOTP) secret. Separate table so existing databases need no migration."""
    __tablename__ = "two_factor"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    secret: Mapped[str] = mapped_column(String(64))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_step: Mapped[int] = mapped_column(Integer, default=0)  # blocks reuse of the same code
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class VerificationDoc(Base):
    __tablename__ = "verification_docs"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("D"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # id | photo | license | vehicle
    stored_name: Mapped[str] = mapped_column(String(80))
    original_name: Mapped[str] = mapped_column(String(255), default="")
    content_type: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Trip(Base):
    __tablename__ = "trips"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("TR", 6))
    traveler_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    from_city: Mapped[str] = mapped_column(String(60), index=True)
    to_city: Mapped[str] = mapped_column(String(60), index=True)
    date: Mapped[str] = mapped_column(String(10), index=True)  # YYYY-MM-DD (Morocco local date)
    time: Mapped[str] = mapped_column(String(5))  # HH:MM
    price_cents: Mapped[int] = mapped_column(Integer)
    seats: Mapped[int] = mapped_column(Integer)
    max_weight_kg: Mapped[float] = mapped_column(Float)
    vehicle: Mapped[str] = mapped_column(String(30), default="car")
    vehicle_model: Mapped[str] = mapped_column(String(80), default="")
    pickup: Mapped[str] = mapped_column(String(200), default="")
    dropoff: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="upcoming")  # upcoming | in_progress | completed | cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    traveler: Mapped[User] = relationship(lazy="joined")


class Parcel(Base):
    __tablename__ = "parcels"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("GJ", 6))
    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(20), default="small")  # documents | small | medium | large
    content: Mapped[str] = mapped_column(String(200), default="")
    declared_value_cents: Mapped[int] = mapped_column(Integer, default=0)
    weight_kg: Mapped[float] = mapped_column(Float)
    length_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    width_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    recipient: Mapped[str] = mapped_column(String(80), default="")
    recipient_phone: Mapped[str] = mapped_column(String(30), default="")
    pickup: Mapped[str] = mapped_column(String(200), default="")
    dropoff: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    insurance: Mapped[bool] = mapped_column(Boolean, default=False)
    payment: Mapped[str] = mapped_column(String(20), default="wallet")  # wallet | card
    price_cents: Mapped[int] = mapped_column(Integer)
    handoff_code: Mapped[str] = mapped_column(String(6))  # shown to the sender only
    code_attempts: Mapped[int] = mapped_column(Integer, default=0)
    # awaiting | accepted | picked_up | delivered | declined | cancelled
    status: Mapped[str] = mapped_column(String(20), default="awaiting", index=True)
    escrow: Mapped[str] = mapped_column(String(20), default="held")  # held | released | refunded | frozen
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    picked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    trip: Mapped[Trip] = relationship(lazy="joined")
    sender: Mapped[User] = relationship(lazy="joined")


class LedgerEntry(Base):
    """Every money movement. A user's balance is the sum of their entries.
    user_id NULL = the platform's own account (commission)."""
    __tablename__ = "ledger"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    # topup | payment | refund | earning | commission | payout | payout_reversal | adjustment
    kind: Mapped[str] = mapped_column(String(20))
    amount_cents: Mapped[int] = mapped_column(Integer)
    parcel_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ref: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class CashTopup(Base):
    __tablename__ = "cash_topups"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("CT"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    network: Mapped[str] = mapped_column(String(30))
    reference: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | paid | expired | cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    agency_txn_id: Mapped[str] = mapped_column(String(80), default="")


class Payout(Base):
    __tablename__ = "payouts"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("PO"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(20), default="bank")  # bank | cash
    details: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(20), default="requested")  # requested | paid | rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    user: Mapped[User] = relationship(lazy="joined")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    receiver_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    parcel_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(40))
    body: Mapped[str] = mapped_column(String(300), default="")
    target: Mapped[str] = mapped_column(String(100), default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("parcel_id", "author_id"),)
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("RV"))
    parcel_id: Mapped[str] = mapped_column(ForeignKey("parcels.id"))
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Dispute(Base):
    __tablename__ = "disputes"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("DS"))
    parcel_id: Mapped[str] = mapped_column(ForeignKey("parcels.id"), index=True)
    opened_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | resolved
    resolution: Mapped[str] = mapped_column(String(30), default="")  # refund_sender | release_traveler
    admin_note: Mapped[str] = mapped_column(Text, default="")
    escrow_before: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    parcel: Mapped[Parcel] = relationship(lazy="joined")


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("SP"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    topic: Mapped[str] = mapped_column(String(60), default="")
    subject: Mapped[str] = mapped_column(String(200), default="")
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | closed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_id: Mapped[str] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str] = mapped_column(String(60))
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class TravelerCancellation(Base):
    """A traveller cancelled a parcel they had accepted: the sender is refunded in full and the traveller
    pays a fee. The traveller may file a claim; support refunds the fee or rejects the claim.
    New table, so existing databases need no migration."""
    __tablename__ = "traveler_cancellations"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("X"))
    parcel_id: Mapped[str] = mapped_column(ForeignKey("parcels.id", ondelete="CASCADE"), index=True)
    traveler_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    claim_status: Mapped[str] = mapped_column(String(20), default="none")  # none | pending | refunded | rejected
    claim_reason: Mapped[str] = mapped_column(Text, default="")
    claim_answer: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RouteAlert(Base):
    """"Tell me when someone travels Fès → Tanger": a sender is notified when a matching trip is published
    (direct, or a longer trip that passes through both cities). New table, so existing databases need no migration."""
    __tablename__ = "route_alerts"
    __table_args__ = (UniqueConstraint("user_id", "from_city", "to_city"),)
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default=lambda: new_id("A"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    from_city: Mapped[str] = mapped_column(String(40))
    to_city: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
