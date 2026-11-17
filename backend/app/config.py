"""Settings read from environment variables (and backend/.env if present)."""
import hashlib
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]  # project root (gotrajet/)
load_dotenv(ROOT / "backend" / ".env")


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        self.env = os.getenv("ENV", "dev")
        self.is_prod = self.env == "prod"
        # Vercel runs the app as serverless functions: several short-lived copies, a read-only disk
        # (only /tmp is writable), so data must live in an online database (Neon, from Vercel → Storage).
        self.on_vercel = bool(os.getenv("VERCEL"))
        self.database_url = (os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "").strip()
        if not self.database_url:
            if self.on_vercel:
                raise RuntimeError("No database: in Vercel, open Storage → create a Neon database → "
                                   "connect it to this project, then redeploy (it sets DATABASE_URL).")
            self.database_url = "sqlite:///backend/data/gotrajet.db"
        # Hosted PostgreSQL (Neon, Supabase…) gives "postgres://" or "postgresql://" URLs;
        # SQLAlchemy needs the driver named, and the installed driver is psycopg 3.
        for prefix in ("postgres://", "postgresql://"):
            if self.database_url.startswith(prefix):
                self.database_url = "postgresql+psycopg://" + self.database_url.removeprefix(prefix)
        self.secret_key = os.getenv("SECRET_KEY") or ""
        if not self.secret_key:
            if self.is_prod:
                raise RuntimeError("SECRET_KEY must be set when ENV=prod")
            if self.on_vercel:
                # Every copy of the function must sign logins with the same key. For the test server,
                # derive it from the database address, which is itself secret. Set SECRET_KEY to override.
                self.secret_key = hashlib.sha256(f"gotrajet-session:{self.database_url}".encode()).hexdigest()
            else:
                self.secret_key = secrets.token_urlsafe(48)  # dev only: sessions reset on restart
        if self.database_url.startswith("sqlite:///") and not self.database_url.startswith("sqlite:////"):
            rel = self.database_url.removeprefix("sqlite:///")
            if rel != ":memory:" and not Path(rel).is_absolute():
                path = ROOT / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                self.database_url = "sqlite:///" + path.as_posix()
        # Vercel gives the project's main address without the scheme (gotrajet.vercel.app).
        vercel_host = os.getenv("VERCEL_PROJECT_PRODUCTION_URL", "")
        self.public_url = os.getenv("PUBLIC_URL") or (f"https://{vercel_host}" if vercel_host else "http://127.0.0.1:8000")
        self.admin_email = os.getenv("ADMIN_EMAIL", "admin@gotrajet.test")
        # Online (prod or Vercel) the admin password must be chosen, never the well-known dev default.
        public = self.is_prod or self.on_vercel
        self.admin_password = os.getenv("ADMIN_PASSWORD", "" if public else "admin-gotrajet")
        self.commission_rate = float(os.getenv("COMMISSION_RATE", "0.07"))
        self.insurance_fee_cents = int(float(os.getenv("INSURANCE_FEE_MAD", "10")) * 100)
        self.cash_ttl_hours = int(os.getenv("CASH_TOPUP_TTL_HOURS", "48"))
        self.require_verified_traveler = _bool("REQUIRE_VERIFIED_TRAVELER", True)
        self.payment_mode = os.getenv("PAYMENT_MODE", "sandbox")
        if self.is_prod and self.payment_mode == "sandbox":
            raise RuntimeError("PAYMENT_MODE=sandbox is not allowed when ENV=prod")
        self.cash_webhook_secret = os.getenv("CASH_WEBHOOK_SECRET") or (
            "" if self.is_prod
            # online test server: not guessable, so nobody can fake an agency payment from outside
            else hashlib.sha256(f"gotrajet-webhook:{self.secret_key}".encode()).hexdigest() if self.on_vercel
            else "dev-webhook-secret")
        self.sms_provider = os.getenv("SMS_PROVIDER", "console")
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_from = os.getenv("TWILIO_FROM", "")
        self.wati_endpoint = os.getenv("WATI_API_ENDPOINT", "").rstrip("/")
        self.wati_token = os.getenv("WATI_API_TOKEN", "")
        # On Vercel only /tmp is writable (and it is wiped when a copy of the function stops).
        upload = Path(os.getenv("UPLOAD_DIR") or ("/tmp/gotrajet-uploads" if self.on_vercel else "backend/data/uploads"))
        self.upload_dir = upload if upload.is_absolute() else ROOT / upload
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        # Cloudflare: read the visitor's IP from CF-Connecting-IP (only when the server is reachable
        # through Cloudflare alone, see docs/security.md), and Turnstile anti-robot check.
        self.trust_cloudflare = _bool("TRUST_CLOUDFLARE", False)
        self.turnstile_site_key = os.getenv("TURNSTILE_SITE_KEY", "")
        self.turnstile_secret = os.getenv("TURNSTILE_SECRET_KEY", "")
        # Admin protection
        self.admin_require_2fa = _bool("ADMIN_REQUIRE_2FA", self.is_prod)
        self.admin_allowed_ips = [ip.strip() for ip in os.getenv("ADMIN_ALLOWED_IPS", "").split(",") if ip.strip()]
        # Extra trusted origins for browser requests (the site's own address is always allowed)
        self.allowed_origins = {o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()}
        self.allowed_origins.add(self.public_url.rstrip("/"))
        self.max_body_bytes = 6 * 1024 * 1024
        self.site_dir = ROOT / "dist"
        self.admin_dir = ROOT / "backend" / "admin"
        self.session_days = 7

    @property
    def sandbox(self) -> bool:
        return self.payment_mode == "sandbox"


settings = Settings()
