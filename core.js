/* Kitchen Control — ядро: состояние, роли, расчёты, компоненты. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const QS = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'kc.v1';

/* ───── состояние ───── */
let S;
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) return j; } catch (e) {} return null; };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const pad = n => String(n).padStart(2, '0');
const isoD = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const day = n => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() + n); return isoD(x); };
const addDays = (iso, n) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); return isoD(x); };
const dd = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(day(0) + 'T12:00:00')) / 864e5);
S = load() || window.KC_SEED();
S.checklists.forEach(c => { if (c.date !== day(0)) { c.done = []; c.date = day(0); c.by = ''; c.at = ''; } });

/* ───── роли ───── */
const ROLES = {
  owner:   { n: 'Руководитель', user: 'e1', ic: 'crown', d: 'Финансы, себестоимость, подрядчики и общая картина по ресторану', money: 1, approve: 1, staffEdit: 1, vendorEdit: 1,
    nav: ['home', 'reports', 'stock', 'orders', 'recipes', 'staff', 'vendors', 'control'], kpis: ['fc', 'waste7', 'spend7', 'stockValue'],
    blocks: [['g21', ['attention', 'shifts']], ['g12', ['vendorsNext', 'trend']]] },
  manager: { n: 'Управляющий', user: 'e2', ic: 'clip', d: 'Смены, закупки, контроль санитарии и отклонений', money: 1, approve: 1, staffEdit: 1, vendorEdit: 1,
    nav: ['home', 'reports', 'stock', 'orders', 'recipes', 'staff', 'vendors', 'control'], kpis: ['onShift', 'fc', 'waste7', 'vendorsDue'],
    blocks: [['g21', ['attention', 'shifts']], ['g2', ['checklists', 'vendorsNext']]] },
  admin:   { n: 'Менеджер', user: 'e3', ic: 'users', d: 'График команды, заявки, визиты подрядчиков', money: 1, approve: 0, staffEdit: 1, vendorEdit: 1,
    nav: ['home', 'orders', 'staff', 'vendors', 'stock', 'control'], kpis: ['onShift', 'orders', 'vendorsDue', 'medbooks'],
    blocks: [['g21', ['attention', 'shifts']], ['g2', ['ordersMini', 'vendorsNext']]] },
  chef:    { n: 'Шеф-повар', user: 'e4', ic: 'chef', d: 'Склад, тех. карты, себестоимость блюд, списания', money: 1, approve: 1, staffEdit: 0, vendorEdit: 0,
    nav: ['home', 'stock', 'orders', 'recipes', 'control', 'staff'], kpis: ['low', 'expiring', 'temps', 'openCl'],
    blocks: [['g21', ['attention', 'expiringList']], ['g2', ['tempsMini', 'shifts']]] },
  sous:    { n: 'Су-шеф', user: 'e5', ic: 'flame', d: 'Приёмка, сроки годности, температурный журнал, чек-листы', money: 0, approve: 0, staffEdit: 0, vendorEdit: 0,
    nav: ['home', 'stock', 'orders', 'recipes', 'control'], kpis: ['low', 'expiring', 'temps', 'openCl'],
    blocks: [['g21', ['attention', 'checklists']], ['g2', ['expiringList', 'tempsMini']]] },
};
const NAV = { home: ['Обзор', 'home'], reports: ['Аналитика', 'chart'], stock: ['Склад', 'box'], orders: ['Закупки', 'cart'], recipes: ['Тех. карты', 'chef'], staff: ['Команда', 'users'], vendors: ['Подрядчики', 'truck'], control: ['Контроль', 'shield'] };
const R = () => ROLES[S.role] || ROLES.owner;
const me = () => S.staff.find(e => e.id === R().user);
const $money = () => !!R().money;

