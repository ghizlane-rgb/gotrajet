"""Profile, verification documents, chat, notifications, support, and one bootstrap call for the website."""
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import (
    Message, Notification, Parcel, SupportTicket, Trip, User, VerificationDoc, now,
)
from ..security import current_user, limiter
from ..services import DOC_KINDS, iso, normalize_phone, user_out, verification_state, is_verified_traveler
from . import market, wallet

router = APIRouter(prefix="/api", tags=["account"])

MAX_UPLOAD = 5 * 1024 * 1024
MAGIC = {
    b"\xff\xd8\xff": ("image/jpeg", ".jpg"),
    b"\x89PNG": ("image/png", ".png"),
    b"%PDF": ("application/pdf", ".pdf"),
    b"RIFF": ("image/webp", ".webp"),
}


# ---------- Profile ----------

class ProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    phone: str | None = Field(default=None, max_length=30)
    role: str | None = Field(default=None, pattern="^(individual|carrier)$")


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"user": user_out(db, user)}


@router.patch("/me")
def update_me(data: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.name:
        user.name = data.name.strip()
    if data.role:
        user.role = data.role
    if data.phone:
        phone = normalize_phone(data.phone)
        if phone != user.phone:
            user.phone, user.phone_verified = phone, False  # new number must be verified again
    db.commit()
    return {"user": user_out(db, user)}


# ---------- Identity documents ----------

@router.post("/verification/docs")
async def upload_doc(
    kind: str = Form(...), file: UploadFile = File(...),
    user: User = Depends(current_user), db: Session = Depends(get_db),
):
    if kind not in DOC_KINDS:
        raise HTTPException(422, "unknown_document")
    limiter.check("upload:" + user.id, 20, 86400)
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "file_too_large")
    kind_info = next((v for k, v in MAGIC.items() if data.startswith(k)), None)
    if not kind_info or (kind_info[0] == "image/webp" and data[8:12] != b"WEBP"):
        raise HTTPException(415, "unsupported_file")
    stored = secrets.token_hex(16) + kind_info[1]
    (settings.upload_dir / stored).write_bytes(data)
    doc = VerificationDoc(user_id=user.id, kind=kind, stored_name=stored,
                          original_name=(file.filename or "")[:255], content_type=kind_info[0])
    db.add(doc)
    db.commit()
    return {"verification": verification_state(db, user)}


# ---------- Chat ----------

def support_user(db: Session) -> User | None:
    return db.scalar(select(User).where(User.is_admin.is_(True)).order_by(User.created_at))


def _contacts(db: Session, user: User) -> dict[str, tuple[User, str]]:
    """People this user may talk to: counterparts on shared parcels, plus support."""
    out: dict[str, tuple[User, str]] = {}
    as_sender = db.scalars(select(Parcel).where(Parcel.sender_id == user.id)).all()
    for p in as_sender:
        out[p.trip.traveler_id] = (p.trip.traveler, "travelers")
    as_traveler = db.scalars(select(Parcel).join(Trip).where(Trip.traveler_id == user.id)).all()
    for p in as_traveler:
        out.setdefault(p.sender_id, (p.sender, "senders"))
    sup = support_user(db)
    if sup and sup.id != user.id:
        out[sup.id] = (sup, "support")
    if user.is_admin:  # support sees everyone who wrote to it
        for m in db.scalars(select(Message).where(Message.receiver_id == user.id)):
            u = db.get(User, m.sender_id)
            if u:
                out.setdefault(u.id, (u, "senders"))
    return out


def _msg_out(m: Message, me_id: str) -> dict:
    return {"id": m.id, "text": m.body, "at": iso(m.created_at), "mine": m.sender_id == me_id, "read": bool(m.read_at)}


