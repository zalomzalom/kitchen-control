// Автопроверка Kitchen Control: все экраны всех ролей + ключевые сценарии.
// Любая ошибка JavaScript = провал. Запуск: node tests/kitchen.mjs
// Проверка синхронизации планшетов идёт только если задан KC_URL (адрес запущенного `wrangler dev --local` или выложенного сайта).
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
  let p = q.url.split("?")[0]; if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404).end(); return; }
  const t = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/json" }[path.extname(f)] ?? "application/octet-stream";
  s.writeHead(200, { "Content-Type": t + "; charset=utf-8" }).end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const BASE = (process.env.KC_URL || `http://localhost:${server.address().port}`) + "/index.html";
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : " " + extra}`); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errs = [];
async function open(query, vp = { width: 1180, height: 820 }, wait = true) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|404|409/.test(m.text())) errs.push(m.text()); });
  await page.goto(BASE + "?nosplash" + (query ? "&" + query : ""));
  if (wait) await page.waitForFunction(() => document.querySelector("#view") && document.querySelector("#view").children.length > 0);
  return { ctx, page };
}
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("kc.v1")));
const pinIn = async (page, pin) => { for (const k of pin) await page.click(`#gate [data-a="pk"][data-k="${k}"]`); };
// после первого входа по PIN показываются 3 подсказки — проходим их, как человек
const finishOnb = async (page) => { await page.waitForSelector(".onb"); for (let i = 0; i < 3; i++) await page.click('.sheet [data-a="onbNext"]'); await page.waitForFunction(() => !document.querySelector(".ov")); };

// 1. все экраны и вкладки всех ролей
for (const role of ["owner", "manager", "admin", "chef", "sous", "cook"]) {
  const { ctx, page } = await open("role=" + role);
  const navs = await page.$$eval(".nav-i", (e) => e.map((x) => x.dataset.r));
  for (const r of navs) {
    await page.evaluate((r) => KC.go(r), r);
    for (const t of await page.$$eval(".seg button", (e) => e.map((x) => x.dataset.k))) await page.click(`.seg button[data-k="${t}"]`);
  }
  check(`роль «${role}»: открываются все экраны (${navs.length})`, navs.length >= 3);
  await ctx.close();
}

// 2. списание уменьшает остаток, пишется в журнал; «Отменить» возвращает всё назад
{
  const { ctx, page } = await open("role=chef&route=stock");
  const before = await page.evaluate(() => KC.S().products.find((p) => p.id === "p2").stock);
  const mv0 = await page.evaluate(() => KC.S().mv.length);
  await page.click('tr.rw[data-id="p2"]'); await page.click('[data-a="op"][data-t="waste"]');
  await page.click('.key[data-k="2"]'); await page.click('[data-a="opOk"]');
  let s = await state(page);
  check("списание: остаток уменьшился на 2 кг", s.products.find((p) => p.id === "p2").stock === before - 2);
  check("списание: запись в журнале", s.mv[0].type === "waste" && s.mv[0].pid === "p2");
  await page.click('.toast [data-a="undo"]');
  s = await state(page);
  check("«Отменить» возвращает остаток и убирает запись", s.products.find((p) => p.id === "p2").stock === before && s.mv.length === mv0);
  await ctx.close();
}

