"""Download public visual assets into the static bundle. No uploads or credentials."""
from pathlib import Path
import urllib.request
from concurrent.futures import ThreadPoolExecutor

DEST = Path(__file__).resolve().parents[1] / 'dist' / 'assets'
URLS = {
    'hero.jpg': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85',
    'casablanca-coast.jpg': 'https://images.unsplash.com/photo-1706203644187-a719449587bb?auto=format&fit=crop&w=800&q=85',
    'marrakech.jpg': 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=800&q=85',
    'fes.jpg': 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=800&q=85',
}

def download(item):
    name, url = item
    if (DEST / name).exists():
        return
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read()
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / name).write_bytes(data)
    print(name, len(data))

with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(download, URLS.items()))

license_dir = DEST / 'licenses'
license_dir.mkdir(exist_ok=True)
for family in ['dmsans', 'manrope', 'notosansarabic']:
    dest = license_dir / (family + '-OFL.txt')
    if not dest.exists():
        url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + family + '/OFL.txt'
        with urllib.request.urlopen(url, timeout=30) as response:
            dest.write_bytes(response.read())
        print(dest.name)

# Bundle Google Fonts as local assets, including Arabic glyphs.
import re
if (DEST / 'fonts.css').exists():
    raise SystemExit(0)
font_url = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap'
req = urllib.request.Request(font_url, headers={'User-Agent':'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=30) as response:
    css = response.read().decode('utf-8')
for i, url in enumerate(dict.fromkeys(re.findall(r'url\((https[^)]+)\)', css))):
    name = 'font-' + str(i) + ('.woff2' if '.woff2' in url else '.ttf')
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read()
    (DEST / name).write_bytes(data)
    css = css.replace(url, name)
    print(name, len(data))
(DEST / 'fonts.css').write_text(css, encoding='utf-8')