@router.get("/me/conversations")
def conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    result = []
    for uid, (other, kind) in _contacts(db, user).items():
        pair = or_(and_(Message.sender_id == user.id, Message.receiver_id == uid),
                   and_(Message.sender_id == uid, Message.receiver_id == user.id))
        msgs = db.scalars(select(Message).where(pair).order_by(Message.id)).all()
        result.append({
            "userId": uid, "name": "Support GOTRAJET" if kind == "support" else other.name, "type": kind,
            "messages": [_msg_out(m, user.id) for m in msgs[-100:]],
            "unread": sum(1 for m in msgs if m.receiver_id == user.id and not m.read_at),
        })
    result.sort(key=lambda c: c["messages"][-1]["at"] if c["messages"] else "", reverse=True)
    return {"conversations": result}


class MessageIn(BaseModel):
    to: str
    body: str = Field(min_length=1, max_length=1000)


@router.post("/messages")
def send_message(data: MessageIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    limiter.check("msg:" + user.id, 60, 600)
    contacts = _contacts(db, user)
    if data.to not in contacts:
        raise HTTPException(403, "not_a_contact")
    m = Message(sender_id=user.id, receiver_id=data.to, body=data.body.strip())
    db.add(m)
    other = contacts[data.to][0]
    db.add(Notification(user_id=other.id, key="newMessage", body=user.name, target="messages"))
    db.commit()
    return {"message": _msg_out(m, user.id)}


@router.post("/messages/{other_id}/read")
def read_messages(other_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for m in db.scalars(select(Message).where(Message.sender_id == other_id, Message.receiver_id == user.id, Message.read_at.is_(None))):
        m.read_at = now()
    db.commit()
    return {"ok": True}


# ---------- Notifications ----------

def _notifications(db: Session, user: User) -> list[dict]:
    ns = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).limit(100)).all()
    return [{"id": str(n.id), "key": n.key, "body": n.body, "target": n.target, "read": n.read, "at": iso(n.created_at)} for n in ns]


class ReadIn(BaseModel):
    id: str | None = None  # None = all


@router.post("/notifications/read")
def read_notifications(data: ReadIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
    if data.id:
        q = q.where(Notification.id == int(data.id))
    for n in db.scalars(q):
        n.read = True
    db.commit()
    return {"ok": True}


# ---------- Support ----------

class TicketIn(BaseModel):
    topic: str = Field(default="", max_length=60)
    subject: str = Field(default="", max_length=200)
    message: str = Field(min_length=5, max_length=4000)


@router.post("/support")
def create_ticket(data: TicketIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    limiter.check("ticket:" + user.id, 10, 86400)
    t = SupportTicket(user_id=user.id, topic=data.topic, subject=data.subject.strip(), message=data.message.strip())
    db.add(t)
    db.commit()
    return {"ticket": {"id": t.id, "status": t.status}}


def _tickets(db: Session, user: User) -> list[dict]:
    ts = db.scalars(select(SupportTicket).where(SupportTicket.user_id == user.id).order_by(SupportTicket.created_at.desc())).all()
    return [{"id": t.id, "type": t.topic, "subject": t.subject, "message": t.message, "status": t.status,
             "date": t.created_at.date().isoformat()} for t in ts]


# ---------- Bootstrap: everything the website needs after sign-in, in one call ----------

@router.get("/me/bootstrap")
def bootstrap(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {
        "user": user_out(db, user),
        "verification": verification_state(db, user),
        "verifiedTraveler": is_verified_traveler(db, user),
        "requireVerifiedTraveler": settings.require_verified_traveler,
        "wallet": wallet.wallet(user, db),
        "parcels": market.my_parcels(user, db)["parcels"],
        "incoming": market.incoming(user, db)["requests"],
        "myTrips": market.my_trips(user, db)["trips"],
        "plan": market.my_plan(user, db)["plan"],
        "cancellations": market.my_cancellations(user, db)["cancellations"],
        "reviews": market.my_reviews(user, db),
        "conversations": conversations(user, db)["conversations"],
        "notifications": _notifications(db, user),
        "tickets": _tickets(db, user),
    }
