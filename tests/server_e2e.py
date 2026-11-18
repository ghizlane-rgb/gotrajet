"""Browser test of the website running on the real backend (two users talking to each other).

1. Start a fresh dev server:   python backend/run.py      (test accounts are created on an empty database)
2. Run:                        python tests/server_e2e.py
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8000"
OUT = Path(__file__).resolve().parents[1] / "outputs" / "qa" / "server"
OUT.mkdir(parents=True, exist_ok=True)
errors, report = [], {"steps": []}


def until(page, js, arg=None, timeout=15):
    """Wait for a JS condition. (page.wait_for_function needs 'unsafe-eval', which the site's CSP forbids.)"""
    import time
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate(js, arg):
            return
        page.wait_for_timeout(150)
    raise AssertionError("timeout waiting for " + js)


def step(name):
    report["steps"].append(name)
    print("✓", name)


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


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    sender_ctx, traveler_ctx = browser.new_context(), browser.new_context()
    s, tr = sender_ctx.new_page(), traveler_ctx.new_page()
    for p in (s, tr):
        p.set_viewport_size({"width": 1280, "height": 900})
        p.on("pageerror", lambda e: errors.append(str(e)))
        p.on("console", lambda m: "Content Security Policy" in m.text and errors.append("CSP: " + m.text[:200]))
        p.route("https://www.google.com/**", lambda r: r.abort())

    # Not signed in: private pages send you to login
    s.goto(URL + "/#wallet")
    s.wait_for_selector("#auth-form")
    step("Private page redirects to login")

    login(s, "sender.test@example.com")
    assert s.evaluate("state.balance") == 500
    s.screenshot(path=str(OUT / "sender-space.png"))
    step("Test Sender signed in, balance 500 MAD")

    trip_id = s.evaluate("GJ.S.trips.find(t => t.name === 'Test Traveler' && t.to === 'Rabat').id")
    go(s, "checkout/" + trip_id)
    s.check("#checkout-form [name=payment][value=wallet]")
    s.click("#checkout-form button[type=submit], #checkout-form .btn:not([type=button])")
    s.wait_for_selector("#booking-details-form")
    s.fill("#booking-details-form [name=recipient]", "Hind A.")
    s.fill("#booking-details-form [name=recipientPhone]", "0600000201")
    s.check("#booking-details-form [name=acceptRules]")
    s.click("#booking-details-form .btn")
    until(s, "() => location.hash.startsWith('#success/')")
    pid = s.evaluate("location.hash.split('/')[1]")
    code = s.evaluate("(id) => getParcel(id).code", pid)
    assert s.evaluate("state.balance") == 450
    s.screenshot(path=str(OUT / "sender-success.png"))
    step(f"Parcel {pid} booked from the wallet (450 MAD left)")

    login(tr, "traveler.test@example.com")
    go(tr, "space-traveler")
    assert tr.locator(".account-panel .account-fact.due").count() >= 1  # subscription not paid yet
    go(tr, "requests")
    tr.click(f"[data-action=accept-request][data-value='{pid}']")
    # 0 MAD on the account: the 100 MAD monthly subscription cannot be taken → top-up window
    tr.wait_for_selector("#modal [data-action=topup][data-value=traveler]")
    assert tr.evaluate("(id) => getIncoming(id).status", pid) == "awaiting"
    tr.click("#modal [data-action=topup][data-value=traveler]")
    tr.fill("#topup-form [name=amount]", "100")
    tr.click("#topup-form .btn")
    until(tr, "() => state.balance === 100")
    step("Traveller without balance asked to top up (bank card, 100 MAD)")
    tr.click(f"[data-action=accept-request][data-value='{pid}']")
    until(tr, "(id) => getIncoming(id).status === 'accepted'", arg=pid)
    until(tr, "() => state.balance === 0 && window.GJ.S.plan.subscriptionPaid")
    step("Test Traveler accepted the request; 100 MAD subscription taken")
    go(tr, "request/" + pid)
    tr.click(f"[data-action=pickup-request][data-value='{pid}']")
    until(tr, "(id) => getIncoming(id).status === 'pickedUp'", arg=pid)
    step("Parcel picked up")
    tr.click(f"[data-action=deliver-request][data-value='{pid}']")
    tr.fill("#request-handoff-form [name=code]", "0000" if code != "0000" else "1111")
    tr.click("#request-handoff-form .btn")
    tr.wait_for_timeout(500)
    assert tr.evaluate("(id) => getIncoming(id).status", pid) == "pickedUp"
    tr.fill("#request-handoff-form [name=code]", code)
    tr.click("#request-handoff-form .btn")
    until(tr, "(id) => getIncoming(id).status === 'delivered'", arg=pid)
    assert tr.evaluate("earningsSummary().available") == 45
    go(tr, "earnings")
    tr.screenshot(path=str(OUT / "traveler-earnings.png"))
    step("Wrong code refused; right code delivered; traveller earned 45 MAD (50 minus 10%)")
    go(tr, "space-traveler")
    tr.wait_for_timeout(300)
    tr.locator(".account-panel").screenshot(path=str(OUT / "traveler-account.png"))

    s.evaluate("GJ.refresh().then(render)")
    until(s, "(id) => getParcel(id).status === 'delivered'", arg=pid)
    step("Sender sees the parcel delivered")

    go(s, "messages")
    s.fill("#chat-form [name=message]", "Merci pour la livraison !")
    s.click("#chat-form .btn")
    s.wait_for_timeout(400)
    tr.evaluate("GJ.refresh()")
    until(tr, "() => GJ.S.conversations.some(c => c.messages.some(m => m.text === 'Merci pour la livraison !'))")
    go(tr, "messages")
    tr.screenshot(path=str(OUT / "traveler-chat.png"))
    step("Chat message received by the traveller")

    # Every screen renders without error for a signed-in user, in 3 languages
    screens = s.evaluate("Object.keys(pages)")
    for lang in ("fr", "ar", "en"):
        s.evaluate("(l) => setLanguage(l)", lang)
        for name in screens:
            param = pid if name in ("parcel", "tracking", "review", "success") else trip_id if name in ("detail", "checkout") else ""
            go(s, name + ("/" + param if param else ""))
            assert s.locator("#main").inner_text().strip(), name
    step(f"{len(screens)} screens × 3 languages render for the sender")

    # Admin panel
    a = browser.new_page()
    a.on("pageerror", lambda e: errors.append(str(e)))
    a.on("console", lambda m: "Content Security Policy" in m.text and errors.append("CSP: " + m.text[:200]))
    a.goto(URL + "/admin/")
    a.fill("#login [name=email]", "admin@gotrajet.test")
    a.fill("#login [name=password]", "admin-gotrajet")
    a.click("#login button")
    a.wait_for_selector(".kpis")
    a.screenshot(path=str(OUT / "admin-overview.png"))
    for tab in ("docs", "disputes", "payouts", "parcels", "users", "cash", "tickets", "audit"):
        a.click(f"[data-tab={tab}]")
        a.wait_for_timeout(250)
        assert "Erreur" not in a.locator("#panel").inner_text(), tab
    a.click("[data-tab=parcels]")
    a.wait_for_timeout(300)
    a.screenshot(path=str(OUT / "admin-parcels.png"))
    step("Admin panel: all tabs load")

    browser.close()

report["errors"] = errors
(OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"steps": len(report["steps"]), "errors": errors}, ensure_ascii=False))
assert not errors, errors
