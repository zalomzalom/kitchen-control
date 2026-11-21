// Собирает весь сайт в один Worker: dist/worker.js. Запуск: node build.mjs
import fs from "node:fs";
const FILES = { "/": "index.html", "/index.html": "index.html", "/app.js": "app.js", "/core.js": "core.js", "/data.js": "data.js", "/views.js": "views.js", "/style.css": "style.css", "/icon.svg": "icon.svg", "/manifest.webmanifest": "manifest.webmanifest" };
const CT = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", webmanifest: "application/manifest+json" };
const site = {};
for (const [url, f] of Object.entries(FILES)) site[url] = { t: CT[f.split(".").pop()] + "; charset=utf-8", b: fs.readFileSync(f, "utf8") };
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/worker.js", `const SITE = ${JSON.stringify(site)};
export default {
  async fetch(req) {
    const p = new URL(req.url).pathname;
    const f = SITE[p] || SITE[p.replace(/\\/$/, "")];
    if (!f || (req.method !== "GET" && req.method !== "HEAD")) return new Response("Not found", { status: 404 });
    return new Response(req.method === "HEAD" ? null : f.b, { headers: { "Content-Type": f.t, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" } });
  },
};
`);
console.log("dist/worker.js", fs.statSync("dist/worker.js").size, "bytes");
