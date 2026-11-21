// Собирает весь сайт и сервер синхронизации в один Worker: dist/worker.js. Запуск: node build.mjs
import fs from "node:fs";
const FILES = { "/": "index.html", "/index.html": "index.html", "/app.js": "app.js", "/core.js": "core.js", "/data.js": "data.js", "/views.js": "views.js", "/style.css": "style.css", "/icon.svg": "icon.svg", "/manifest.webmanifest": "manifest.webmanifest" };
const CT = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", webmanifest: "application/manifest+json" };
const site = {};
for (const [url, f] of Object.entries(FILES)) site[url] = { t: CT[f.split(".").pop()] + "; charset=utf-8", b: fs.readFileSync(f, "utf8") };
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/worker.js", `const SITE = ${JSON.stringify(site)};
const J = { "Content-Type": "application/json", "Cache-Control": "no-store" };

// Одно «заведение» = один Durable Object (код заведения — его имя). Хранит последнюю версию данных и номер версии.
// Запись принимается только если планшет видел последнюю версию (иначе 409 и он забирает свежие данные).
export class Venue {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS s(id INTEGER PRIMARY KEY CHECK(id=1), rev INTEGER NOT NULL, data TEXT NOT NULL)");
  }
  async fetch(req) {
    const u = new URL(req.url);
    if (req.method === "PUT") {
      const b = await req.json();
      const row = [...this.sql.exec("SELECT rev, data FROM s WHERE id=1")][0], cur = row ? row.rev : 0;
      if ((+b.base || 0) !== cur) return new Response(JSON.stringify({ rev: cur, data: row ? JSON.parse(row.data) : null }), { status: 409, headers: J });
      this.sql.exec("INSERT INTO s(id, rev, data) VALUES(1, ?, ?) ON CONFLICT(id) DO UPDATE SET rev=excluded.rev, data=excluded.data", cur + 1, JSON.stringify(b.data));
      return new Response(JSON.stringify({ rev: cur + 1 }), { headers: J });
    }
    const row = [...this.sql.exec("SELECT rev, data FROM s WHERE id=1")][0];
    if (!row) return new Response("{}", { status: 404, headers: J });
    if (row.rev <= (+u.searchParams.get("since") || 0)) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return new Response(JSON.stringify({ rev: row.rev, data: JSON.parse(row.data) }), { headers: J });
  }
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname;
    if (p === "/api/state") {
      const code = u.searchParams.get("code") || "";
      if (!/^[A-Z2-9]{8}$/.test(code) || (req.method !== "GET" && req.method !== "PUT")) return new Response("Bad request", { status: 400 });
      if (req.method === "PUT" && +(req.headers.get("content-length") || 0) > 1900000) return new Response("Too large", { status: 413 });
      return env.VENUE.get(env.VENUE.idFromName(code)).fetch(req);
    }
    const f = SITE[p] || SITE[p.replace(/\\/$/, "")];
    if (!f || (req.method !== "GET" && req.method !== "HEAD")) return new Response("Not found", { status: 404 });
    return new Response(req.method === "HEAD" ? null : f.b, { headers: { "Content-Type": f.t, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" } });
  },
};
`);
console.log("dist/worker.js", fs.statSync("dist/worker.js").size, "bytes");
