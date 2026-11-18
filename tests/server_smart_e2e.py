"""Browser test of the smart features on the real backend (two users).

1. Start a fresh dev server:   python backend/run.py      (test accounts are created on an empty database)
2. Run:                        python tests/server_smart_e2e.py

Scenario: a sender creates a Rabat → Marrakech alert (no trip yet). A verified traveller publishes
Tanger → Agadir, which passes through Rabat and Marrakech. The sender is notified, finds the trip
"on the way" with trust badges, is blocked from booking a knife, then books books."""
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000"


def until(page, js, timeout=15):
    """Wait for a JS condition (wait_for_function needs 'unsafe-eval', which the site's CSP forbids)."""
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(js):
            return
        page.wait_for_timeout(150)
    raise AssertionError("timeout waiting for " + js)


def login(page, email):
    page.goto(URL + "/#login")
    page.wait_for_selector("#auth-form")
    page.fill("#auth-form [name=email]", email)
    page.fill("#auth-form [name=password]", "test1234")
    page.click("#auth-form button.btn")
    until(page, "() => window.GJ && window.GJ.S.me")


def go(page, route):
    page.evaluate("(r) => go(r)", route)
    page.wait_for_timeout(250)


OUT = Path(__file__).resolve().parents[1] / "outputs" / "qa" / "server"
OUT.mkdir(parents=True, exist_ok=True)
errors, steps = [], []


