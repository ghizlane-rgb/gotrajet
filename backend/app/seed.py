"""Start-up data: the first admin (always) and, in dev only, test accounts with trips."""
import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import LedgerEntry, Trip, User, VerificationDoc
from .security import hash_password

log = logging.getLogger("gotrajet.seed")
TEST_PASSWORD = "test1234"


def ensure_admin(db: Session) -> None:
    if db.scalar(select(User.id).where(User.is_admin.is_(True))):
        return
    if not settings.admin_password:
        log.warning("No admin account: set ADMIN_EMAIL and ADMIN_PASSWORD")
        return
    db.add(User(id="UADMIN", name="Support GOTRAJET", email=settings.admin_email.lower(), phone="+212600000999",
                phone_verified=True, password_hash=hash_password(settings.admin_password), is_admin=True))
    db.commit()


def _verified(db: Session, user_id: str) -> None:
    for kind in ("id", "photo"):
        db.add(VerificationDoc(user_id=user_id, kind=kind, stored_name="seed-no-file", status="approved",
                               original_name="test seed", content_type="image/jpeg"))


def seed_test_data(db: Session) -> None:
    """Dev only, and only into an empty database."""
    if settings.is_prod or db.scalar(select(User.id).where(User.is_admin.is_(False))):
        return
    people = [
        ("UTSENDER", "Test Sender", "sender.test@example.com", "+212600000910", False),
        ("UTTRAVEL", "Test Traveler", "traveler.test@example.com", "+212600000911", True),
        ("UYOUSSEF", "Youssef B.", "youssef@example.com", "+212600000107", True),
        ("USALMA", "Salma E.", "salma@example.com", "+212600000105", True),
    ]
    for uid, name, email, phone, traveler in people:
        db.add(User(id=uid, name=name, email=email, phone=phone, phone_verified=True,
                    password_hash=hash_password(TEST_PASSWORD)))
        db.flush()
        if traveler:
            _verified(db, uid)
    db.add(LedgerEntry(user_id="UTSENDER", kind="topup", amount_cents=500_00, ref="Solde de test"))
    d = lambda n: (date.today() + timedelta(days=n)).isoformat()  # noqa: E731
    trips = [
        ("UTTRAVEL", "Casablanca", "Rabat", 1, "09:00", 50, 3, 15, "Dacia Sandero · blanc"),
        ("UTTRAVEL", "Rabat", "Tanger", 3, "07:30", 90, 2, 10, "Dacia Sandero · blanc"),
        ("UYOUSSEF", "Casablanca", "Rabat", 1, "10:30", 50, 3, 10, "Toyota Auris"),
        ("UYOUSSEF", "Casablanca", "Marrakech", 2, "08:00", 120, 3, 10, "Toyota Auris"),
        ("USALMA", "Marrakech", "Agadir", 1, "08:00", 80, 2, 5, "Renault Clio"),
        ("USALMA", "Casablanca", "Marrakech", 2, "09:30", 135, 2, 10, "Renault Clio"),
    ]
    for uid, f, t, days, time, price, seats, kg, model in trips:
        db.add(Trip(traveler_id=uid, from_city=f, to_city=t, date=d(days), time=time, price_cents=price * 100,
                    seats=seats, max_weight_kg=kg, vehicle="car", vehicle_model=model))
    db.commit()
    log.warning("Dev test accounts created (password %s): sender.test@example.com, traveler.test@example.com", TEST_PASSWORD)
