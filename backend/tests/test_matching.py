"""Along-the-way matching, route alerts and trust facts on trips.  Run: python -m pytest backend/tests -q"""
from backend.app.services import road_path, trip_serves

from .test_api import book, client, make_verified_traveler, publish, register, server  # noqa: F401  (server = fixture)


def test_road_network():
    path, km = road_path("Casablanca", "Agadir")
    assert path == ["Casablanca", "Marrakech", "Agadir"] and km == 490
    assert road_path("Tanger", "Casablanca")[0] == ["Tanger", "Rabat", "Casablanca"]
    assert road_path("Casablanca", "Oujda")[0] == ["Casablanca", "Rabat", "Meknès", "Fès", "Oujda"]
    assert road_path("Rabat", "Rabat") == ([], 0)
    assert road_path("Paris", "Rabat") == ([], 0)
    assert trip_serves("Casablanca", "Agadir", "Casablanca", "Agadir") == "direct"
    assert trip_serves("Casablanca", "Agadir", "Marrakech", "Agadir") == "along"
    assert trip_serves("Casablanca", "Agadir", "Casablanca", "Marrakech") == "along"
    assert trip_serves("Casablanca", "Agadir", "Agadir", "Marrakech") is None  # wrong direction
    assert trip_serves("Casablanca", "Agadir", "Rabat", "Agadir") is None  # not on the way


def test_along_the_way_search_alerts_and_trust(server):  # noqa: F811
    trav = make_verified_traveler("along@test.ma", "+212600007001")
    sender = register("Sara Alerte", "sara.alert@test.ma", "+212600007002")

    # Alerts: validation, creation, idempotent, listing
    assert sender.post("/api/me/alerts", json={"from": "Marrakech", "to": "Marrakech"}).status_code == 422
    assert sender.post("/api/me/alerts", json={"from": "Paris", "to": "Agadir"}).status_code == 422
    a1 = sender.post("/api/me/alerts", json={"from": "Marrakech", "to": "Agadir"}).json()["alert"]
    assert sender.post("/api/me/alerts", json={"from": "Marrakech", "to": "Agadir"}).json()["alert"]["id"] == a1["id"]
    sender.post("/api/me/alerts", json={"from": "Rabat", "to": "Oujda"})
    assert len(sender.get("/api/me/alerts").json()["alerts"]) == 2
    assert client().get("/api/me/alerts").status_code == 401

    # Publishing Casablanca → Agadir notifies the Marrakech → Agadir alert, not the Rabat → Oujda one
    trip = publish(trav, **{"from": "Casablanca", "to": "Agadir"})
    notes = [n for n in sender.get("/api/me/bootstrap").json()["notifications"] if n["key"] == "routeAlert"]
    assert len(notes) == 1 and "Marrakech → Agadir" in notes[0]["body"] and notes[0]["target"] == f"detail/{trip['id']}"

    # Trust facts and distance come from records
    assert trip["verified"] is True and trip["deliveries"] == 0 and trip["distanceKm"] == 490

    # Search: the trip is found for a section of its route, marked "along"; not for the reverse direction
    found = client().get("/api/trips", params={"from": "Marrakech", "to": "Agadir"}).json()["trips"]
    assert any(t["id"] == trip["id"] and t["match"] == "along" for t in found)
    direct = client().get("/api/trips", params={"from": "Casablanca", "to": "Agadir"}).json()["trips"]
    assert any(t["id"] == trip["id"] and t["match"] == "direct" for t in direct)
    reverse = client().get("/api/trips", params={"from": "Agadir", "to": "Marrakech"}).json()["trips"]
    assert all(t["id"] != trip["id"] for t in reverse)
    # One city only still filters exactly, as before
    assert all(t["from"] == "Casablanca" for t in client().get("/api/trips", params={"from": "Casablanca"}).json()["trips"])

    # A sender on the section can book it like any trip
    sender.post("/api/wallet/card-topup", json={"amount": 200})
    r = book(sender, trip["id"], pickup="Marrakech · Guéliz", dropoff="Agadir · Talborjt")
    assert r.status_code == 200, r.text

    # Deleting alerts: only your own
    other = register("Other", "other.alert@test.ma", "+212600007003")
    assert other.delete(f"/api/me/alerts/{a1['id']}").status_code == 404
    assert sender.delete(f"/api/me/alerts/{a1['id']}").status_code == 200
    assert len(sender.get("/api/me/alerts").json()["alerts"]) == 1
