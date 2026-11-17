// Serves www/ to try the app in a browser (and install it as a web app): http://127.0.0.1:4174
// Usage: npm run serve        (PORT and HOST environment variables are optional)
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const WWW = join(dirname(fileURLToPath(import.meta.url)), "..", "www");
const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "127.0.0.1";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(WWW, path));
  if (!file.startsWith(WWW)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }
  const size = statSync(file).size;
  const headers = {
    "Content-Type": TYPES[extname(file)] || "application/octet-stream",
    "Cache-Control": file.endsWith("sw.js") || file.endsWith(".html") ? "no-cache" : "public, max-age=3600",
    "Accept-Ranges": "bytes",
  };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (range) {
    const start = Number(range[1] || 0);
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, "Content-Length": size });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => console.log(`GOTRAJET app: http://${HOST}:${PORT}  (Ctrl+C to stop)`));
