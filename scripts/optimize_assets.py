"""Regenerate the optimised web assets in dist/assets from the originals in source-assets/.

    python scripts/optimize_assets.py

Requires Pillow, fontTools + brotli (WOFF2) and Python Playwright with Chromium (icons).
Outputs: *.webp photographs, og-image.jpg (1200x630 social card), WOFF2 fonts,
PNG app icons rendered from dist/assets/favicon.svg.
"""
from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'source-assets'
DEST = ROOT / 'dist' / 'assets'

# Photographs -> WebP
road = Image.open(SRC / 'gotrajet-road.png').convert('RGB')
road.save(DEST / 'gotrajet-road.webp', 'WEBP', quality=80, method=6)
for name in ['casablanca-coast', 'marrakech', 'fes']:
    im = Image.open(SRC / f'{name}.jpg').convert('RGB')
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    im.save(DEST / f'{name}.webp', 'WEBP', quality=78, method=6)

# Fonts -> WOFF2 (fonts.css is pointed at the .woff2 files)
for ttf in sorted((SRC / 'fonts-ttf').glob('font-*.ttf')):
    font = TTFont(ttf)
    font.flavor = 'woff2'
    font.save(DEST / (ttf.stem + '.woff2'))
css = (DEST / 'fonts.css').read_text(encoding='utf-8')
css = re.sub(r"url\((font-\d+)\.ttf\) format\('truetype'\)", r"url(\1.woff2) format('woff2')", css)
(DEST / 'fonts.css').write_text(css, encoding='utf-8')

# App icons from the SVG brand mark
from playwright.sync_api import sync_playwright
svg = (DEST / 'favicon.svg').read_text(encoding='utf-8')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page()
    for size, name, square in [(512, 'icon-512.png', False), (192, 'icon-192.png', False),
                               (180, 'apple-touch-icon.png', False), (512, 'icon-maskable-512.png', True)]:
        markup = svg.replace('rx="14"', 'rx="0"') if square else svg
        page.set_viewport_size({'width': size, 'height': size})
        page.set_content('<body style="margin:0">' + markup.replace('<svg ', f'<svg width="{size}" height="{size}" ') + '</body>')
        page.screenshot(path=str(DEST / name), omit_background=True, clip={'x': 0, 'y': 0, 'width': size, 'height': size})
    browser.close()

# Open Graph / social sharing card (1200x630) in brand colours
w, h = 1200, 630
scale = max(w / road.width, h / road.height)
bg = road.resize((round(road.width * scale), round(road.height * scale)), Image.LANCZOS)
left, top = (bg.width - w) // 2, (bg.height - h) // 2
card = bg.crop((left, top, left + w, top + h)).convert('RGBA')
shade = Image.new('RGBA', (w, h))
draw = ImageDraw.Draw(shade)
for x in range(w):
    draw.line([(x, 0), (x, h)], fill=(4, 30, 55, max(int(245 - 190 * x / w), 40)))
card = Image.alpha_composite(card, shade)
draw = ImageDraw.Draw(card)
bold = lambda size: ImageFont.truetype(str(SRC / 'fonts-ttf' / 'font-8.ttf'), size)  # Manrope ExtraBold
regular = ImageFont.truetype(str(SRC / 'fonts-ttf' / 'font-0.ttf'), 30)               # DM Sans Regular
mark = Image.open(DEST / 'icon-192.png').convert('RGBA').resize((60, 60), Image.LANCZOS)
card.paste(mark, (68, 74), mark)
draw.text((140, 76), 'GOTRA', font=bold(46), fill='white')
draw.text((140 + draw.textlength('GOTRA', font=bold(46)), 76), 'JET', font=bold(46), fill=(255, 134, 22))
for i, (line, colour) in enumerate([('Send parcels with', 'white'), ('travellers already', 'white'),
                                     ('on the road.', (255, 154, 56))]):
    draw.text((72, 230 + i * 76), line, font=bold(64), fill=colour)
draw.text((72, 490), 'Collaborative delivery · Morocco · FR · EN · AR', font=regular, fill=(202, 216, 229))
card.convert('RGB').save(DEST / 'og-image.jpg', 'JPEG', quality=84, optimize=True, progressive=True)

for p in sorted(DEST.iterdir()):
    if p.is_file():
        print(f'{p.name:26} {p.stat().st_size / 1024:8.1f} KB')
