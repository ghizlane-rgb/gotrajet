// Builds www/ (the app's web content) from the website in ../dist, so the app is always the same as the site.
// Adds the mobile layer from src/: css/mobile.css, js/mobile.js and an offline service worker (sw.js).
// Usage: npm run build
import { createHash } from "node:crypto";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(APP, "..", "dist");
const SRC = join(APP, "src");
const WWW = join(APP, "www");

if (!existsSync(join(SITE, "index.html"))) {
  console.error(`Website not found: ${SITE}\\index.html`);
  process.exit(1);
}

// 1. Fresh copy of the website
rmSync(WWW, { recursive: true, force: true });
cpSync(SITE, WWW, { recursive: true });

// 2. Mobile layer
cpSync(join(SRC, "mobile.css"), join(WWW, "css", "mobile.css"));
cpSync(join(SRC, "mobile.js"), join(WWW, "js", "mobile.js"));

// 3. Page shell: load the mobile layer after the website's own CSS and JS
const indexPath = join(WWW, "index.html");
let html = readFileSync(indexPath, "utf8");
function insertAfter(anchor, addition) {
  if (!html.includes(anchor)) throw new Error(`index.html: "${anchor}" not found — update scripts/build-www.mjs`);
  html = html.replace(anchor, anchor + addition);
}
insertAfter('<link rel="stylesheet" href="css/site.css" />', '\n    <link rel="stylesheet" href="css/mobile.css" />');
insertAfter('<script src="js/server.js"></script>', '\n    <script src="js/mobile.js"></script>');
insertAfter('<meta name="apple-mobile-web-app-capable" content="yes" />', '\n    <meta name="mobile-web-app-capable" content="yes" />');
writeFileSync(indexPath, html);

// 4. Web app manifest: same as the website, with a stable id and the app opening full screen
const manifestPath = join(WWW, "manifest.webmanifest");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.id = "./";
manifest.display = "standalone";
manifest.display_override = ["standalone", "minimal-ui"];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// 5. Offline service worker with the list of files to keep (videos are streamed, licences are not needed)
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(relative(WWW, full).split(sep).join("/"));
  }
})(WWW);
const skip = (f) => f.startsWith("assets/video/") || f.startsWith("assets/licenses/") || f === "assets/og-image.jpg" || f === "sw.js";
const precache = files.filter((f) => !skip(f)).sort();
const hash = createHash("sha256");
for (const f of precache) hash.update(f).update(readFileSync(join(WWW, f)));
const version = hash.digest("hex").slice(0, 12);
const sw = readFileSync(join(SRC, "sw.js"), "utf8")
  .replace("__VERSION__", version)
  .replace("__FILES__", JSON.stringify(["./", ...precache], null, 2));
writeFileSync(join(WWW, "sw.js"), sw);

const size = precache.reduce((n, f) => n + statSync(join(WWW, f)).size, 0);
console.log(`www/ built from ../dist — ${files.length + 1} files, ${precache.length} kept offline (${(size / 1048576).toFixed(1)} MB), version ${version}`);