/* ───── иконки ───── */
const IC = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  chef: '<path d="M6 14a4 4 0 0 1-1-7.9A5 5 0 0 1 12 4a5 5 0 0 1 7 2.1A4 4 0 0 1 18 14v6H6z"/><path d="M6 17h12"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c2.6 0 4.5 1.8 4.5 4.5"/>',
  truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>',
  therm: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  chart: '<path d="M3 20h18"/><path d="M6 16v-5"/><path d="M11 16V5"/><path d="M16 16v-8"/><path d="M21 16v-3"/>',
  bell: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  alert: '<path d="M12 3.5l10 17.5H2z"/><path d="M12 10v5M12 18v.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/>',
  arrow: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  send: '<path d="M3 11l18-8-8 18-2-8z"/>', inbox: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  bug: '<ellipse cx="12" cy="14" rx="4" ry="5.5"/><path d="M9 9a3 3 0 0 1 6 0"/><path d="M4 12h4M16 12h4M5 19l3-2M19 19l-3-2M5 6l3 2M19 6l-3 2"/>',
  shirt: '<path d="M8 3L3 7l3 3 2-1.5V21h8V8.5L18 10l3-3-5-4a4 4 0 0 1-8 0z"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.5-8.5"/><path d="M14.5 6.5l-1-3 3-.5 1 3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  doc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  knife: '<path d="M4 20L15 9c3-3 5-4 5-4s-.5 3-3 6L9 16z"/><path d="M4 20l3-3"/>',
};
const ic = (n, s = 22) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ''}</svg>`;

/* ───── форматирование ───── */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NB = ' ';
const grp = v => Math.round(v).toLocaleString('ru-RU').replace(/ /g, NB);
const n1 = (v, d = 2) => { const r = Math.round(v * 10 ** d) / 10 ** d; return String(r).replace('.', ','); };
const rub = v => $money() ? grp(v) + NB + '₽' : '•••';
const pl = (n, a) => { n = Math.abs(n); const m = n % 100, k = n % 10; return a[m > 10 && m < 20 ? 2 : k > 1 && k < 5 ? 1 : k === 1 ? 0 : 2]; };
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const dm = iso => { const d = new Date(iso + 'T12:00:00'); return d.getDate() + NB + MON[d.getMonth()]; };
const rel = iso => { const d = dd(iso); return d === 0 ? 'сегодня' : d === 1 ? 'завтра' : d === -1 ? 'вчера' : d > 0 ? 'через ' + d + NB + pl(d, ['день', 'дня', 'дней']) : -d + NB + pl(d, ['день', 'дня', 'дней']) + ' назад'; };
const agoTs = ts => { const m = Math.round((Date.now() - ts) / 6e4); return m < 2 ? 'только что' : m < 60 ? m + NB + 'мин назад' : m < 1440 ? Math.floor(m / 60) + NB + 'ч назад' : Math.floor(m / 1440) + NB + 'д назад'; };
const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const FM = { int: v => grp(v), dec1: v => n1(v, 1), rub: v => grp(v) + NB + '₽', pct: v => n1(v, 1) };
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const ini = n => n.split(' ').map(w => w[0]).slice(0, 2).join('');
const avatar = (e, cls = '') => `<div class="avatar ${e.on ? 'on' : ''} ${cls}" style="--h:${hue(e.name)}">${ini(e.name)}</div>`;
const toneOf = t => ({ bd: 'bd', wn: 'wn', ok: 'ok', in: 'in', ac: 'ac' }[t] || '');

/* ───── расчёты ───── */
const prod = id => S.products.find(p => p.id === id);
const vend = id => S.vendors.find(v => v.id === id);
const emp = id => S.staff.find(e => e.id === id);
const nextVisit = c => addDays(c.last, c.freq);
const pStatus = p => p.stock <= 0 ? 'bd' : p.stock < p.min * .5 ? 'bd' : p.stock < p.min ? 'wn' : 'ok';
const lowList = () => S.products.filter(p => p.stock < p.min);
const expList = (days) => S.products.filter(p => p.stock > 0 && dd(p.exp) <= days).sort((a, b) => a.exp.localeCompare(b.exp));
const expChip = p => { const d = dd(p.exp); return d <= 0 ? ['bd', 'Истёк'] : d <= 2 ? ['bd', d + NB + pl(d, ['день', 'дня', 'дней'])] : d <= 5 ? ['wn', d + NB + 'дн.'] : ['', 'до ' + dm(p.exp)]; };
const rCost = r => r.ing.reduce((s, i) => s + (prod(i.pid)?.price || 0) * i.q, 0);
const rFC = r => rCost(r) / r.price * 100;
const rPortions = r => Math.max(0, Math.min(...r.ing.map(i => Math.floor((prod(i.pid)?.stock || 0) / i.q + 1e-9))));
const menuFC = () => S.recipes.reduce((s, r) => s + rFC(r), 0) / S.recipes.length;
const fcTone = v => v <= S.targetFC ? 'ok' : v <= S.targetFC + 5 ? 'wn' : 'bd';
const wasteMv = (days) => S.mv.filter(m => m.type === 'waste' && Date.now() - m.ts < days * 864e5);
const mvCost = m => (prod(m.pid)?.price || 0) * m.qty;
const stockValue = () => S.products.reduce((s, p) => s + p.stock * p.price, 0);
const oSum = o => o.items.reduce((s, i) => s + i.q * i.price, 0);
const inFlight = pid => S.orders.some(o => (o.st === 'sent' || o.st === 'pending') && o.items.some(i => i.pid === pid));
const dow = () => (new Date().getDay() + 6) % 7;
const todayShift = e => e.week[dow()];
const tLast = t => t.log[t.log.length - 1];
const tOk = (t, v = tLast(t).v) => v >= t.lo && v <= t.hi;
const clPct = c => c.done.length / c.items.length;
const medState = e => { if (e.med === null) return null; const d = dd(e.med); return d < 0 ? ['bd', 'Мед. книжка просрочена'] : d <= 30 ? ['wn', 'Мед. книжка: ' + d + NB + 'дн.'] : ['ok', 'Мед. книжка до ' + dm(e.med)]; };
const sugQty = p => { const need = Math.max(p.min * 2 - p.stock, p.min); return ['кг', 'л'].includes(p.unit) ? Math.ceil(need * 2) / 2 : Math.ceil(need); };
const stepOf = p => ['кг', 'л'].includes(p.unit) ? .5 : 1;

/* ───── уведомления «требует внимания» ───── */
function alerts() {
  const a = [];
  S.temps.filter(t => !tOk(t)).forEach(t => a.push({ s: 0, tone: 'bd', ic: 'therm', t: t.name + ': ' + n1(tLast(t).v, 1) + '°', d: 'Норма ' + t.lo + '…' + t.hi + '° · ' + agoTs(tLast(t).ts), go: 'control', tab: 'temps' }));
  const e0 = expList(1);
  if (e0.length) a.push({ s: 0, tone: 'bd', ic: 'clock', t: 'Срок истекает сегодня-завтра: ' + e0.length + NB + pl(e0.length, ['позиция', 'позиции', 'позиций']), d: e0.slice(0, 3).map(p => p.name).join(', '), go: 'stock', tab: 'exp' });
  S.staff.filter(e => e.med !== null && dd(e.med) < 0).forEach(e => a.push({ s: 0, tone: 'bd', ic: 'doc', t: e.name + ': мед. книжка просрочена', d: 'С ' + dm(e.med) + ' · не допускать к работе', go: 'staff', emp: e.id }));
  S.vendors.filter(v => v.kind === 'contractor' && dd(nextVisit(v)) < 0).forEach(v => a.push({ s: 0, tone: 'bd', ic: 'truck', t: v.name + ': визит просрочен', d: v.svc + ' · ' + rel(nextVisit(v)), go: 'vendors', ven: v.id }));
  const lo = lowList();
  if (lo.length) a.push({ s: 1, tone: 'wn', ic: 'box', t: 'Ниже минимума: ' + lo.length + NB + pl(lo.length, ['позиция', 'позиции', 'позиций']), d: lo.slice(0, 3).map(p => p.name).join(', ') + (lo.length > 3 ? '…' : ''), go: 'orders' });
  const e2 = expList(4).filter(p => dd(p.exp) > 1);
  if (e2.length) a.push({ s: 1, tone: 'wn', ic: 'clock', t: 'Скоро срок годности: ' + e2.length + NB + pl(e2.length, ['позиция', 'позиции', 'позиций']), d: e2.slice(0, 3).map(p => p.name).join(', '), go: 'stock', tab: 'exp' });
  S.staff.filter(e => e.med !== null && dd(e.med) >= 0 && dd(e.med) <= 30).forEach(e => a.push({ s: 1, tone: 'wn', ic: 'doc', t: e.name + ': мед. книжка кончается', d: 'Через ' + dd(e.med) + NB + pl(dd(e.med), ['день', 'дня', 'дней']) + ' · ' + e.pos, go: 'staff', emp: e.id }));
  S.vendors.filter(v => v.kind === 'contractor' && dd(v.till) <= 30).forEach(v => a.push({ s: 1, tone: 'wn', ic: 'doc', t: v.name + ': договор заканчивается', d: dd(v.till) + NB + pl(dd(v.till), ['день', 'дня', 'дней']) + ' до ' + dm(v.till), go: 'vendors', ven: v.id }));
  S.orders.filter(o => o.st === 'sent' && dd(o.eta) <= 0).forEach(o => a.push({ s: 2, tone: 'in', ic: 'inbox', t: 'Ждём поставку: ' + vend(o.sup).name, d: 'Сегодня · ' + o.items.length + NB + pl(o.items.length, ['позиция', 'позиции', 'позиций']), go: 'orders', tab: 'list' }));
  S.orders.filter(o => o.st === 'pending').forEach(o => a.push({ s: 2, tone: 'in', ic: 'send', t: 'Заявка ждёт согласования: ' + vend(o.sup).name, d: emp(o.by)?.name || '', go: 'orders', tab: 'list' }));
  return a.sort((x, y) => x.s - y.s);
}

/* ───── компоненты ───── */
const chip = (t, label, icon) => `<span class="chip ${t}">${icon ? ic(icon, 14) : ''}${label}</span>`;
const ring = (p, label = '', tone = '', size = 64) => `<div class="ring ${tone}" style="width:${size}px;height:${size}px"><svg viewBox="0 0 64 64"><circle class="rb" cx="32" cy="32" r="26"/><circle class="rf" cx="32" cy="32" r="26" style="--p:${Math.max(0, Math.min(1, p)).toFixed(3)}"/></svg><b>${label}</b></div>`;
const bar = (p, tone = '') => `<div class="bar ${tone}"><i style="--p:${Math.max(0.02, Math.min(1, p)).toFixed(3)}"></i></div>`;
const stars = n => `<span class="stars">${[1, 2, 3, 4, 5].map(i => `<span class="${i > n ? 'off' : ''}">${ic('star', 15).replace('fill="none"', 'fill="currentColor"')}</span>`).join('')}</span>`;
const count = (v, f, unit = '') => `<b data-count="${v}" data-fmt="${f}">${FM[f](v)}</b>${unit ? `<small>${unit}</small>` : ''}`;
function spark(vals, w = 110, h = 44) {
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
  const pts = vals.map((v, i) => [i * (w - 6) / (vals.length - 1) + 3, h - 6 - (v - mn) / sp * (h - 12)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".35"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs><path class="ar" fill="url(#sg)" d="${d} L${w - 3} ${h} L3 ${h}Z"/><path class="ln" pathLength="1" d="${d}"/></svg>`;
}
function smooth(pts) {
  let d = 'M' + pts[0][0] + ' ' + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function lineChart(vals, labels, target, unit = '%') {
  const W = 520, H = 230, L = 38, Rr = 14, T = 16, B = 30;
  const lo = Math.floor(Math.min(...vals, target ?? 99) - 2), hi = Math.ceil(Math.max(...vals, target ?? 0) + 2);
  const X = i => L + i * (W - L - Rr) / (vals.length - 1), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const pts = vals.map((v, i) => [X(i), Y(v)]);
  const ticks = [lo, lo + (hi - lo) / 2, hi].map(v => Math.round(v));
  return `<div class="cht"><svg viewBox="0 0 ${W} ${H}">${ticks.map(v => `<line class="gl" x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${v}${unit}</text>`).join('')}
    ${target != null ? `<line class="tg" x1="${L}" x2="${W - Rr}" y1="${Y(target)}" y2="${Y(target)}"/><text x="${W - Rr}" y="${Y(target) - 7}" text-anchor="end" style="fill:var(--ok)">цель ${target}${unit}</text>` : ''}
    <path class="ln" pathLength="1" d="${smooth(pts)}"/>
    ${pts.map((p, i) => `<circle class="dt ${i === pts.length - 1 ? 'last' : ''}" style="animation-delay:${.5 + i * .12}s" cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 6 : 4.5}"/>`).join('')}
    ${labels.map((l, i) => i % (labels.length > 6 ? 2 : 1) === 0 || i === labels.length - 1 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${l}</text>` : '').join('')}</svg></div>`;
}
function barChart(vals, labels, unit = '') {
  const W = 440, H = 220, L = 10, T = 22, B = 28, mx = Math.max(...vals) * 1.12, bw = (W - L * 2) / vals.length;
  return `<div class="cht"><svg viewBox="0 0 ${W} ${H}">${vals.map((v, i) => { const h = v / mx * (H - T - B), x = L + i * bw + bw * .18; return `<rect class="cb ${i === vals.length - 1 ? 'last' : ''}" style="animation-delay:${i * .08}s" x="${x}" y="${H - B - h}" width="${bw * .64}" height="${h}" rx="9"/><text x="${x + bw * .32}" y="${H - B - h - 7}" text-anchor="middle" style="fill:var(--tx);font-weight:700">${n1(v, 0)}</text><text x="${x + bw * .32}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`; }).join('')}</svg></div>`;
}
const PAL = ['#ff7a3d', '#ffb347', '#62aaff', '#46d28a', '#c78bff', '#ff6b9a', '#8aa0b5'];
function donut(items, centerTop, centerSub) {
  const tot = items.reduce((s, i) => s + i.v, 0) || 1; let off = 25;
  return `<div class="dn"><svg viewBox="0 0 42 42">${items.map((it, i) => { const p = it.v / tot * 100, o = off; off -= p; return `<circle cx="21" cy="21" r="15.915" stroke="${PAL[i % PAL.length]}" stroke-dasharray="${Math.max(0, p - .8).toFixed(2)} ${(100 - p + .8).toFixed(2)}" stroke-dashoffset="${o.toFixed(2)}" style="animation-delay:${i * .12}s"/>`; }).join('')}</svg><div class="c"><div><b>${centerTop}</b><small>${centerSub}</small></div></div></div>`;
}
const legend = items => `<div class="lgd">${items.map((it, i) => `<div><i style="background:${PAL[i % PAL.length]}"></i>${esc(it.n)}<b>${it.t}</b></div>`).join('')}</div>`;

window.KC = { S: () => S, set: s => { S = s; }, save, $, $$, QS, reduced, ROLES, NAV, R, me, $money, ic, IC, esc, NB, grp, n1, rub, pl, dm, rel, agoTs, hm, FM, hue, ini, avatar, day, addDays, dd, isoD, prod, vend, emp, nextVisit, pStatus, lowList, expList, expChip, rCost, rFC, rPortions, menuFC, fcTone, wasteMv, mvCost, stockValue, oSum, inFlight, dow, todayShift, tLast, tOk, clPct, medState, sugQty, stepOf, alerts, chip, ring, bar, stars, count, spark, lineChart, barChart, donut, legend, PAL, toneOf, pad };
})();