def step(name):
    steps.append(name)
    print("OK", name)


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    sender = browser.new_context(viewport={"width": 1366, "height": 900}).new_page()
    traveler = browser.new_context(viewport={"width": 1366, "height": 900}).new_page()
    for p in (sender, traveler):
        p.route("https://**/*", lambda r: r.abort())
        p.on("pageerror", lambda e: errors.append(str(e)))

    # Sender: empty route → create an alert from the empty state
    login(sender, "sender.test@example.com")
    sender.evaluate("setLanguage('fr'); search.from='Rabat'; search.to='Marrakech'; search.date=''; search.mode='send'; filters.all=false")
    go(sender, "results")
    until(sender, "() => !!document.querySelector('.empty-alert')")
    sender.click('.empty-alert [data-action="alert-add"]')
    until(sender, "() => (window.GJ.S.alerts || []).some(a => a.from === 'Rabat' && a.to === 'Marrakech')")
    assert sender.locator(".alerts-strip").count() == 1
    step("Sender created a Rabat → Marrakech alert (saved on the account)")

    # Traveller publishes Tanger → Agadir with the price hint
    login(traveler, "traveler.test@example.com")
    # Traveller tops up by bank card so the monthly subscription can be taken when publishing
    traveler.evaluate("window.GJ.api('/api/wallet/card-topup', { method: 'POST', body: { amount: 300 } })")
    until(traveler, "() => { window.GJ.refresh(); return state.balance >= 300 }")
    traveler.evaluate("search.mode='travel'; search.from='Tanger'; search.to='Agadir'")
    go(traveler, "publish")
    hint = traveler.locator("#price-hint").inner_text()
    assert "km" in hint, hint
    traveler.click('[data-action="use-price"]')
    traveler.click("#publish-form button.btn.wide")
    until(traveler, "() => location.hash.startsWith('#trips')")
    assert traveler.evaluate("state.balance") == 200 and traveler.evaluate("window.GJ.S.plan.subscriptionPaid")
    step("Traveller published Tanger → Agadir using the suggested price; 100 MAD subscription taken (300 → 200)")

    # Sender is notified and finds the trip "on the way", with trust facts from the server
    until(sender, "() => { window.GJ.refresh(); return state.notifications.some(n => n.key === 'routeAlert') }", timeout=20)
    note = sender.evaluate("state.notifications.find(n => n.key === 'routeAlert')")
    assert "Rabat → Marrakech" in note["body"] and note["target"].startswith("detail/"), note
    step("Sender received the route-alert notification: " + note["body"])
    sender.evaluate("window.GJ.S.tripsAt = 0")
    go(sender, "results")
    until(sender, "() => !!document.querySelector('.result-row.is-along')")
    row = sender.locator(".result-row.is-along").first.inner_text()
    assert "Tanger" in row and "Identité vérifiée" in row, row
    assert "Nouveau voyageur" in row or "livraison" in row, row  # count comes from delivered parcels
    sender.wait_for_timeout(400)
    sender.screenshot(path=str(OUT / "smart-along-server.png"))
    step("Trip shown on the way, with 'ID verified' and delivery count from the database")

    # Book: along notice, pickup pre-filled with the sender's city, knife blocked
    trip_id = sender.evaluate("allTrips().find(p => p.from === 'Tanger' && p.to === 'Agadir').id")
    go(sender, "checkout/" + trip_id)
    sender.check('#checkout-form input[name="payment"][value="wallet"]')
    sender.click("#checkout-form button.btn.wide")
    sender.wait_for_selector("#booking-details-form")
    assert sender.locator("#modal .along-notice").count() == 1
    assert sender.input_value('#booking-details-form [name="pickup"]').startswith("Rabat")
    sender.fill('#booking-details-form [name="recipient"]', "Hind A.")
    sender.fill('#booking-details-form [name="recipientPhone"]', "0600000201")
    sender.fill('#booking-details-form [name="content"]', "un couteau de cuisine")
    assert sender.locator("#booking-risk .risk-box.block").count() == 1
    sender.check('#booking-details-form [name="acceptRules"]')
    sender.click("#booking-details-form button.btn.wide")
    sender.wait_for_timeout(600)
    assert sender.locator("#booking-details-form").count() == 1  # still open: blocked
    step("Prohibited item blocked before the booking reached the server")
    sender.fill('#booking-details-form [name="content"]', "des livres")
    sender.click("#booking-details-form button.btn.wide")
    until(sender, "() => location.hash.startsWith('#success/')")
    pickup = sender.evaluate("state.bookings[0].pickup")
    assert pickup.startswith("Rabat"), pickup
    step("Booked on the way: pickup recorded in " + pickup)

    # Traveller accepts, then cancels: 2% fee, sender refunded in full, claim → admin refunds the fee
    pid = sender.evaluate("state.bookings[0].id")
    sender_balance = sender.evaluate("state.balance")
    paid = sender.evaluate("state.bookings[0].price")
    traveler.evaluate("window.GJ.refresh()")
    go(traveler, "requests")
    until(traveler, f"() => !!document.querySelector(\"[data-action=accept-request][data-value='{pid}']\")")
    traveler.click(f"[data-action=accept-request][data-value='{pid}']")
    until(traveler, f"() => getIncoming('{pid}').status === 'accepted'")
    go(traveler, "request/" + pid)
    traveler.click(f"[data-action=cancel-accepted][data-value='{pid}']")
    traveler.click(f"#modal [data-action=confirm-cancel-accepted]")
    until(traveler, f"() => getIncoming('{pid}').status === 'declined'")
    fee = round(paid * 0.02, 2)
    until(traveler, f"() => Math.abs(state.balance - {200 - fee}) < 0.01")
    until(sender, f"() => {{ window.GJ.refresh(); return Math.abs(state.balance - {sender_balance + paid}) < 0.01 }}")
    step(f"Traveller cancelled: fee {fee} MAD taken (2%), sender refunded {paid} MAD in full")
    go(traveler, "space-traveler")
    assert "1 / 30" in traveler.locator(".account-panel").inner_text()
    traveler.click(".cancel-list summary")
    traveler.click("[data-action=claim-fee]")
    traveler.fill("#claim-form textarea", "Le client a demandé d'annuler par téléphone.")
    traveler.click("#claim-form button")
    until(traveler, "() => !!document.querySelector('.cancel-list .status-pending')")
    step("Claim filed: 'en cours de traitement'")
    admin = browser.new_context().new_page()
    admin.goto(URL + "/admin/")
    admin.wait_for_selector("#login")
    admin.fill("#login [name=email]", "admin@gotrajet.test")
    admin.fill("#login [name=password]", "admin-gotrajet")
    admin.click("#login button")
    admin.wait_for_selector("#tabs [data-tab=claims]")
    admin.click("#tabs [data-tab=claims]")
    admin.wait_for_selector("[data-act=claim-refund]")
    admin.on("dialog", lambda d: d.accept("Annulation demandée par le client."))
    admin.click("[data-act=claim-refund]")
    admin.wait_for_timeout(800)
    until(traveler, f"() => {{ window.GJ.refresh(); return Math.abs(state.balance - 200) < 0.01 }}")
    go(traveler, "space-traveler")
    traveler.click(".cancel-list summary")
    assert traveler.locator(".cancel-list .status-delivered").count() == 1
    traveler.wait_for_timeout(300)
    traveler.locator(".account-panel").screenshot(path=str(OUT / "traveler-account-claim.png"))
    step("Admin refunded the fee from the Réclamations tab; traveller back to 200 MAD")

    # Remove the alert
    go(sender, "results")
    sender.click('.alerts-strip [data-action="alert-remove"]')
    until(sender, "() => (window.GJ.S.alerts || []).length === 0")
    step("Alert removed")
    browser.close()

print({"steps": len(steps), "errors": errors})
raise SystemExit(1 if errors else 0)
