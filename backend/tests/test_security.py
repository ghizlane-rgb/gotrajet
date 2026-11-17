"""Security tests: forged requests, browser policy, passwords, admin two-factor, Cloudflare Turnstile."""
import base64
import hashlib
import re
import time

import httpx
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app
from backend.app.security import limiter, totp_code

from .test_api import admin, client, register, server  # noqa: F401  (shared fixture and helpers)


def test_cross_site_requests_refused(server):
    c = register("Csrf Victim", "csrf@test.ma")
    evil = c.post("/api/wallet/card-topup", json={"amount": 100}, headers={"Origin": "https://evil.example"})
    assert evil.status_code == 403 and evil.json()["detail"] == "bad_origin"
    assert c.post("/api/wallet/card-topup", json={"amount": 100}, headers={"Origin": "null"}).status_code == 403
    same = c.post("/api/wallet/card-topup", json={"amount": 100}, headers={"Origin": "http://testserver"})
    assert same.status_code == 200
    # agencies' webhook is exempt (it is protected by its signature instead)
    assert TestClient(app).post("/api/payments/cash/webhook", content=b"{}", headers={"Origin": "https://agency.example", "x-signature": "x"}).status_code == 401


def test_browser_security_headers(server):
    r = TestClient(app).get("/")
    csp = r.headers["content-security-policy"]
    assert "object-src 'none'" in csp and "frame-ancestors 'self'" in csp and "'unsafe-eval'" not in csp
    # the only inline script is allowed by its exact hash
    inline = re.search(r"<script>(.*?)</script>", r.text).group(1)
    digest = base64.b64encode(hashlib.sha256(inline.encode()).digest()).decode()
    assert f"'sha256-{digest}'" in csp
    assert r.headers["x-frame-options"] == "SAMEORIGIN"
    assert TestClient(app).get("/admin/").headers["x-robots-tag"] == "noindex, nofollow"
    big = TestClient(app).post("/api/auth/login", content=b"x", headers={"content-length": str(7 * 1024 * 1024)})
    assert big.status_code == 413


def test_weak_passwords_refused(server):
    for pw, code in (("password123", "password_too_common"), ("aaaaaaaa1", "password_too_common"), ("weakuser2026", "password_contains_name")):
        r = client().post("/api/auth/register", json={"name": "Weak User", "email": "weakuser@test.ma", "phone": "+212600009001", "password": pw})
        assert r.status_code == 422 and r.json()["detail"] == code, (pw, r.text)


def test_admin_two_factor(server):
    a = admin()
    settings.admin_require_2fa = True
    try:
        assert a.get("/api/admin/stats").json()["detail"] == "admin_2fa_required"
        secret = a.post("/api/admin/2fa/setup").json()["secret"]
        assert a.post("/api/admin/2fa/enable", json={"code": "000000"}).status_code == 400
        code = totp_code(secret, int(time.time() // 30))
        assert a.post("/api/admin/2fa/enable", json={"code": code}).status_code == 200
        assert a.get("/api/admin/stats").status_code == 401  # other sessions logged out
        limiter.reset()
        c = TestClient(app)
        login = {"email": "admin@test.ma", "password": "admin-pass-123"}
        assert c.post("/api/auth/login", json=login).json()["detail"] == "otp_required"
        assert c.post("/api/auth/login", json={**login, "otp": "123456" if code != "123456" else "654321"}).json()["detail"] == "wrong_otp"
        assert c.post("/api/auth/login", json={**login, "otp": code}).json()["detail"] == "wrong_otp"  # same code cannot be reused
        next_code = totp_code(secret, int(time.time() // 30) + 1)
        assert c.post("/api/auth/login", json={**login, "otp": next_code}).status_code == 200
        assert c.get("/api/admin/stats").status_code == 200
    finally:
        settings.admin_require_2fa = False
        from backend.app.db import SessionLocal
        from backend.app.models import TwoFactor
        with SessionLocal() as db:  # leave other tests a plain admin login
            db.query(TwoFactor).delete()
            db.commit()


def test_admin_ip_allowlist(server):
    a = admin()
    settings.admin_allowed_ips = ["203.0.113.7"]
    try:
        assert a.get("/api/admin/stats").json()["detail"] == "admin_ip_not_allowed"
    finally:
        settings.admin_allowed_ips = []


def test_turnstile_when_configured(server, monkeypatch):
    calls = []

    class Fake:
        def __init__(self, ok):
            self.ok = ok

        def json(self):
            return {"success": self.ok}

    def fake_post(url, data, timeout):
        calls.append(data)
        return Fake(data["response"] == "good-token")

    monkeypatch.setattr(settings, "turnstile_secret", "ts-secret")
    monkeypatch.setattr(httpx, "post", fake_post)
    login = {"email": "admin@test.ma", "password": "admin-pass-123"}
    assert client().post("/api/auth/login", json=login).json()["detail"] == "captcha_required"
    assert client().post("/api/auth/login", json={**login, "captcha": "bad"}).json()["detail"] == "captcha_failed"
    assert client().post("/api/auth/login", json={**login, "captcha": "good-token"}).status_code == 200
    assert calls[-1]["secret"] == "ts-secret"


def test_cloudflare_ip_only_when_trusted(server, monkeypatch):
    from starlette.requests import Request

    from backend.app.security import client_ip
    req = Request({"type": "http", "headers": [(b"cf-connecting-ip", b"198.51.100.9")], "client": ("10.0.0.1", 1234)})
    assert client_ip(req) == "10.0.0.1"  # header ignored: could be faked
    monkeypatch.setattr(settings, "trust_cloudflare", True)
    assert client_ip(req) == "198.51.100.9"
