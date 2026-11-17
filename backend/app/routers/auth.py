import logging
import re
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import messaging
from ..config import settings
from ..db import get_db
from ..models import PasswordReset, PhoneCode, TwoFactor, User, now
from ..security import (
    check_password, check_turnstile, clear_session, client_ip, current_user, hash_password, hash_secret, limiter,
    set_session, totp_verify, verify_password,
)

log = logging.getLogger("gotrajet.auth")
from ..services import normalize_phone, user_out

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = r"^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,}$"


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=EMAIL_RE, max_length=254)
    phone: str = Field(min_length=8, max_length=30)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="individual", pattern="^(individual|carrier)$")
    captcha: str | None = Field(default=None, max_length=4096)


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
    otp: str | None = Field(default=None, max_length=6)
    captcha: str | None = Field(default=None, max_length=4096)


class CodeIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class ForgotIn(BaseModel):
    email: str = Field(max_length=254)
    captcha: str | None = Field(default=None, max_length=4096)


class ResetIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordIn(BaseModel):
    current: str = Field(max_length=128)
    password: str = Field(min_length=8, max_length=128)


@router.post("/register")
def register(data: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    limiter.check("register:" + client_ip(request), 10, 3600)
    check_turnstile(data.captcha, request)
    email = data.email.strip().lower()
    check_password(data.password, email, data.name)
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(409, "email_taken")
    user = User(
        name=data.name.strip(), email=email, phone=normalize_phone(data.phone),
        password_hash=hash_password(data.password), role=data.role,
    )
    db.add(user)
    db.commit()
    set_session(response, user)
    return {"user": user_out(db, user)}


@router.post("/login")
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    limiter.check("login-ip:" + client_ip(request), 30, 900)
    limiter.check("login:" + email, 8, 900)
    check_turnstile(data.captcha, request)
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if not user or not verify_password(data.password, user.password_hash):
        log.warning("Failed login for %s from %s", email, client_ip(request))
        raise HTTPException(401, "wrong_credentials")
    if user.status != "active":
        raise HTTPException(403, "account_suspended")
    tf = db.get(TwoFactor, user.id)
    if tf and tf.enabled:
        if not data.otp:
            raise HTTPException(401, "otp_required")
        step = totp_verify(tf.secret, data.otp, tf.last_step)
        if step is None:
            log.warning("Wrong 2FA code for %s from %s", email, client_ip(request))
            raise HTTPException(401, "wrong_otp")
        tf.last_step = step
        db.commit()
    if user.is_admin:
        log.warning("Admin login: %s from %s", email, client_ip(request))
    set_session(response, user)
    return {"user": user_out(db, user)}


@router.post("/logout")
def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@router.post("/logout-everywhere")
def logout_everywhere(response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.token_version += 1
    db.commit()
    clear_session(response)
    return {"ok": True}


@router.post("/phone/send-code")
def send_phone_code(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.phone_verified:
        return {"sent": False, "alreadyVerified": True}
    limiter.check("sms:" + user.id, 5, 3600)
    limiter.check("sms-ip:" + client_ip(request), 20, 3600)
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(PhoneCode(user_id=user.id, phone=user.phone, code_hash=hash_secret(code), expires_at=now() + timedelta(minutes=10)))
    db.commit()
    messaging.send_sms(user.phone, f"GOTRAJET : votre code de vérification est {code}. Valable 10 minutes.", "gotrajet_otp", [code])
    out = {"sent": True, "phone": re.sub(r"\d(?=\d{4})", "•", user.phone)}
    if settings.sms_provider == "console" and not settings.is_prod:
        out["devCode"] = code  # local testing only: no SMS is really sent
    return out


@router.post("/phone/verify")
def verify_phone(data: CodeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    pc = db.scalar(
        select(PhoneCode).where(PhoneCode.user_id == user.id, PhoneCode.used.is_(False)).order_by(PhoneCode.id.desc())
    )
    if not pc or pc.expires_at < now() or pc.phone != user.phone:
        raise HTTPException(400, "code_expired")
    if pc.attempts >= 5:
        raise HTTPException(429, "too_many_attempts")
    pc.attempts += 1
    if not secrets.compare_digest(pc.code_hash, hash_secret(data.code)):
        db.commit()
        raise HTTPException(400, "wrong_code")
    pc.used = True
    user.phone_verified = True
    db.commit()
    return {"user": user_out(db, user)}


@router.post("/password/forgot")
def forgot_password(data: ForgotIn, request: Request, db: Session = Depends(get_db)):
    limiter.check("forgot:" + client_ip(request), 5, 3600)
    check_turnstile(data.captcha, request)
    user = db.scalar(select(User).where(func.lower(User.email) == data.email.strip().lower()))
    out = {"ok": True}  # same answer whether or not the account exists
    if user:
        token = secrets.token_urlsafe(32)
        db.add(PasswordReset(user_id=user.id, token_hash=hash_secret(token), expires_at=now() + timedelta(hours=1)))
        db.commit()
        link = f"{settings.public_url}/#reset/{token}"
        # Email sending is not configured yet: the link goes by SMS to the account's phone.
        if user.phone:
            messaging.send_sms(user.phone, f"GOTRAJET : réinitialisez votre mot de passe : {link}", "gotrajet_reset", [link])
        if settings.sms_provider == "console" and not settings.is_prod:
            out["devToken"] = token
    return out


@router.post("/password/reset")
def reset_password(data: ResetIn, db: Session = Depends(get_db)):
    pr = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == hash_secret(data.token)))
    if not pr or pr.used or pr.expires_at < now():
        raise HTTPException(400, "link_expired")
    user = db.get(User, pr.user_id)
    check_password(data.password, user.email, user.name)
    user.password_hash = hash_password(data.password)
    user.token_version += 1  # log out all sessions
    pr.used = True
    db.commit()
    return {"ok": True}


@router.post("/password/change")
def change_password(data: ChangePasswordIn, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    limiter.check("pwchange:" + user.id, 5, 900)
    if not verify_password(data.current, user.password_hash):
        raise HTTPException(400, "wrong_password")
    check_password(data.password, user.email, user.name)
    user.password_hash = hash_password(data.password)
    user.token_version += 1
    db.commit()
    set_session(response, user)
    return {"ok": True}
