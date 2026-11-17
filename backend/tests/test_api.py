"""End-to-end API tests on a fresh temporary database.  Run: python -m pytest backend/tests -q"""
import hashlib
import hmac
import json
import os
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

TMP = tempfile.mkdtemp(prefix="gotrajet-test-")
os.environ.update({
    # TEST_DATABASE_URL runs the same tests on an empty PostgreSQL instead of a temporary SQLite file.
    "ENV": "dev", "DATABASE_URL": os.getenv("TEST_DATABASE_URL") or f"sqlite:///{Path(TMP, 'test.db').as_posix()}",
    "UPLOAD_DIR": str(Path(TMP, "up")),
    "SECRET_KEY": "test-secret", "ADMIN_EMAIL": "admin@test.ma", "ADMIN_PASSWORD": "admin-pass-123",
    "SEED_TEST_DATA": "false", "PAYMENT_MODE": "sandbox", "CASH_WEBHOOK_SECRET": "whsec", "SMS_PROVIDER": "console",
})
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.app import messaging  # noqa: E402
from backend.app.main import app  # noqa: E402
from backend.app.security import limiter  # noqa: E402

TOMORROW = (date.today() + timedelta(days=1)).isoformat()
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 200


@pytest.fixture(scope="module")
def server():
    with TestClient(app) as c:
        yield c


def client():
    limiter.reset()
    return TestClient(app)


def register(name, email, phone="+212600001234"):
    c = client()
    r = c.post("/api/auth/register", json={"name": name, "email": email, "phone": phone, "password": "secret123"})
    assert r.status_code == 200, r.text
    return c


def verify_phone(c):
    code = c.post("/api/auth/phone/send-code").json()["devCode"]
    assert c.post("/api/auth/phone/verify", json={"code": "000000" if code != "000000" else "111111"}).status_code == 400
    assert c.post("/api/auth/phone/verify", json={"code": code}).json()["user"]["phoneVerified"]


def admin():
    c = client()
    assert c.post("/api/auth/login", json={"email": "admin@test.ma", "password": "admin-pass-123"}).status_code == 200
    return c


def make_verified_traveler(email, phone):
    t = register("Trav " + email[:4], email, phone)
    verify_phone(t)
    for kind in ("id", "photo"):
        r = t.post("/api/verification/docs", data={"kind": kind}, files={"file": ("x.jpg", JPEG, "image/jpeg")})
        assert r.status_code == 200, r.text
    a = admin()
    for d in a.get("/api/admin/docs").json()["docs"]:
        assert a.post(f"/api/admin/docs/{d['id']}/approve", json={}).status_code == 200
    return t


def publish(t, **kw):
    body = {"from": "Casablanca", "to": "Rabat", "date": TOMORROW, "time": "09:00", "price": 50, "seats": 2, "weight": 10}
    body.update(kw)
    r = t.post("/api/trips", json=body)
    assert r.status_code == 200, r.text
    return r.json()["trip"]


def book(s, trip_id, **kw):
    body = {"tripId": trip_id, "weight": 3, "recipient": "Hind A.", "recipientPhone": "0600000201",
            "payment": "wallet", "acceptRules": True}
    body.update(kw)
    return s.post("/api/parcels", json=body)


def balance(c):
    return c.get("/api/me/wallet").json()["balance"]


def test_auth_and_security(server):
    c = register("Ikram S.", "ikram@test.ma")
    assert c.get("/api/me").json()["user"]["email"] == "ikram@test.ma"
    assert client().post("/api/auth/register", json={"name": "X Y", "email": "IKRAM@test.ma", "phone": "+212600000001", "password": "secret123"}).status_code == 409
    assert client().post("/api/auth/login", json={"email": "ikram@test.ma", "password": "wrong-pass"}).status_code == 401
    assert client().get("/api/me").status_code == 401
    assert client().get("/api/admin/stats").status_code == 401
    assert c.get("/api/admin/stats").status_code == 403
    # weak password and bad phone rejected
    assert client().post("/api/auth/register", json={"name": "A B", "email": "a@test.ma", "phone": "+212600000002", "password": "short"}).status_code == 422
    assert client().post("/api/auth/register", json={"name": "A B", "email": "b@test.ma", "phone": "12", "password": "secret123"}).status_code == 422
    # password reset logs out old sessions
    token = client().post("/api/auth/password/forgot", json={"email": "ikram@test.ma"}).json()["devToken"]
    assert client().post("/api/auth/password/reset", json={"token": token, "password": "newsecret1"}).status_code == 200
    assert c.get("/api/me").status_code == 401
    assert client().post("/api/auth/login", json={"email": "ikram@test.ma", "password": "newsecret1"}).status_code == 200
    # rate limit on login
    limiter.reset()
    codes = [TestClient(app).post("/api/auth/login", json={"email": "ikram@test.ma", "password": "bad-pass-x"}).status_code for _ in range(10)]
    assert 429 in codes


