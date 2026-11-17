"""Passwords (scrypt), session tokens (signed JWT in an httpOnly cookie), simple rate limiting."""
import base64
import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import timedelta

import httpx
import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User, now

COOKIE = "gj_session"
_N, _R, _P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return "scrypt${}${}${}${}${}".format(
        _N, _R, _P, base64.b64encode(salt).decode(), base64.b64encode(digest).decode()
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt, digest = stored.split("$")
        test = hashlib.scrypt(
            password.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=32
        )
        return hmac.compare_digest(test, base64.b64decode(digest))
    except (ValueError, TypeError):
        return False


def hash_secret(value: str) -> str:
    """Keyed hash for short-lived codes and tokens (SMS codes, reset links)."""
    return hmac.new(settings.secret_key.encode(), value.encode(), hashlib.sha256).hexdigest()


def make_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "v": user.token_version,
        "exp": now() + timedelta(days=settings.session_days),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def set_session(response, user: User) -> str:
    token = make_token(user)
    response.set_cookie(
        COOKIE,
        token,
        max_age=settings.session_days * 86400,
        httponly=True,
        secure=settings.is_prod,
        samesite="lax",
        path="/",
    )
    return token


def clear_session(response) -> None:
    response.delete_cookie(COOKIE, path="/")


def _token_from(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(COOKIE)


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = _token_from(request)
    if not token:
        return None
    try:
        data = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    user = db.get(User, data.get("sub"))
    if not user or user.token_version != data.get("v") or user.status != "active":
        return None
    return user


def current_user(user: User | None = Depends(optional_user)) -> User:
    if not user:
        raise HTTPException(401, "not_authenticated")
    return user


def admin_ip_allowed(request: Request) -> None:
    if settings.admin_allowed_ips and client_ip(request) not in settings.admin_allowed_ips:
        raise HTTPException(403, "admin_ip_not_allowed")


def admin_base(request: Request, user: User = Depends(current_user)) -> User:
    """Admin, before the 2FA check (used only by the 2FA set-up endpoints)."""
    if not user.is_admin:
        raise HTTPException(403, "admin_only")
    admin_ip_allowed(request)
    return user


def admin_user(user: User = Depends(admin_base), db: Session = Depends(get_db)) -> User:
    if settings.admin_require_2fa:
        from .models import TwoFactor
        tf = db.get(TwoFactor, user.id)
        if not tf or not tf.enabled:
            raise HTTPException(403, "admin_2fa_required")
    return user


class RateLimiter:
    """In-memory sliding window. Fine for one server; use Redis when running several."""

    def __init__(self) -> None:
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_s: int) -> None:
        t = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and t - q[0] > window_s:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(429, "too_many_attempts")
            q.append(t)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    """Real visitor IP. Behind Cloudflare the TCP peer is Cloudflare itself, so the header is used,
    but only when TRUST_CLOUDFLARE=true (otherwise anyone could fake it to dodge rate limits)."""
    if settings.trust_cloudflare:
        cf = request.headers.get("cf-connecting-ip", "").strip()
        if cf:
            return cf
    if settings.on_vercel:
        # Vercel overwrites this header with the visitor's IP; it cannot be faked from outside.
        real = request.headers.get("x-real-ip", "").strip()
        if real:
            return real
    return request.client.host if request.client else "unknown"


# ---------- Cloudflare Turnstile (anti-robot check on sign-up, login, password reset) ----------

def check_turnstile(token: str | None, request: Request) -> None:
    if not settings.turnstile_secret:
        return  # not configured: skipped (local development)
    if not token:
        raise HTTPException(400, "captcha_required")
    try:
        r = httpx.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.turnstile_secret, "response": token, "remoteip": client_ip(request)},
            timeout=8,
        )
        ok = r.json().get("success") is True
    except (httpx.HTTPError, ValueError):
        ok = False
    if not ok:
        raise HTTPException(400, "captcha_failed")


# ---------- Password rules ----------

COMMON_PASSWORDS = {
    "12345678", "123456789", "1234567890", "password", "password1", "password123", "azerty123", "azertyuiop",
    "qwerty123", "qwertyuiop", "11111111", "00000000", "iloveyou", "motdepasse", "maroc123", "morocco123",
    "casablanca", "marrakech", "gotrajet", "gotrajet1", "admin123", "welcome1", "bonjour1", "abc12345",
    "123123123", "87654321", "12341234", "soleil123", "football", "aaaaaaaa",
}


def check_password(password: str, email: str = "", name: str = "") -> None:
    p = password.lower()
    if len(password) < 8:
        raise HTTPException(422, "password_too_short")
    if p in COMMON_PASSWORDS or len(set(p)) < 4:
        raise HTTPException(422, "password_too_common")
    local = email.split("@")[0].lower()
    if (local and len(local) >= 4 and local in p) or (name and name.lower().replace(" ", "") == p):
        raise HTTPException(422, "password_contains_name")


# ---------- Two-factor codes (TOTP, RFC 6238: Google Authenticator, Microsoft Authenticator…) ----------

def totp_new_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def totp_code(secret: str, step: int) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    digest = hmac.new(key, step.to_bytes(8, "big"), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = int.from_bytes(digest[offset:offset + 4], "big") & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"


def totp_verify(secret: str, code: str, last_step: int = 0) -> int | None:
    """Returns the matched time step (to store and refuse reuse), or None. Accepts ±30 s of clock drift."""
    if not code or not code.isdigit() or len(code) != 6:
        return None
    now_step = int(time.time() // 30)
    for step in (now_step - 1, now_step, now_step + 1):
        if step > last_step and hmac.compare_digest(totp_code(secret, step), code):
            return step
    return None