// 3. су-шеф → шеф согласует (смена пользователя по PIN) → приёмка
{
  const { ctx, page } = await open("role=sous&route=orders");
  await page.click('[data-a="sendOrder"] >> nth=0');
  let s = await state(page);
  check("су-шеф: заказ уходит шефу на согласование", s.orders[0].st === "pending");
  await page.click('[data-a="me"]'); await page.click('.sheet [data-a="lock"]');
  await page.click('#gate [data-a="who"][data-id="chef"]'); await pinIn(page, "1111");
  await finishOnb(page);
  await page.evaluate(() => KC.go("orders", "list")); await page.click('[data-a="approve"] >> nth=0');
  s = await state(page);
  check("шеф согласует заказ → «в пути»", s.orders[0].st === "sent");
  const id = s.orders[0].id, pid = s.orders[0].items[0].pid, was = s.products.find((p) => p.id === pid).stock;
  await page.click(`[data-a="ord"][data-id="${id}"]`);
  await page.setInputFiles('input[data-photo="rcv"]', { name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector(".sheet .thumb.big"); await page.click('[data-a="receive"]');
  s = await state(page);
  check("приёмка: товар на складе, заказ закрыт", s.products.find((p) => p.id === pid).stock > was && s.orders[0].st === "received");
  check("приёмка: фото сохранено", !!s.orders[0].ph);
  await ctx.close();
}

// 4. вход по PIN
{
  const { ctx, page } = await open("", undefined, false);
  await page.click('#gate [data-a="who"][data-id="cook"]');
  await pinIn(page, "1234");
  check("PIN: неверный не пускает", !(await page.$(".act")) && /Неверный PIN/.test(await page.$eval("#gate", (e) => e.innerText)));
  await pinIn(page, "1111"); await page.waitForSelector(".act");
  check("PIN: верный пускает на главную повара", (await page.$$(".act")).length === 4);
  await finishOnb(page);
  check("подсказки при первом входе: помечены как просмотренные", (await state(page)).seen.cook === 1);
  await ctx.close();
}

// 5. повар: списать по поиску, голосовой разбор, фото
{
  const { ctx, page } = await open("role=cook");
  check("повар: нет бокового меню", await page.$eval("#app", (e) => e.classList.contains("noside")));
  await page.click('[data-a="pickProd"]'); await page.fill('input[name="pq"]', "свин");
  check("повар: поиск находит «Свинина»", (await page.$$eval(".sheet .li", (e) => e.map((x) => x.innerText).join(" "))).includes("Свинина"));
  await page.click('.sheet [data-a="op"] >> nth=0'); await page.click('.key[data-k="1"]');
  await page.setInputFiles('input[data-photo="op"]', { name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector(".sheet .thumb.big"); await page.click('[data-a="opOk"]');
  const s = await state(page);
  check("повар: списание с фото записано", s.mv[0].type === "waste" && !!s.mv[0].ph);
  const v = await page.evaluate(() => [KC.parseVoice("списать два килограмма свинины"), KC.parseVoice("списать 500 грамм говядины"), KC.parseVoice("взять 3 лосось")].map((x) => [x.p && x.p.id, x.q, x.t]));
  check("голос: «два кило свинины» → p2, 2", v[0][0] === "p2" && v[0][1] === 2 && v[0][2] === "waste", JSON.stringify(v));
  check("голос: «500 грамм говядины» → p1, 0.5", v[1][0] === "p1" && v[1][1] === 0.5, JSON.stringify(v));
  check("голос: «взять 3 лосось» → в работу", v[2][0] === "p6" && v[2][2] === "out", JSON.stringify(v));
  await ctx.close();
}

// 6. лента дел: у каждого дела есть кнопка, она работает
{
  const { ctx, page } = await open("role=owner");
  const n = await page.$$eval(".fi .end .btn", (e) => e.length);
  check("главная: у дел есть кнопки действий", n >= 4);
  await page.click('.fi [data-a="op"][data-t="waste"] >> nth=0');
  check("кнопка «Списать» в ленте открывает списание", /Списание/.test(await page.$eval(".sheet", (e) => e.innerText)));
  await ctx.close();
}

// 7. температура вне нормы требует действия
{
  const { ctx, page } = await open("role=sous&route=checks");
  await page.click('[data-a="temp"] >> nth=0'); await page.click('.key[data-k="9"]');
  check("замер вне нормы: «Записать» неактивна без действия", await page.$eval('[data-a="tempOk"]', (e) => e.classList.contains("off")));
  await page.click('[data-a="act"] >> nth=0');
  check("замер вне нормы: после выбора действия доступна", !(await page.$eval('[data-a="tempOk"]', (e) => e.classList.contains("off"))));
  await page.click('[data-a="tempOk"]');
  const s = await state(page);
  check("замер сохранён с действием", s.temps[0].log.at(-1).v === 9 && !!s.temps[0].log.at(-1).act);
  await ctx.close();
}

// 8. чек-лист
{
  const { ctx, page } = await open("role=sous&route=checks&tab=lists");
  await page.click(".ck >> nth=7");
  check("чек-лист: пункт отмечается", (await state(page)).checklists[0].done.includes(7));
  await ctx.close();
}

// 9. формы
{
  const { ctx, page } = await open("role=owner&route=stock");
  await page.click('[data-a="newProd"]'); await page.fill('input[name="name"]', "Сёмга тест"); await page.fill('input[name="stock"]', "5"); await page.click('[data-a="saveProd"]');
  await page.evaluate(() => KC.go("team")); await page.click('[data-a="newEmp"]'); await page.fill('input[name="name"]', "Тест Тестов"); await page.click('[data-a="saveEmp"]');
  await page.evaluate(() => KC.go("vendors")); await page.click('[data-a="newVen"]'); await page.fill('input[name="name"]', "Тест-Подряд"); await page.click('[data-a="saveVen"]');
  const s = await state(page);
  check("форма: продукт добавлен", s.products.some((p) => p.name === "Сёмга тест" && p.stock === 5));
  check("форма: сотрудник добавлен", s.staff.some((e) => e.name === "Тест Тестов"));
  check("форма: подрядчик добавлен", s.vendors.some((v) => v.name === "Тест-Подряд"));
  await ctx.close();
}

// 10. права
{
  const { ctx, page } = await open("role=sous&route=stock");
  const txt = await page.$eval(".tbl", (e) => e.innerText);
  check("су-шеф: цены скрыты на складе", txt.includes("•••") && !txt.includes("₽"));
  await ctx.close();
}

// 11. вертикальный планшет и телефон: нет горизонтальной прокрутки, кнопки ≥ 44 px
{
  const { ctx, page } = await open("role=owner", { width: 820, height: 1180 });
  check("вертикальный планшет: без горизонтальной прокрутки", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}
{
  const { ctx, page } = await open("role=owner", { width: 390, height: 844 });
  const wide = [];
  for (const [r, t] of [["home"], ["stock"], ["stock", "exp"], ["stock", "log"], ["orders"], ["orders", "list"], ["orders", "sup"], ["money"], ["money", "dishes"], ["team"], ["team", "sched"], ["checks"], ["checks", "lists"], ["checks", "con"]]) {
    await page.evaluate(([r, t]) => KC.go(r, t), [r, t]);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector("#main").scrollWidth > document.querySelector("#main").clientWidth + 1)) wide.push(r + (t ? ":" + t : ""));
  }
  check("телефон: нет горизонтальной прокрутки", wide.length === 0, wide.join(","));
  check("телефон: кнопки нижнего меню ≥ 44 px", (await page.$$eval(".nav-i", (e) => e.filter((x) => x.getBoundingClientRect().height < 44).length)) === 0);
  await ctx.close();
}
{
  const { ctx, page } = await open("role=cook", { width: 390, height: 844 });
  check("телефон, повар: четыре крупные кнопки без прокрутки вбок", (await page.$$(".act")).length === 4 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}

// 12. синхронизация двух планшетов (если есть сервер)
if (process.env.KC_URL) {
  const A = await open("role=owner"), B = await open("role=chef");
  await A.page.click('[data-a="me"]'); await A.page.click('[data-a="syncOn"]'); await A.page.waitForSelector(".code");
  const code = (await A.page.$eval(".code", (e) => e.innerText)).trim();
  await B.page.click('[data-a="me"]'); await B.page.click('[data-a="syncJoin"]'); await B.page.fill('input[name="code"]', code); await B.page.click('[data-a="syncJoinOk"]');
  await B.page.waitForFunction(() => KC.S().sync && KC.S().sync.rev > 0);
  await A.page.click('[data-a="close"]');
  await A.page.evaluate(() => KC.go("stock")); await A.page.click('tr.rw[data-id="p2"]'); await A.page.click('[data-a="op"][data-t="waste"]'); await A.page.click('.key[data-k="3"]'); await A.page.click('[data-a="opOk"]');
  await A.page.waitForTimeout(1800);
  await B.page.evaluate(() => KC.poll()); await B.page.waitForTimeout(500);
  const a = (await state(A.page)).products.find((p) => p.id === "p2").stock, b = (await state(B.page)).products.find((p) => p.id === "p2").stock;
  check("синхронизация: списание на одном планшете видно на другом", a === b && a < 9, `a=${a} b=${b}`);
  check("синхронизация: роль и тема остаются своими", (await state(B.page)).role === "chef");
  await A.ctx.close(); await B.ctx.close();
}

check("нет ошибок JavaScript в консоли", errs.length === 0, errs.join(" | "));
await browser.close(); server.close();
process.exit(results.every(Boolean) ? 0 : 1);