def test_unverified_traveler_cannot_publish(server):
    t = register("New Trav", "newtrav@test.ma")
    r = t.post("/api/trips", json={"from": "Casablanca", "to": "Rabat", "date": TOMORROW, "time": "09:00", "price": 50, "seats": 2, "weight": 10})
    assert r.status_code == 403 and r.json()["detail"] == "traveler_not_verified"
    bad = t.post("/api/verification/docs", data={"kind": "id"}, files={"file": ("x.exe", b"MZ\x90\x00evil", "image/jpeg")})
    assert bad.status_code == 415


def test_full_delivery_flow_with_escrow(server):
    t = make_verified_traveler("trav1@test.ma", "+212600002001")
    trip = publish(t)
    s = register("Sara S.", "sara@test.ma", "+212600002002")
    verify_phone(s)
    assert book(s, trip["id"]).status_code == 402  # empty wallet
    assert s.post("/api/wallet/card-topup", json={"amount": 200}).status_code == 200
    assert book(s, trip["id"], acceptRules=False).status_code == 422
    r = book(s, trip["id"], insurance=True)
    assert r.status_code == 200, r.text
    p = r.json()["parcel"]
    assert p["price"] == 60 and p["status"] == "awaiting" and len(p["code"]) == 4
    assert balance(s) == 140
    # traveller sees the request, but never the code nor contact before acceptance
    req = t.get("/api/me/incoming").json()["requests"][0]
    assert "code" not in req and req["senderPhone"] == "" and req["price"] == 50
    # other users cannot act on it
    assert s.post(f"/api/parcels/{p['id']}/accept").status_code == 403
    assert t.post(f"/api/parcels/{p['id']}/accept").json()["request"]["status"] == "accepted"
    assert t.post(f"/api/parcels/{p['id']}/pickup").status_code == 200
    assert any(p["code"] in m["text"] and m["to"] == "+212600000201" for m in messaging.outbox)  # recipient SMS
    assert t.post(f"/api/parcels/{p['id']}/deliver", json={"code": "0000" if p["code"] != "0000" else "1111"}).status_code == 400
    assert t.post(f"/api/parcels/{p['id']}/deliver", json={"code": p["code"]}).status_code == 200
    # traveller earns 50 - 7% = 46.50; platform keeps 3.50 + 10 insurance
    w = t.get("/api/me/wallet").json()
    assert w["balance"] == 46.5 and w["earnings"]["available"] == 46.5
    assert s.get("/api/me/parcels").json()["parcels"][0]["status"] == "delivered"
    assert admin().get("/api/admin/stats").json()["platformRevenue"] == 13.5
    # reviews both ways, chat between them
    assert s.post(f"/api/parcels/{p['id']}/review", json={"rating": 5, "comment": "Parfait"}).status_code == 200
    assert t.post(f"/api/parcels/{p['id']}/review", json={"rating": 4}).status_code == 200
    assert s.get("/api/trips/" + trip["id"]).json()["trip"]["rating"] == 5
    tid = t.get("/api/me").json()["user"]["id"]
    assert s.post("/api/messages", json={"to": tid, "body": "Merci !"}).status_code == 200
    conv = t.get("/api/me/conversations").json()["conversations"]
    assert any(m["text"] == "Merci !" for c in conv for m in c["messages"])
    stranger = register("Str Anger", "stranger@test.ma")
    assert stranger.post("/api/messages", json={"to": tid, "body": "spam"}).status_code == 403
    # payout: only earnings, admin pays it
    assert s.post("/api/wallet/payouts", json={}).status_code == 409  # sender has only top-ups
    po = t.post("/api/wallet/payouts", json={"method": "bank", "details": "RIB 0000"}).json()["payout"]
    assert po["amount"] == 46.5 and balance(t) == 0
    a = admin()
    assert a.post(f"/api/admin/payouts/{po['id']}/paid", json={}).status_code == 200
    # trip can now be completed
    assert t.post(f"/api/trips/{trip['id']}/start").status_code == 200
    assert t.post(f"/api/trips/{trip['id']}/complete").status_code == 200


def test_decline_cancel_and_capacity_refunds(server):
    t = make_verified_traveler("trav2@test.ma", "+212600003001")
    trip = publish(t, seats=1)
    s = register("Omar O.", "omar@test.ma", "+212600003002")
    s.post("/api/wallet/card-topup", json={"amount": 100})
    p1 = book(s, trip["id"]).json()["parcel"]
    assert book(s, trip["id"]).status_code == 409  # 1 seat only
    assert book(s, trip["id"], weight=50).status_code == 409
    assert t.post(f"/api/parcels/{p1['id']}/decline").status_code == 200
    assert balance(s) == 100  # refunded
    p2 = book(s, trip["id"]).json()["parcel"]
    assert s.post(f"/api/parcels/{p2['id']}/cancel").status_code == 200
    assert balance(s) == 100
    assert book(t, trip["id"]).status_code == 409  # cannot book own trip


