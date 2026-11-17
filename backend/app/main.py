"""GOTRAJET server: the API (/api), the website (/) and the admin panel (/admin) on one address.

Run locally:  python backend/run.py   →   http://127.0.0.1:8000
"""
import base64
import hashlib
import json
import logging
import os
import time
from urllib.parse import urlsplit
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import account, admin, auth, market, wallet
from .seed import ensure_admin, seed_test_data

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

log = logging.getLogger("gotrajet")


def _prepare_database() -> None:
    # Creates missing tables. For schema changes after launch, add Alembic migrations.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_admin(db)
        if os.getenv("SEED_TEST_DATA", "true" if not settings.is_prod else "false") == "true":
            seed_test_data(db)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # On serverless hosts several copies can start at the same moment against an empty database:
    # the one that loses the race to create tables or test accounts tries again, then carries on.
    for attempt in (1, 2, 3):
        try:
            _prepare_database()
            break
        except Exception:
            if attempt == 3 or not settings.on_vercel:
                raise
            log.warning("Database setup collided with another starting copy, retrying", exc_info=True)
            time.sleep(attempt)
    yield


app = FastAPI(
    title="GOTRAJET API",
    docs_url=None if settings.is_prod else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_prod else "/api/openapi.json",
    lifespan=lifespan,
)

for r in (auth.router, market.router, wallet.router, account.router, admin.router):
    app.include_router(r)


def _flag_script() -> str:
    """Tells the website it runs with the real backend (see js/server.js). Allowed by its CSP hash."""
    cfg = {"sandbox": settings.sandbox, "turnstile": settings.turnstile_site_key}
    return f"window.GJ_SERVER = {json.dumps(cfg)};"


def _index() -> str:
    html = (settings.site_dir / "index.html").read_text(encoding="utf-8")
    tag = '<script src="js/i18n.js"></script>'
    return html.replace(tag, f"<script>{_flag_script()}</script>\n    {tag}", 1)


WEBHOOK_PATHS = ("/api/payments/cash/",)  # called by agencies' servers, protected by signature instead
UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


def _csp() -> str:
    flag = _flag_script()
    digest = base64.b64encode(hashlib.sha256(flag.encode()).digest()).decode()
    cf = " https://challenges.cloudflare.com" if settings.turnstile_site_key else ""
    return "; ".join([
        "default-src 'self'",
        f"script-src 'self' 'sha256-{digest}'{cf}",
        "style-src 'self' 'unsafe-inline'",  # the screens use inline style attributes for progress bars
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "media-src 'self'",
        f"connect-src 'self'{cf}",
        f"frame-src 'self' https://www.google.com https://maps.google.com{cf}",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
    ] + (["upgrade-insecure-requests"] if settings.is_prod else []))


CSP = _csp()


@app.middleware("http")
async def protect(request: Request, call_next):
    path = request.url.path
    # 1. Refuse oversized requests early (uploads are limited to 5 MB further down).
    if int(request.headers.get("content-length") or 0) > settings.max_body_bytes:
        return JSONResponse({"detail": "request_too_large"}, status_code=413)
    # 2. Cross-site request forgery: a browser always sends Origin on these requests;
    #    refuse any that come from another website.
    if request.method in UNSAFE and path.startswith("/api/") and not path.startswith(WEBHOOK_PATHS):
        origin = (request.headers.get("origin") or "").rstrip("/")
        if origin and origin != "null":
            host_ok = urlsplit(origin).netloc == request.headers.get("host", "")
            if not host_ok and origin not in settings.allowed_origins:
                return JSONResponse({"detail": "bad_origin"}, status_code=403)
        elif origin == "null":
            return JSONResponse({"detail": "bad_origin"}, status_code=403)
    response = await call_next(request)
    h = response.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    h.setdefault("X-Frame-Options", "SAMEORIGIN")
    h.setdefault("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self), payment=()")
    h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    h.setdefault("Content-Security-Policy", CSP)
    if settings.is_prod:
        h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if path.startswith("/api/") or path.startswith("/admin"):
        h.setdefault("Cache-Control", "no-store")
    if path.startswith("/admin"):
        h.setdefault("X-Robots-Tag", "noindex, nofollow")
    return response


@app.get("/api/health")
def health():
    return {"ok": True, "env": settings.env, "sandbox": settings.sandbox, "turnstile": settings.turnstile_site_key}


@app.exception_handler(ValueError)
async def value_error(_request: Request, exc: ValueError):
    return JSONResponse({"detail": "invalid_value"}, status_code=422)


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def index():
    return HTMLResponse(_index(), headers={"Cache-Control": "no-cache"})


app.mount("/admin", StaticFiles(directory=settings.admin_dir, html=True), name="admin")
app.mount("/", StaticFiles(directory=settings.site_dir), name="site")
