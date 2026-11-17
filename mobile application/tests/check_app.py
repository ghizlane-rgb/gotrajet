"""Checks the mobile application against the website, in a phone-sized browser.

1. Same screens: every route, in FR / EN / AR, shows the same content in the app (www/) as on the website (dist/).
2. No JavaScript errors and no horizontal scrolling at phone width.
3. Installable web app: the service worker installs and the app opens with no network.
4. Native layer (simulated Capacitor): status bar, back button, external links, file sharing.

Needs Python Playwright with Chromium (already used by ../tests/browser_checks.py).
Usage (from "mobile application"):  npm run build  then  python tests/check_app.py
"""
import json
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1]
SITE_DIR, APP_DIR = APP.parent / "dist", APP / "www"
OUT = APP / "build" / "qa"
OUT.mkdir(parents=True, exist_ok=True)
SITE_URL, APP_URL = "http://127.0.0.1:4183", "http://127.0.0.1:4184"
PHONE = {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True}

servers = [
    subprocess.Popen([sys.executable, "-m", "http.server", "4183", "--bind", "127.0.0.1", "--directory", str(SITE_DIR)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
    subprocess.Popen([sys.executable, "-m", "http.server", "4184", "--bind", "127.0.0.1", "--directory", str(APP_DIR)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
]
time.sleep(1.2)

report = {"screens": 0, "different": [], "overflow": [], "errors": [], "offline": None, "native": {}}
FAKE_CAPACITOR = """
window.__calls = [];
const rec = (name) => (...args) => { window.__calls.push([name, args[0] ?? null]); return Promise.resolve({ uri: 'file:///cache/x' }); };
window.__listeners = {};
window.Capacitor = {
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  Plugins: {
    App: { addListener: (ev, fn) => { window.__listeners[ev] = fn; return Promise.resolve({ remove() {} }); }, exitApp: rec('App.exitApp') },
    Browser: { open: rec('Browser.open') },
    SplashScreen: { hide: rec('SplashScreen.hide') },
    StatusBar: { setStyle: rec('StatusBar.setStyle'), setBackgroundColor: rec('StatusBar.setBackgroundColor') },
    Filesystem: { writeFile: rec('Filesystem.writeFile') },
    Share: { share: rec('Share.share') },
  },
};
"""


def route_for(screen):
    extra = {"detail": "/T4", "checkout": "/T4", "traveler-reviews": "/T4", "tracking": "/GJ2048", "parcel": "/GJ2048", "review": "/GJ1984", "trip": "/MT1", "request": "/RQ-A1"}
    return screen + extra.get(screen, "")


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        # 1 + 2: same screens, no errors, no overflow
        site_ctx, app_ctx = browser.new_context(**PHONE), browser.new_context(**PHONE)
        pages = {}
        for name, ctx, url in (("site", site_ctx, SITE_URL), ("app", app_ctx, APP_URL)):
            ctx.route("https://**/*", lambda r: r.abort())  # maps and other outside resources are not part of the check
            p = ctx.new_page()
            p.on("pageerror", lambda e, n=name: report["errors"].append(f"{n}: {e}"))
            p.goto(url + "/index.html", wait_until="domcontentloaded")
            p.wait_for_selector(".welcome-content")
            pages[name] = p
        screens = pages["app"].evaluate("Object.keys(pages)")
        assert screens == pages["site"].evaluate("Object.keys(pages)"), "the app and the website do not have the same screens"
        for lang in ("fr", "en", "ar"):
            for p in pages.values():
                p.evaluate("(l) => setLanguage(l)", lang)
            for screen in screens:
                texts = {}
                for name, p in pages.items():
                    p.evaluate("(r) => go(r)", route_for(screen))
                    p.wait_for_timeout(40)
                    texts[name] = p.locator("#main").inner_text().strip()
                    if name == "app" and p.evaluate("document.documentElement.scrollWidth > innerWidth + 2"):
                        report["overflow"].append(f"{lang}:{screen}")
                report["screens"] += 1
                if not texts["app"] or texts["app"] != texts["site"]:
                    report["different"].append(f"{lang}:{screen}")
        app = pages["app"]
        app.evaluate("setLanguage('fr')")
        for shot in ("welcome", "home", "results", "send", "tracking/GJ2048", "wallet", "messages", "profile"):
            app.evaluate("(r) => go(r)", shot)
            app.wait_for_timeout(300)
            app.screenshot(path=str(OUT / f"app-{shot.replace('/', '-')}.png"))
        site_ctx.close()
        app_ctx.close()

        # 3: service worker + offline start
        ctx = browser.new_context(**PHONE)
        p = ctx.new_page()
        p.goto(APP_URL + "/", wait_until="load")
        p.evaluate("navigator.serviceWorker.ready.then(() => true)")
        p.wait_for_function("navigator.serviceWorker.controller !== null || caches.keys().then(k => k.length > 0)")
        p.wait_for_timeout(1500)
        ctx.set_offline(True)
        p.reload(wait_until="domcontentloaded")
        p.evaluate("location.hash = '#home'")
        p.wait_for_timeout(400)
        report["offline"] = bool(p.locator("#main").inner_text().strip()) and p.evaluate("document.styleSheets.length >= 5")
        p.screenshot(path=str(OUT / "app-offline-home.png"))
        ctx.close()

        # 4: native layer with a simulated Capacitor bridge
        ctx = browser.new_context(**PHONE)
        ctx.route("https://**/*", lambda r: r.abort())
        ctx.add_init_script(FAKE_CAPACITOR)
        p = ctx.new_page()
        p.on("pageerror", lambda e: report["errors"].append(f"native: {e}"))
        p.goto(APP_URL + "/index.html#home", wait_until="load")
        p.wait_for_timeout(500)
        calls = lambda: p.evaluate("window.__calls.map(c => c[0])")
        n = report["native"]
        n["classes"] = p.evaluate("document.documentElement.className")
        n["splash_hidden"] = "SplashScreen.hide" in calls()
        n["status_bar_home"] = p.evaluate("window.__calls.filter(c => c[0] === 'StatusBar.setStyle').at(-1)?.[1]?.style")
        p.evaluate("location.hash = '#welcome'")
        p.wait_for_timeout(300)
        n["status_bar_welcome"] = p.evaluate("window.__calls.filter(c => c[0] === 'StatusBar.setStyle').at(-1)?.[1]?.style")
        # back button: from a deep screen it goes back; from the first screen it asks before exiting
        p.evaluate("location.hash = '#home'"); p.wait_for_timeout(150)
        p.evaluate("location.hash = '#wallet'"); p.wait_for_timeout(150)
        p.evaluate("window.__listeners.backButton({ canGoBack: true })"); p.wait_for_timeout(300)
        n["back_from_wallet"] = p.evaluate("location.hash")
        p.evaluate("window.__listeners.backButton({ canGoBack: true })"); p.wait_for_timeout(100)
        n["first_back_on_home_exits"] = "App.exitApp" in calls()
        p.evaluate("window.__listeners.backButton({ canGoBack: true })"); p.wait_for_timeout(100)
        n["second_back_on_home_exits"] = "App.exitApp" in calls()
        # external link → system browser
        p.evaluate("location.hash = '#tracking/GJ2048'"); p.wait_for_timeout(300)
        link = p.locator("a.gmap-open").first
        if link.count():
            link.click()
            p.wait_for_timeout(200)
            n["maps_link_in_browser"] = p.evaluate("window.__calls.find(c => c[0] === 'Browser.open')?.[1]?.url || null")
        # file download → share sheet
        p.evaluate("location.hash = '#parcel/GJ2048'"); p.wait_for_timeout(300)
        btn = p.locator("[data-action=receipt], [data-action=download-receipt]").first
        if btn.count():
            btn.click()
            p.wait_for_timeout(500)
            n["receipt_shared"] = "Share.share" in calls() and "Filesystem.writeFile" in calls()
        ctx.close()
        browser.close()
finally:
    for s in servers:
        s.terminate()

(OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps(report, indent=2, ensure_ascii=False))
ok = not report["different"] and not report["overflow"] and not report["errors"] and report["offline"]
print("\nRESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