def test_dispute_freezes_and_admin_refunds(server):
    t = make_verified_traveler("trav3@test.ma", "+212600004001")
    trip = publish(t)
    s = register("Nora N.", "nora@test.ma", "+212600004002")
    s.post("/api/wallet/card-topup", json={"amount": 50})
    p = book(s, trip["id"]).json()["parcel"]
    t.post(f"/api/parcels/{p['id']}/accept")
    t.post(f"/api/parcels/{p['id']}/pickup")
    assert s.post(f"/api/parcels/{p['id']}/dispute", json={"reason": "Le voyageur ne répond plus depuis hier."}).status_code == 200
    # delivery still possible, but money stays frozen until support decides
    t.post(f"/api/parcels/{p['id']}/deliver", json={"code": p["code"]})
    assert balance(t) == 0
    a = admin()
    d = a.get("/api/admin/disputes").json()["disputes"][0]
    assert a.post(f"/api/admin/disputes/{d['id']}/resolve", json={"resolution": "refund_sender", "note": "colis abîmé"}).status_code == 200
    assert balance(s) == 50 and balance(t) == 0
    assert any(e["action"] == "dispute_refund_sender" for e in a.get("/api/admin/audit").json()["entries"])


def test_cash_topup_webhook(server):
    s = register("Cash User", "cash@test.ma", "+212600005001")
    assert s.post("/api/wallet/cash-topups", json={"amount": 10, "network": "Cash Plus"}).status_code == 422
    assert s.post("/api/wallet/cash-topups", json={"amount": 100, "network": "Fake"}).status_code == 422
    c = s.post("/api/wallet/cash-topups", json={"amount": 100, "network": "Cash Plus"}).json()["topup"]
    assert c["status"] == "pending" and len(c["ref"]) == 10
    raw = json.dumps({"reference": c["ref"], "amount": 100, "agency_txn_id": "CP-1"}).encode()
    assert TestClient(app).post("/api/payments/cash/webhook", content=raw, headers={"x-signature": "bad"}).status_code == 401
    sig = hmac.new(b"whsec", raw, hashlib.sha256).hexdigest()
    look = json.dumps({"reference": c["ref"]}).encode()
    lk = TestClient(app).post("/api/payments/cash/lookup", content=look, headers={"x-signature": hmac.new(b"whsec", look, hashlib.sha256).hexdigest()})
    assert lk.json()["amount"] == 100 and lk.json()["customer"] == "Cash U."
    wrong = json.dumps({"reference": c["ref"], "amount": 90, "agency_txn_id": "CP-1"}).encode()
    assert TestClient(app).post("/api/payments/cash/webhook", content=wrong, headers={"x-signature": hmac.new(b"whsec", wrong, hashlib.sha256).hexdigest()}).status_code == 409
    assert TestClient(app).post("/api/payments/cash/webhook", content=raw, headers={"x-signature": sig}).status_code == 200
    assert TestClient(app).post("/api/payments/cash/webhook", content=raw, headers={"x-signature": sig}).json()["duplicate"]
    assert balance(s) == 100
    tx = s.get("/api/me/wallet").json()["transactions"][0]
    assert tx["key"] == "topupCash"
    # sandbox simulate + cancel
    c2 = s.post("/api/wallet/cash-topups", json={"amount": 50, "network": "Wafacash"}).json()["topup"]
    assert s.post(f"/api/wallet/cash-topups/{c2['id']}/simulate-paid").json()["balance"] == 150
    c3 = s.post("/api/wallet/cash-topups", json={"amount": 50, "network": "Wafacash"}).json()["topup"]
    assert s.post(f"/api/wallet/cash-topups/{c3['id']}/cancel").status_code == 200
    assert s.post(f"/api/wallet/cash-topups/{c3['id']}/simulate-paid").status_code == 409
    other = register("Other O.", "other@test.ma")
    assert other.post(f"/api/wallet/cash-topups/{c3['id']}/cancel").status_code == 404


def test_admin_suspend_and_bootstrap(server):
    u = register("Bad Actor", "bad@test.ma")
    b = u.get("/api/me/bootstrap").json()
    assert set(b) >= {"user", "wallet", "parcels", "incoming", "myTrips", "conversations", "notifications", "verification"}
    a = admin()
    uid = b["user"]["id"]
    assert a.post(f"/api/admin/users/{uid}/suspend", json={"note": "fraude"}).status_code == 200
    assert u.get("/api/me").status_code == 401
    assert client().post("/api/auth/login", json={"email": "bad@test.ma", "password": "secret123"}).status_code == 403


def test_search_and_site(server):
    r = TestClient(app).get("/api/trips", params={"from": "Casablanca", "to": "Rabat"})
    assert r.status_code == 200 and all(t["freeSeats"] > 0 for t in r.json()["trips"])
    page = TestClient(app).get("/")
    assert "window.GJ_SERVER" in page.text and page.headers["x-content-type-options"] == "nosniff"
    assert TestClient(app).get("/js/app.js").status_code == 200
    assert TestClient(app).get("/admin/").status_code == 200
