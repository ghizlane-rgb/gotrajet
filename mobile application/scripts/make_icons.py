"""Draws the app icons and splash screens for Android and iOS from the website's vector logo.

Source: ../dist/assets/favicon.svg (logo) and ../dist/assets/font-8.woff2 (Manrope 800, the wordmark).
Needs Python Playwright with Chromium and Pillow (already used by the website's tests).
Usage (from "mobile application"):  python scripts/make_icons.py
"""
import base64
import io
import re
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parent.parent
SITE = APP.parent / "dist"
RES = APP / "android" / "app" / "src" / "main" / "res"
IOS = APP / "ios" / "App" / "App" / "Assets.xcassets"
NAVY = "#0b3052"

svg = (SITE / "assets" / "favicon.svg").read_text(encoding="utf-8")
artwork = re.search(r"<g .*</g>", svg, re.S).group(0)  # logo without its rounded navy tile
font = base64.b64encode((SITE / "assets" / "font-8.woff2").read_bytes()).decode()


def logo_svg(tile: bool, rounded: bool = False) -> str:
    rect = f'<rect width="64" height="64" rx="{14 if rounded else 0}" fill="{NAVY}"/>' if tile else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">{rect}{artwork}</svg>'


def page_html(body: str, background: str = "transparent") -> str:
    return f"""<!doctype html><html><head><style>
@font-face {{ font-family: Manrope; font-weight: 800; src: url(data:font/woff2;base64,{font}) format('woff2'); }}
html, body {{ margin: 0; width: 100%; height: 100%; background: {background}; overflow: hidden; }}
body {{ display: grid; place-items: center; }}
</style></head><body>{body}</body></html>"""


def render(browser, html: str, w: int, h: int) -> Image.Image:
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    page.set_content(html)
    page.evaluate("document.fonts.ready")
    png = page.screenshot(omit_background=True, type="png")
    page.close()
    return Image.open(io.BytesIO(png)).convert("RGBA")


def splash_html(w: int, h: int) -> str:
    s = min(w, h)
    logo = round(s * 0.30)
    text = round(s * 0.085)
    return page_html(
        f"""<div style="display:flex;flex-direction:column;align-items:center;gap:{round(s * 0.03)}px">
  <div style="width:{logo}px;height:{logo}px">{logo_svg(False)}</div>
  <div style="font:800 {text}px Manrope;letter-spacing:-0.03em;color:#fff">GOTRA<span style="color:#ff8616">JET</span></div>
</div>""",
        NAVY,
    )


def save(img: Image.Image, path: Path, rgb: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    (img.convert("RGB") if rgb else img).save(path, optimize=True)


with sync_playwright() as p:
    browser = p.chromium.launch()
    M = 1024
    square = render(browser, page_html(logo_svg(True)), M, M)            # full-bleed navy tile
    rounded = render(browser, page_html(logo_svg(True, True)), M, M)     # tile with rounded corners
    # Adaptive icon foreground: 108dp canvas, the 64-unit logo drawn on the central 66dp safe zone
    fg_master = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    inner = round(M * 66 / 108)
    fg_logo = render(browser, page_html(logo_svg(False)), inner, inner)
    fg_master.paste(fg_logo, ((M - inner) // 2, (M - inner) // 2), fg_logo)

    # Android launcher icons
    for folder, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        d = RES / f"mipmap-{folder}"
        save(rounded.resize((size, size), Image.LANCZOS), d / "ic_launcher.png")
        circle = square.resize((size, size), Image.LANCZOS)
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        circle.putalpha(mask.resize((size, size), Image.LANCZOS))
        save(circle, d / "ic_launcher_round.png")
        fg = round(size * 108 / 48)
        save(fg_master.resize((fg, fg), Image.LANCZOS), d / "ic_launcher_foreground.png")

    # Android splash screens (all densities and orientations the template ships)
    for png in RES.glob("drawable*/splash.png"):
        w, h = Image.open(png).size
        save(render(browser, splash_html(w, h), w, h), png, rgb=True)

    # iOS: 1024 App Store icon (no transparency) and the 2732 universal splash
    save(square, IOS / "AppIcon.appiconset" / "AppIcon-512@2x.png", rgb=True)
    splash = render(browser, splash_html(2732, 2732), 2732, 2732)
    for png in (IOS / "Splash.imageset").glob("*.png"):
        save(splash, png, rgb=True)

    # Store listing artwork (Google Play 512 icon)
    save(square.resize((512, 512), Image.LANCZOS), APP / "resources" / "play-store-icon-512.png", rgb=True)
    save(square, APP / "resources" / "icon-1024.png", rgb=True)
    save(render(browser, splash_html(1280, 1920), 1280, 1920), APP / "resources" / "splash-preview.png", rgb=True)
    browser.close()

# Adaptive icon background colour = brand navy
colors = RES / "values" / "ic_launcher_background.xml"
colors.write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{NAVY.upper()}</color>\n</resources>\n',
    encoding="utf-8",
)
print("Icons and splash screens written for Android and iOS.")
