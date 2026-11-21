// Автопроверка Kitchen Control (папка kitchen/): все экраны всех ролей + ключевые сценарии.
// Любая ошибка JavaScript = провал. Запуск: node tests/kitchen.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = http.createServer((q, s) => {
  let p = q.url.split("?")[0]; if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404).end(); return; }
  const t = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/json" }[path.extname(f)] ?? "application/octet-stream";
  s.writeHead(200, { "Content-Type": t + "; charset=utf-8" }).end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}/index.html`;
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : " " + extra}`); };

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errs = [];
async function open(query, vp = { width: 1180, height: 820 }) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(BASE + "?nosplash&" + query);
  await page.waitForSelector(".nav-i");
  return { ctx, page };
}
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("kc.v1")));

// 1. все экраны и вкладки всех ролей
for (const role of ["owner", "manager", "admin", "chef", "sous"]) {
  const { ctx, page } = await open("role=" + role);
  const navs = await page.$$eval(".nav-i", (e) => e.map((x) => x.dataset.r));
  for (const r of navs) {
    await page.click(`.nav-i[data-r="${r}"]`);
    for (const t of await page.$$eval(".seg button", (e) => e.map((x) => x.dataset.k))) await page.click(`.seg button[data-k="${t}"]`);
  }
  check(`роль «${role}»: открываются все экраны (${navs.length})`, navs.length >= 5);
  await ctx.close();
}

// 2. списание уменьшает остаток и пишется в журнал
{
  const { ctx, page } = await open("role=chef&route=stock");
  const before = (await page.evaluate(() => KC.S().products.find((p) => p.id === "p2").stock));
  await page.click('tr.rw[data-id="p2"]'); await page.click('[data-a="op"][data-t="waste"]');
  await page.click('.key[data-k="2"]'); await page.click('[data-a="opOk"]');
  const s = await state(page);
  check("списание: остаток уменьшился на 2 кг", s.products.find((p) => p.id === "p2").stock === before - 2);
  check("списание: запись в журнале движения", s.mv[0].type === "waste" && s.mv[0].pid === "p2");
  await ctx.close();
}

// 3. су-шеф → согласование → приёмка (одна сессия, смена роли через профиль)
{
  const { ctx, page } = await open("role=sous&route=orders");
  await page.click('[data-a="sendOrder"] >> nth=0');
  let s = await state(page);
  check("су-шеф: заявка уходит на согласование", s.orders[0].st === "pending");
  await page.click('[data-a="me"]'); await page.click('.sheet [data-a="role"][data-id="chef"]');
  await page.click('.nav-i[data-r="orders"]'); await page.click('.seg button[data-k="list"]');
  await page.click('[data-a="approve"] >> nth=0');
  s = await state(page);
  check("шеф согласовывает заявку → «в пути»", s.orders[0].st === "sent");
  const id = s.orders[0].id, pid = s.orders[0].items[0].pid, was = s.products.find((p) => p.id === pid).stock;
  await page.click(`[data-a="ord"][data-id="${id}"]`); await page.click('[data-a="receive"]');
  s = await state(page);
  check("приёмка добавляет товар на склад", s.products.find((p) => p.id === pid).stock > was && s.orders[0].st === "received");
  await ctx.close();
}

// 4. температура вне нормы требует действия; в норме — нет
{
  const { ctx, page } = await open("role=sous&route=control");
  await page.click('[data-a="temp"] >> nth=0');
  for (const k of ["9"]) await page.click(`.key[data-k="${k}"]`);
  check("замер вне нормы: «Записать» неактивна без действия", await page.$eval('[data-a="tempOk"]', (e) => e.classList.contains("off")));
  await page.click('[data-a="act"] >> nth=0');
  check("замер вне нормы: после выбора действия доступна", !(await page.$eval('[data-a="tempOk"]', (e) => e.classList.contains("off"))));
  await page.click('[data-a="tempOk"]');
  const s = await state(page);
  check("замер сохранён с действием", s.temps[0].log.at(-1).v === 9 && !!s.temps[0].log.at(-1).act);
  await ctx.close();
}

// 5. чек-лист: отметка и подпись
{
  const { ctx, page } = await open("role=sous&route=control&tab=lists");
  await page.click('.ck >> nth=7');
  let s = await state(page);
  check("чек-лист: пункт отмечается", s.checklists[0].done.includes(7));
  await ctx.close();
}

// 6. добавление позиции, сотрудника, подрядчика
{
  const { ctx, page } = await open("role=owner&route=stock");
  await page.click('[data-a="newProd"]'); await page.fill('input[name="name"]', "Сёмга тест"); await page.fill('input[name="stock"]', "5"); await page.click('[data-a="saveProd"]');
  await page.click('.nav-i[data-r="staff"]'); await page.click('[data-a="newEmp"]'); await page.fill('input[name="name"]', "Тест Тестов"); await page.click('[data-a="saveEmp"]');
  await page.click('.nav-i[data-r="vendors"]'); await page.click('[data-a="newVen"]'); await page.fill('input[name="name"]', "Тест-Подряд"); await page.click('[data-a="saveVen"]');
  const s = await state(page);
  check("форма: позиция добавлена", s.products.some((p) => p.name === "Сёмга тест" && p.stock === 5));
  check("форма: сотрудник добавлен", s.staff.some((e) => e.name === "Тест Тестов"));
  check("форма: подрядчик добавлен", s.vendors.some((v) => v.name === "Тест-Подряд"));
  await ctx.close();
}

// 7. права: су-шеф не видит денег; менеджер зала не согласует
{
  const { ctx, page } = await open("role=sous&route=stock");
  const txt = await page.$eval(".tbl", (e) => e.innerText);
  check("су-шеф: цены скрыты на складе", txt.includes("•••") && !txt.includes("₽"));
  await ctx.close();
}

// 8. планшет вертикально: нет горизонтальной прокрутки
{
  const { ctx, page } = await open("role=owner", { width: 820, height: 1180 });
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  check("вертикальный планшет: без горизонтальной прокрутки", ok);
  await ctx.close();
}

check("нет ошибок JavaScript в консоли", errs.length === 0, errs.join(" | "));
await browser.close(); server.close();
process.exit(results.every(Boolean) ? 0 : 1);
