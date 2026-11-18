"""Browser checks for the smart features (demo mode): prohibited-items check, price guide,
along-the-way matching, route alerts, trust/route facts.  Run against the static server on port 4173:
    python -m http.server 4173 --bind 127.0.0.1 --directory dist
    python tests/smart_checks.py
Screenshots go to outputs/qa/smart-*.png."""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "qa"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:4173"
errors, checks = [], []


def ok(name, cond):
    checks.append((name, bool(cond)))
    if not cond:
        print("FAIL", name)


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 950})
    page.route("https://**/*", lambda r: r.abort())  # no CDN / Google Maps needed
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and "net::" not in m.text and errors.append(m.text))
    page.goto(URL, wait_until="domcontentloaded")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".welcome-content")
    page.evaluate("setLanguage('fr')")

    # ---------- Landing tools ----------
    ok("tools section rendered", page.locator("#tools .tool-card").count() == 2)
    ok("nav link to tools", page.locator('.site-nav [data-value="tools"]').count() == 1)
    box = page.locator("#tool-content")
    for text, level in [("un couteau de cuisine", "block"), ("2 boîtes de gâteaux", "caution"),
                        ("des livres et des vêtements", "ok"), ("سكين", "block"), ("argent liquide", "block"),
                        ("une armoire en bois", "ok"), ("Chargeur de téléphone", "caution")]:
        box.fill(text)
        ok(f"risk '{text}' → {level}", page.locator(f"#tool-risk .risk-box.{level}").count() == 1)
    box.fill("2 boîtes de gâteaux et un chargeur de téléphone")
    page.select_option('#tools [name="from"]', "Marrakech")
    page.select_option('#tools [name="to"]', "Agadir")
    ok("price tool distance", "250 km" in page.locator("#tools-price").inner_text().replace(" ", " "))
    page.locator("#tools").scroll_into_view_if_needed()
    page.evaluate("document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))")
    page.wait_for_timeout(300)
    page.locator("#tools").screenshot(path=str(OUT / "smart-landing-tools.png"))
    page.click('[data-action="tools-swap"]')
    ok("swap updates selects", page.input_value('#tools [name="from"]') == "Agadir")

    # ---------- Along-the-way search ----------
    page.evaluate("search.from='Casablanca'; search.to='Agadir'; search.date=''; filters.all=false; go('results')")
    page.wait_for_selector(".result-row")
    along = page.locator(".result-row.is-along")
    ok("Rabat → Agadir trip found for Casablanca → Agadir (along)", along.count() >= 1)
    ok("along chip shown", page.locator(".result-row .chip-along").count() >= 1)
    ok("route facts in results bar", "km" in page.locator(".results-bar").inner_text())
    page.screenshot(path=str(OUT / "smart-results-along.png"), full_page=False)
    # Reverse direction must not match
    page.evaluate("search.from='Agadir'; search.to='Rabat'; go('results')")
    ok("no along match in reverse direction", page.locator(".result-row.is-along").count() == 0)

    # ---------- Empty state + route alert ----------
    page.evaluate("search.from='Oujda'; search.to='Agadir'; go('results')")
    ok("empty alert state", page.locator(".empty-alert").count() == 1)
    page.click('.empty-alert [data-action="alert-add"]')
    page.wait_for_timeout(100)
    ok("alert active", page.locator('.empty-alert [data-action="alert-remove"].alert-on').count() == 1)
    ok("alerts strip lists the alert", "Oujda → Agadir" in page.locator(".alerts-strip").inner_text())
    ok("alert persisted", page.evaluate("JSON.parse(localStorage.getItem('gj-v2')).alerts.length") == 1)
    page.screenshot(path=str(OUT / "smart-empty-alert.png"))
    page.click('.alerts-strip [data-action="alert-remove"]')
    page.wait_for_timeout(100)
    ok("alert removed", page.locator(".alerts-strip").count() == 0)

    # ---------- Trip detail: real pickup / route facts ----------
    tid = page.evaluate("allTrips()[0].id")
    page.evaluate(f"go('detail', '{tid}')")
    ok("detail shows distance", "km" in page.locator(".detail-layout").inner_text())

    # ---------- Parcel form: blocked item stops step 1 ----------
    page.evaluate("draft.step=1; draft.content=''; go('send')")
    page.fill('#parcel-form [name="content"]', "un pistolet")
    ok("send form shows block", page.locator("#send-risk .risk-box.block").count() == 1)
    for k in ["length", "width", "height", "weight"]:
        page.fill(f'#parcel-form [name="{k}"]', "10")
    page.click("#parcel-form button.btn:not(.outline)")
    page.wait_for_timeout(100)
    ok("blocked item keeps step 1", page.evaluate("draft.step") == 1)
    page.fill('#parcel-form [name="content"]', "des livres")
    page.click("#parcel-form button.btn:not(.outline)")
    page.wait_for_timeout(100)
    ok("allowed item goes to step 2", page.evaluate("draft.step") == 2)

    # ---------- Publish: fair price hint ----------
    page.evaluate("search.mode='travel'; search.from='Casablanca'; search.to='Marrakech'; go('publish')")
    hint = page.locator("#price-hint").inner_text()
    ok("price hint shows km", "240" in hint)
    ok("price hint shows market median of listed trips", "4" in hint)
    page.click('[data-action="use-price"]')
    ok("use price fills the field", page.input_value('#publish-form [name="price"]') == "130")
    page.select_option('#publish-form [name="to"]', "Agadir")
    ok("hint updates with route", "490" in page.locator("#price-hint").inner_text().replace(" ", ""))
    page.locator("#publish-form").screenshot(path=str(OUT / "smart-publish-hint.png"))

    # ---------- Traveller account: balance, top-up (card + Cash Plus), subscription, cancellations ----------
    page.evaluate("state.balance = 50; state.plan = { paid: [], cancellations: [] }; persist(); go('space-traveler')")
    panel = page.locator(".account-panel")
    ok("account panel on traveller home", panel.count() == 1)
    ok("balance shown", "50" in panel.locator(".account-balance strong").inner_text())
    ok("subscription due shown", panel.locator(".account-fact.due [data-action=pay-subscription]").count() == 1)
    ok("commission 10% shown", "10" in panel.inner_text())
    page.locator(".account-panel").screenshot(path=str(OUT / "smart-traveler-account-due.png"))
    page.click(".account-balance [data-action=topup]")
    opts = page.locator("#topup-form input[name=method]").evaluate_all("els => els.map(e => e.value)")
    ok("traveller top-up offers card + Cash Plus only", opts == ["card", "Cash Plus"])
    page.evaluate("closeModal()")
    page.click("[data-action=pay-subscription]")
    ok("low balance → subscription modal", page.locator("#modal h2").inner_text() != "" and page.evaluate("state.balance") == 50)
    page.evaluate("closeModal(); state.balance = 300; persist(); render()")
    page.click("[data-action=pay-subscription]")
    page.wait_for_timeout(100)
    ok("subscription taken once (300 → 200)", page.evaluate("state.balance") == 200 and page.evaluate("planState().subscriptionPaid"))
    ok("second publish costs nothing more", page.evaluate("takeSubscription() && state.balance") == 200)
    # Cancel an accepted parcel: 2% fee, counter, claim pending
    rid = page.evaluate("(() => { const r = incomingAll().find(x => x.status === 'awaiting'); changeTravel(state.incoming, r.id, {status: 'accepted'}); return r.id })()")
    price = page.evaluate(f"getIncoming('{rid}').price")
    page.evaluate(f"go('request', '{rid}')")
    page.click("[data-action=cancel-accepted]")
    ok("cancel modal shows the fee", "2" in page.locator("#modal").inner_text())
    page.click("[data-action=confirm-cancel-accepted]")
    page.wait_for_timeout(100)
    ok("parcel cancelled", page.evaluate(f"getIncoming('{rid}').status") == "declined")
    ok("2% fee taken", abs(page.evaluate("state.balance") - (200 - round(price * 0.02, 2))) < 0.01)
    ok("counter 1/30", page.evaluate("planState().cancelsThisMonth") == 1)
    page.evaluate("go('space-traveler')")
    page.click(".cancel-list summary")
    page.click("[data-action=claim-fee]")
    page.fill("#claim-form textarea", "Le client ne répondait plus au téléphone.")
    page.click("#claim-form button")
    page.wait_for_timeout(100)
    ok("claim pending", page.evaluate("travelerCancellations()[0].claimStatus") == "pending")
    ok("pending label shown", page.locator(".cancel-list .status-pending").count() == 1)
    # Monthly limit: the 31st cancellation is refused before anything is taken
    page.evaluate("for (let i = 0; i < 29; i++) state.plan.cancellations.push({id: 'X'+i, parcelId: 'P'+i, fee: 0, claimStatus: 'none', date: today()}); persist()")
    ok("limit reached 30/30", page.evaluate("planState().cancelsThisMonth") == 30)
    rid2 = page.evaluate("(() => { const r = incomingAll().find(x => x.status === 'awaiting'); if (!r) return ''; changeTravel(state.incoming, r.id, {status: 'accepted'}); return r.id })()")
    if rid2:
        page.evaluate(f"go('request', '{rid2}')")
        page.click("[data-action=cancel-accepted]")
        ok("31st cancellation blocked", page.locator("#modal [data-action=confirm-cancel-accepted]").count() == 0)
        page.evaluate("closeModal()")
    page.evaluate("go('space-traveler')")
    page.wait_for_timeout(300)
    page.locator(".account-panel").screenshot(path=str(OUT / "smart-traveler-account-paid.png"))

    # ---------- Arabic + mobile + dark ----------
    page.set_viewport_size({"width": 390, "height": 860})
    page.evaluate("setLanguage('ar'); state.preferences.dark = true; document.body.classList.add('dark'); go('welcome')")
    page.wait_for_selector("#tools")
    page.evaluate("document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))")
    page.fill("#tool-content", "عطر وهاتف")
    ok("arabic caution", page.locator("#tool-risk .risk-box.caution").count() == 1)
    overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
    ok("no horizontal overflow on mobile (ar, dark)", not overflow)
    page.locator("#tools").screenshot(path=str(OUT / "smart-tools-mobile-ar-dark.png"))
    page.evaluate("search.from='Casablanca'; search.to='Agadir'; search.mode='send'; filters.all=false; go('results')")
    ok("no overflow on mobile results", not page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1"))
    page.screenshot(path=str(OUT / "smart-results-mobile-ar-dark.png"))
    browser.close()

passed = sum(c for _, c in checks)
print(f"{passed}/{len(checks)} checks passed; errors: {errors}")
raise SystemExit(0 if passed == len(checks) and not errors else 1)
