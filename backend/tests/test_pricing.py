"""Traveller pricing: 10% commission, 100 MAD monthly fee, 2% fee when the traveller cancels an accepted
parcel (never when the client cancels), max 30 traveller cancellations a month, fee claims refunded by support.
Run: python -m pytest backend/tests -q"""
import pytest

from backend.app.config import settings
from backend.app.models import LedgerEntry, Parcel, TravelerCancellation
from backend.app.db import SessionLocal

from .test_api import admin, balance, book, make_verified_traveler, publish, register, server  # noqa: F401


@pytest.fixture()
def pricing(monkeypatch):
    monkeypatch.setattr(settings, "commission_rate", 0.10)
    monkeypatch.setattr(settings, "monthly_fee_cents", 100_00)
    monkeypatch.setattr(settings, "cancel_fee_rate", 0.02)
    monkeypatch.setattr(settings, "max_cancels_per_month", 30)


def sender_with_money(email, phone, amount=1000):
    s = register("Sender " + email[:4], email, phone)
    assert s.post("/api/wallet/card-topup", json={"amount": amount}).status_code == 200
    return s


def test_subscription_commission_and_cancellations(server, pricing):  # noqa: F811
    trav = make_verified_traveler("pricing.trav@test.ma", "+212600008001")

    # No money: cannot publish, plan says unpaid
    r = trav.post("/api/trips", json={"from": "Casablanca", "to": "Rabat", "date": "2099-01-01", "time": "09:00",
                                      "price": 100, "seats": 5, "weight": 10})
    assert r.status_code == 402 and r.json()["detail"] == "subscription_unpaid"
    plan = trav.get("/api/me/plan").json()["plan"]
    assert plan["subscriptionPaid"] is False and plan["monthlyFee"] == 100 and plan["commissionRate"] == 0.10
    assert plan["maxCancelsPerMonth"] == 30 and plan["cancelsThisMonth"] == 0

    # Top up 150 → publishing takes the 100 MAD once; a second trip the same month costs nothing more
    trav.post("/api/wallet/card-topup", json={"amount": 150})
    trip = publish(trav, price=100, seats=5)
    assert balance(trav) == 50
    publish(trav, price=100, seats=5, time="18:00")
    assert balance(trav) == 50
    assert trav.get("/api/me/plan").json()["plan"]["subscriptionPaid"] is True
    keys = [t["key"] for t in trav.get("/api/me/wallet").json()["transactions"]]
    assert keys.count("subscriptionFee") == 1

    # Delivered parcel: traveller earns 90% (10% commission)
    s = sender_with_money("pricing.s1@test.ma", "+212600008002")
    p = book(s, trip["id"]).json()["parcel"]
    assert trav.post(f"/api/parcels/{p['id']}/accept").status_code == 200
    trav.post(f"/api/parcels/{p['id']}/pickup")
    code = s.get("/api/me/parcels").json()["parcels"][0]["code"]
    assert trav.post(f"/api/parcels/{p['id']}/deliver", json={"code": code}).status_code == 200
    assert balance(trav) == 50 + 90

    # Declining a NEW request is free
    p2 = book(s, trip["id"]).json()["parcel"]
    assert trav.post(f"/api/parcels/{p2['id']}/decline").json()["cancelFee"] == 0
    assert balance(trav) == 140

    # Client cancels an accepted parcel: traveller pays nothing
    p3 = book(s, trip["id"]).json()["parcel"]
    trav.post(f"/api/parcels/{p3['id']}/accept")
    assert s.post(f"/api/parcels/{p3['id']}/cancel").status_code == 200
    assert balance(trav) == 140

    # Traveller cancels an accepted parcel: 2% of 100 = 2 MAD; sender fully refunded
    before = balance(s)
    p4 = book(s, trip["id"]).json()["parcel"]
    trav.post(f"/api/parcels/{p4['id']}/accept")
    r = trav.post(f"/api/parcels/{p4['id']}/decline")
    assert r.status_code == 200 and r.json()["cancelFee"] == 2
    assert balance(trav) == 138 and balance(s) == before
    assert trav.get("/api/me/plan").json()["plan"]["cancelsThisMonth"] == 1

    # Claim → pending → admin refunds → traveller gets the 2 MAD back; no second claim
    c = trav.get("/api/me/cancellations").json()["cancellations"][0]
    assert c["claimStatus"] == "none" and c["fee"] == 2
    assert trav.post(f"/api/me/cancellations/{c['id']}/claim", json={"reason": "short"}).status_code == 422
    r = trav.post(f"/api/me/cancellations/{c['id']}/claim", json={"reason": "Le client ne répondait plus au téléphone."})
    assert r.json()["cancellation"]["claimStatus"] == "pending"
    assert trav.post(f"/api/me/cancellations/{c['id']}/claim", json={"reason": "Encore une fois, merci."}).status_code == 409
    a = admin()
    claims = a.get("/api/admin/cancel-claims").json()["claims"]
    assert claims[0]["id"] == c["id"] and claims[0]["claimStatus"] == "pending"
    assert a.post(f"/api/admin/cancel-claims/{c['id']}/refund", json={"note": "OK"}).status_code == 200
    assert a.post(f"/api/admin/cancel-claims/{c['id']}/refund", json={}).status_code == 404  # only once
    assert balance(trav) == 140
    assert trav.get("/api/me/cancellations").json()["cancellations"][0]["claimStatus"] == "refunded"
    assert register("Nosy", "pricing.nosy@test.ma", "+212600008009").get("/api/admin/cancel-claims").status_code in (401, 403)

    # Bootstrap carries the plan and the cancellations for the dashboard
    b = trav.get("/api/me/bootstrap").json()
    assert b["plan"]["cancelsThisMonth"] == 1 and len(b["cancellations"]) == 1


def test_cancel_limit_30_per_month(server, pricing):  # noqa: F811
    trav = make_verified_traveler("limit.trav@test.ma", "+212600008101")
    trav.post("/api/wallet/card-topup", json={"amount": 500})
    trip = publish(trav, price=50, seats=20)
    # 29 cancellations already this month (inserted directly, to keep the test fast)
    s = sender_with_money("limit.s@test.ma", "+212600008102", 2000)
    first = book(s, trip["id"]).json()["parcel"]
    with SessionLocal() as db:
        traveler_id = db.get(Parcel, first["id"]).trip.traveler_id
        for _ in range(29):
            db.add(TravelerCancellation(parcel_id=first["id"], traveler_id=traveler_id, fee_cents=0))
        db.commit()
    trav.post(f"/api/parcels/{first['id']}/accept")
    assert trav.post(f"/api/parcels/{first['id']}/decline").status_code == 200  # the 30th: allowed
    nxt = book(s, trip["id"]).json()["parcel"]
    trav.post(f"/api/parcels/{nxt['id']}/accept")
    r = trav.post(f"/api/parcels/{nxt['id']}/decline")
    assert r.status_code == 409 and r.json()["detail"] == "cancel_limit_reached"  # the 31st: refused
    # Declining a new (not accepted) request is still allowed
    new = book(s, trip["id"]).json()["parcel"]
    assert trav.post(f"/api/parcels/{new['id']}/decline").status_code == 200
    with SessionLocal() as db:
        assert db.query(LedgerEntry).filter(LedgerEntry.kind == "cancel_fee").count() >= 1
