/* Kitchen Control — экраны. Каждый экран возвращает HTML; интерактивность — через data-a (см. app.js). */
(() => {
const K = window.KC, S = K.S();
const { ic, esc, NB, grp, n1, rub, pl, dm, rel, agoTs, hm, avatar, dd, day, prod, vend, emp, nextVisit, pStatus, lowList, expList, expChip, rCost, rFC, rPortions, menuFC, fcTone, wasteMv, mvCost, stockValue, oSum, inFlight, todayShift, tLast, tOk, clPct, medState, sugQty, stepOf, alerts, chip, ring, bar, stars, count, spark, lineChart, barChart, donut, legend, PAL, R, me, $money } = K;

const ui = K.ui = { route: 'home', tab: { stock: 'list', orders: 'rec', staff: 'team', vendors: 'con', control: 'temps', recipes: '' }, q: '', cat: 'Все', f: 'all', draft: {}, allOrders: false, alerts: [] };
const TYPE = { clean: ['spark', 'Клининг'], vent: ['wind', 'Вентиляция'], pest: ['bug', 'Дезинсекция'], waste: ['trash', 'Отходы'], laundry: ['shirt', 'Прачечная'], tech: ['wrench', 'Техника'] };
K.TYPE = TYPE;
const seg = (view, items) => `<div class="seg" data-s>${items.map(([k, l]) => `<button class="${k === ui.tab[view] ? 'on' : ''}" data-a="tab" data-v="${view}" data-k="${k}">${l}</button>`).join('')}</div>`;
const empty = (t, i = 'check') => `<div class="empty">${ic(i, 36)}<div>${t}</div></div>`;
const searchBox = ph => `<label class="search" data-s>${ic('search', 20)}<input data-in="q" value="${esc(ui.q)}" placeholder="${ph}" autocomplete="off"></label>`;
const catColor = c => PAL[[...new Set(S.products.map(p => p.cat))].indexOf(c) % PAL.length];

/* ───── ОБЗОР ───── */
function kpiMap() {
  const w7 = wasteMv(7), w7s = w7.reduce((s, m) => s + mvCost(m), 0);
  const reason = {}; w7.forEach(m => reason[m.reason] = (reason[m.reason] || 0) + mvCost(m));
  const top = Object.entries(reason).sort((a, b) => b[1] - a[1])[0];
  const sp7 = S.orders.filter(o => dd(o.d) >= -7 && o.st !== 'draft').reduce((s, o) => s + oSum(o), 0);
  const fc = menuFC(), over = S.recipes.filter(r => rFC(r) > S.targetFC).length;
  const lo = lowList(), ex = expList(3), tOkN = S.temps.filter(t => tOk(t)).length;
  const k1 = S.checklists[0], on = S.staff.filter(e => e.on).length;
  const cons = S.vendors.filter(v => v.kind === 'contractor'), due = cons.filter(v => dd(nextVisit(v)) <= 3);
  const med = S.staff.filter(e => e.med !== null && dd(e.med) <= 30);
  const fl = S.orders.filter(o => o.st === 'sent' || o.st === 'pending');
  const goFc = R().nav.includes('reports') ? 'reports' : 'recipes';
  return {
    fc: { l: 'Food cost', icon: 'chart', v: fc, f: 'pct', u: '%', s: `по меню · цель ${S.targetFC}% · выше цели: ${over} ${pl(over, ['блюдо', 'блюда', 'блюд'])}`, tone: fcTone(fc), spark: S.hist.fc.concat(fc), go: goFc },
    waste7: { l: 'Списания за 7 дней', icon: 'trash', v: w7s, f: 'rub', s: top ? `${w7.length} ${pl(w7.length, ['списание', 'списания', 'списаний'])} · чаще всего: ${top[0].toLowerCase()}` : 'нет списаний', tone: w7s > 7000 ? 'wn' : '', go: goFc === 'reports' ? 'reports' : 'stock' },
    spend7: { l: 'Закупки за 7 дней', icon: 'cart', v: sp7, f: 'rub', s: `${S.orders.filter(o => dd(o.d) >= -7).length} заявок поставщикам`, go: 'orders' },
    stockValue: { l: 'Стоимость склада', icon: 'box', v: stockValue(), f: 'rub', s: `${S.products.length} позиций на остатках`, go: 'stock' },
    low: { l: 'Ниже минимума', icon: 'box', v: lo.length, f: 'int', s: lo.length ? lo.slice(0, 2).map(p => p.name).join(', ') + '…' : 'всё в достатке', tone: lo.length ? 'bd' : 'ok', go: 'orders' },
    expiring: { l: 'Срок ≤ 3 дней', icon: 'clock', v: ex.length, f: 'int', s: ex.length ? ex.slice(0, 2).map(p => p.name).join(', ') + '…' : 'просрочки нет', tone: ex.length ? 'wn' : 'ok', go: 'stock', tab: 'exp' },
    temps: { l: 'Температуры', icon: 'therm', txt: `<b>${tOkN}</b><small>/ ${S.temps.length}</small>`, s: tOkN === S.temps.length ? 'все в норме' : `${S.temps.length - tOkN} вне нормы — нужно действие`, tone: tOkN === S.temps.length ? 'ok' : 'bd', ring: tOkN / S.temps.length, rl: '', go: 'control', tab: 'temps' },
    openCl: { l: 'Открытие кухни', icon: 'check', v: Math.round(clPct(k1) * 100), f: 'int', u: '%', s: `${k1.done.length} из ${k1.items.length} пунктов`, tone: clPct(k1) === 1 ? 'ok' : '', ring: clPct(k1), rl: '', go: 'control', tab: 'lists' },
    onShift: { l: 'Сейчас на смене', icon: 'users', v: on, f: 'int', s: `из ${S.staff.filter(e => e.id !== 'e1').length} в штате`, go: 'staff' },
    orders: { l: 'Заявки в пути', icon: 'send', v: fl.length, f: 'int', s: fl.length ? fl.map(o => vend(o.sup).name).slice(0, 2).join(', ') : 'нет активных', tone: fl.length ? '' : 'ok', go: 'orders', tab: 'list' },
    vendorsDue: { l: 'Визиты подрядчиков', icon: 'truck', v: due.length, f: 'int', s: due.length ? 'требуют внимания: ' + due.map(v => v.name).slice(0, 2).join(', ') : 'всё по графику', tone: due.some(v => dd(nextVisit(v)) < 0) ? 'bd' : due.length ? 'wn' : 'ok', go: 'vendors' },
    medbooks: { l: 'Мед. книжки', icon: 'doc', v: med.length, f: 'int', s: med.length ? 'просрочены или кончаются' : 'у всех в порядке', tone: med.some(e => dd(e.med) < 0) ? 'bd' : med.length ? 'wn' : 'ok', go: 'staff' },
  };
}
const kpiCard = k => `<button class="kpi t-${k.tone || ''}" data-s data-a="go" data-r="${k.go}" ${k.tab ? `data-tab="${k.tab}"` : ''}>
  <div class="l">${ic(k.icon, 18)}${k.l}</div>
  <div class="v">${k.v != null ? count(k.v, k.f, k.u) : k.txt}</div><div class="s">${k.s}</div>
  ${k.ring != null ? ring(k.ring, '', k.tone, 58) : ''}${k.spark ? spark(k.spark) : ''}</button>`;

const BLK = {
  attention() {
    const a = ui.alerts = alerts();
    return `<div class="card" data-s><div class="card-h"><h3>Требует внимания</h3><span class="sp"></span>${a.length ? chip(a.some(x => x.s === 0) ? 'bd' : 'wn', a.length + NB + pl(a.length, ['задача', 'задачи', 'задач'])) : ''}</div>
    <div class="list">${a.slice(0, 6).map((x, i) => `<button class="li" data-a="alert" data-i="${i}"><span class="ico ${x.tone}">${ic(x.ic, 22)}</span><span class="tx"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span class="end">${ic('arrow', 18)}</span></button>`).join('') || empty('Всё в порядке — замечаний нет')}</div></div>`;
  },
  shifts() {
    const on = S.staff.filter(e => e.on);
    return `<div class="card" data-s><div class="card-h"><h3>Сейчас на смене</h3><span class="sp"></span>${chip('ok', on.length + NB + pl(on.length, ['человек', 'человека', 'человек']))}</div>
    <div class="list">${on.slice(0, 6).map(e => `<button class="li" data-a="emp" data-id="${e.id}">${avatar(e)}<span class="tx"><b>${esc(e.name)}</b><small>${esc(e.pos)}</small></span><span class="end mu">с ${e.since}</span></button>`).join('') || empty('Никто не отмечен', 'users')}</div></div>`;
  },
  trend() {
    const fc = menuFC();
    return `<div class="card" data-s><div class="card-h"><h3>Food cost · 8 недель</h3><span class="sp"></span>${chip(fcTone(fc), 'сейчас ' + n1(fc, 1) + '%')}</div>${lineChart(S.hist.fc.concat(fc), S.hist.wk, S.targetFC)}</div>`;
  },
  vendorsNext() {
    const v = S.vendors.filter(x => x.kind === 'contractor').sort((a, b) => nextVisit(a).localeCompare(nextVisit(b))).slice(0, 5);
    return `<div class="card" data-s><div class="card-h"><h3>Ближайшие визиты подрядчиков</h3></div><div class="list">${v.map(c => { const d = dd(nextVisit(c)); return `<button class="li" data-a="ven" data-id="${c.id}"><span class="ico ${d < 0 ? 'bd' : d <= 3 ? 'wn' : 'ac'}">${ic(TYPE[c.type][0], 22)}</span><span class="tx"><b>${esc(c.name)}</b><small>${esc(TYPE[c.type][1])}</small></span><span class="end">${chip(d < 0 ? 'bd' : d <= 3 ? 'wn' : '', d < 0 ? 'просрочен' : rel(nextVisit(c)))}</span></button>`; }).join('')}</div></div>`;
  },
  checklists() {
    return `<div class="card" data-s><div class="card-h"><h3>Чек-листы смены</h3></div><div class="g g3" style="gap:8px">${S.checklists.map(c => `<button class="tile" style="align-items:center;padding:16px 8px;text-align:center" data-a="go" data-r="control" data-tab="lists">${ring(clPct(c), Math.round(clPct(c) * 100) + '%', clPct(c) === 1 ? 'ok' : '', 70)}<b style="font-size:14px">${c.name}</b></button>`).join('')}</div></div>`;
  },
  expiringList() {
    const l = expList(4).slice(0, 5);
    return `<div class="card" data-s><div class="card-h"><h3>Использовать в первую очередь</h3><span class="sp"></span><small>FEFO</small></div><div class="list">${l.map(p => { const c = expChip(p); return `<div class="li"><span class="tx"><b>${esc(p.name)}</b><small>${n1(p.stock)} ${p.unit} · ${esc(p.loc)}</small></span><span class="end">${chip(c[0], c[1])}<button class="btn xs" data-a="op" data-p="${p.id}" data-t="waste">Списать</button></span></div>`; }).join('') || empty('Скоропортящегося нет')}</div></div>`;
  },
  tempsMini() {
    return `<div class="card" data-s><div class="card-h"><h3>Температуры</h3><span class="sp"></span><button class="btn xs" data-a="go" data-r="control" data-tab="temps">Журнал</button></div><div class="list">${S.temps.map(t => `<button class="li" data-a="temp" data-id="${t.id}"><span class="ico ${tOk(t) ? 'ok' : 'bd'}">${ic('therm', 22)}</span><span class="tx"><b>${esc(t.name)}</b><small>норма ${t.lo}…${t.hi}° · ${agoTs(tLast(t).ts)}</small></span><span class="end">${chip(tOk(t) ? 'ok' : 'bd', n1(tLast(t).v, 1) + '°')}</span></button>`).join('')}</div></div>`;
  },
  ordersMini() {
    const o = S.orders.filter(x => x.st === 'sent' || x.st === 'pending');
    return `<div class="card" data-s><div class="card-h"><h3>Заявки в пути</h3><span class="sp"></span><button class="btn xs" data-a="go" data-r="orders">Все</button></div><div class="list">${o.map(x => `<button class="li" data-a="ord" data-id="${x.id}"><span class="ico in">${ic('inbox', 22)}</span><span class="tx"><b>${esc(vend(x.sup).name)}</b><small>${x.items.length} ${pl(x.items.length, ['позиция', 'позиции', 'позиций'])} · ${rub(oSum(x))}</small></span><span class="end">${chip(x.st === 'pending' ? 'wn' : 'in', x.st === 'pending' ? 'согласование' : 'ждём ' + rel(x.eta))}</span></button>`).join('') || empty('Активных заявок нет')}</div></div>`;
  },
};

function vHome() {
  const r = R(), u = me(), k = kpiMap(), h = new Date().getHours();
  const g = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const a = alerts(), on = S.staff.filter(e => e.on).length;
  return `<div class="hello" data-s><div><h1>${g}, ${esc(u.name.split(' ')[0])}</h1><p>${on} на смене · ${a.length ? `<b style="color:${a.some(x => x.s === 0) ? 'var(--bd)' : 'var(--wn)'}">${a.length} ${pl(a.length, ['задача требует', 'задачи требуют', 'задач требуют'])} внимания</b>` : 'замечаний нет'}</p></div></div>
  <div class="g g4">${r.kpis.map(id => kpiCard(k[id])).join('')}</div>
  ${r.blocks.map(([lay, ids]) => `<div class="g ${lay} mt">${ids.map(id => BLK[id]()).join('')}</div>`).join('')}`;
}

/* ───── СКЛАД ───── */
function vStock() {
  const tab = ui.tab.stock;
  const head = `<div class="bar-row">${seg('stock', [['list', 'Остатки'], ['exp', 'Сроки годности'], ['log', 'Журнал движения']])}<span class="sp"></span>${tab === 'list' ? searchBox('Найти продукт') : ''}<button class="btn pri" data-s data-a="newProd">${ic('plus', 20)}Позиция</button></div>`;
  if (tab === 'exp') {
    const l = expList(7), urgent = l.filter(p => dd(p.exp) <= 2), soon = l.filter(p => dd(p.exp) > 2);
    const row = p => { const c = expChip(p); return `<div class="li"><span class="ico ${c[0]}">${ic('clock', 22)}</span><span class="tx"><b>${esc(p.name)}</b><small>${n1(p.stock)} ${p.unit} · ${esc(p.loc)} · до ${dm(p.exp)}</small></span><span class="end">${chip(c[0], c[1])}<button class="btn sm" data-a="op" data-p="${p.id}" data-t="out">В расход</button><button class="btn sm bd" data-a="op" data-p="${p.id}" data-t="waste">Списать</button></span></div>`; };
    return head + `<div class="card" data-s style="background:linear-gradient(120deg,var(--acb),var(--s1))"><div class="card-h" style="margin:0"><span class="ico ac">${ic('spark', 22)}</span><div><h3>Принцип FEFO</h3><small>Первым используем то, что раньше портится. Что не успеваем — списываем с причиной, это видно в аналитике.</small></div></div></div>
    <div class="card mt" data-s><div class="card-h"><h3>Срочно — сегодня и завтра</h3><span class="sp"></span>${chip(urgent.length ? 'bd' : 'ok', String(urgent.length))}</div><div class="list">${urgent.map(row).join('') || empty('Срочного нет')}</div></div>
    <div class="card mt" data-s><div class="card-h"><h3>В течение недели</h3><span class="sp"></span>${chip(soon.length ? 'wn' : 'ok', String(soon.length))}</div><div class="list">${soon.map(row).join('') || empty('Ничего не горит')}</div></div>`;
  }
  if (tab === 'log') {
    const T = { in: ['inbox', 'ok', 'Приход'], out: ['knife', 'ac', 'Расход'], waste: ['trash', 'bd', 'Списание'], inv: ['edit', 'in', 'Инвентаризация'] };
    const l = [...S.mv].sort((a, b) => b.ts - a.ts).slice(0, 40);
    return head + `<div class="card" data-s><div class="list">${l.map(m => { const t = T[m.type], p = prod(m.pid) || { name: '—', unit: '' }; return `<div class="li"><span class="ico ${t[1]}">${ic(t[0], 22)}</span><span class="tx"><b>${esc(p.name)}</b><small>${t[2]}${m.reason && m.reason !== t[2] ? ' · ' + esc(m.reason) : ''} · ${esc(emp(m.who)?.name || '')} · ${agoTs(m.ts)}</small></span><span class="end"><b>${m.type === 'in' ? '+' : m.type === 'inv' ? '=' : '−'}${n1(m.qty)} ${p.unit}</b>${m.type === 'waste' ? `<span class="mu">${rub(mvCost(m))}</span>` : ''}</span></div>`; }).join('')}</div></div>`;
  }
  const cats = ['Все', ...new Set(S.products.map(p => p.cat))];
  const q = ui.q.trim().toLowerCase();
  let l = S.products.filter(p => (ui.cat === 'Все' || p.cat === ui.cat) && (!q || p.name.toLowerCase().includes(q)));
  if (ui.f === 'low') l = l.filter(p => p.stock < p.min);
  if (ui.f === 'exp') l = l.filter(p => dd(p.exp) <= 4);
  const nLow = lowList().length, nExp = expList(4).length;
  return head + `<div class="bar-row" data-s><div class="pills">${cats.map(c => `<button class="pill ${c === ui.cat ? 'on' : ''}" data-a="cat" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div><span class="sp"></span>
    <div class="pills"><button class="pill ${ui.f === 'low' ? 'on' : ''}" data-a="flt" data-k="low">Ниже минимума · ${nLow}</button><button class="pill ${ui.f === 'exp' ? 'on' : ''}" data-a="flt" data-k="exp">Срок ≤ 4 дн. · ${nExp}</button></div></div>
  <table class="tbl" data-s><thead><tr><th>Позиция</th><th>Остаток</th><th class="hm">Минимум</th><th>Срок</th><th class="hm">Цена</th><th class="hm">Поставщик</th></tr></thead><tbody>
  ${l.map(p => { const c = expChip(p); return `<tr class="rw" data-a="prod" data-id="${p.id}"><td><div class="nm"><i class="cd" style="background:${catColor(p.cat)}"></i><div><b>${esc(p.name)}</b><small>${esc(p.loc)}</small></div></div></td><td><div class="qty">${n1(p.stock)}<small>${p.unit}</small></div><div style="width:120px;margin-top:6px">${bar(p.stock / (p.min * 2), pStatus(p))}</div></td><td class="hm mu">${n1(p.min)} ${p.unit}</td><td>${chip(c[0], c[1])}</td><td class="hm mono">${rub(p.price)}<span class="mu">/${p.unit}</span></td><td class="hm mu">${esc(vend(p.sup)?.name || '')}</td></tr>`; }).join('')}</tbody></table>
  ${l.length ? '' : empty('Ничего не найдено', 'search')}`;
}

/* ───── ЗАКУПКИ ───── */
function suggestions() {
  const by = {};
  lowList().filter(p => !inFlight(p.id)).forEach(p => { const q = ui.draft[p.id] ?? sugQty(p); (by[p.sup] ||= []).push({ p, q }); });
  return by;
}
const stepper = (id, q, unit, step) => `<div class="step"><button data-a="dq" data-p="${id}" data-d="${-step}" aria-label="меньше">${ic('minus', 18)}</button><b>${n1(q)} ${unit}</b><button data-a="dq" data-p="${id}" data-d="${step}" aria-label="больше">${ic('plus', 18)}</button></div>`;
const ST = { pending: ['wn', 'Согласование'], sent: ['in', 'В пути'], received: ['ok', 'Принята'] };
function vOrders() {
  const tab = ui.tab.orders, by = suggestions(), nRec = Object.values(by).reduce((s, a) => s + a.length, 0), nAct = S.orders.filter(o => o.st !== 'received').length;
  const head = `<div class="bar-row">${seg('orders', [['rec', `Рекомендуем заказать · ${nRec}`], ['list', `Заявки · ${nAct} активных`]])}</div>`;
  if (tab === 'list') {
    const l = ui.allOrders ? S.orders : S.orders.slice(0, 8);
    return head + `<div class="card" data-s><div class="list">${l.map(o => { const s = ST[o.st], v = vend(o.sup); return `<div class="li"><span class="ico ${s[0]}">${ic(o.st === 'received' ? 'check' : o.st === 'sent' ? 'truck' : 'send', 22)}</span><span class="tx"><b>${esc(v.name)}</b><small>${o.items.length} ${pl(o.items.length, ['позиция', 'позиции', 'позиций'])} · ${rub(oSum(o))} · ${dm(o.d)} · ${esc(emp(o.by)?.name || '')}</small></span><span class="end">${chip(s[0], s[1])}${o.st === 'pending' && R().approve ? `<button class="btn sm pri" data-a="approve" data-id="${o.id}">Согласовать</button>` : ''}${o.st === 'sent' ? `<button class="btn sm ok" data-a="ord" data-id="${o.id}">Принять</button>` : ''}${o.st === 'received' ? `<button class="btn sm" data-a="ord" data-id="${o.id}">Открыть</button>` : ''}</span></div>`; }).join('')}</div>
    ${!ui.allOrders && S.orders.length > 8 ? `<div style="padding-top:10px"><button class="btn wide" data-a="allOrders">Показать все (${S.orders.length})</button></div>` : ''}</div>`;
  }
  const sups = Object.keys(by);
  if (!sups.length) return head + `<div class="card" data-s>${empty('Всё в достатке — закупать нечего. Когда продукт опустится ниже минимума, он появится здесь автоматически.')}</div>`;
  return head + `<div class="g g2">${sups.map(sid => {
    const v = vend(sid), ls = by[sid], tot = ls.reduce((s, l) => s + l.q * l.p.price, 0), act = ls.filter(l => l.q > 0).length;
    return `<div class="card" data-s><div class="card-h"><span class="ico ac">${ic('truck', 22)}</span><div><h3>${esc(v.name)}</h3><small>Доставка: ${esc(v.days)} · ${esc(v.terms)}</small></div><span class="sp"></span>${$money() && tot < v.minOrder ? chip('wn', 'мин. заказ ' + grp(v.minOrder) + NB + '₽') : ''}</div>
    <div class="list">${ls.map(l => `<div class="li" style="${l.q === 0 ? 'opacity:.45' : ''}"><span class="tx"><b>${esc(l.p.name)}</b><small>остаток ${n1(l.p.stock)} из ${n1(l.p.min)} ${l.p.unit} · ${rub(l.q * l.p.price)}</small></span><span class="end">${stepper(l.p.id, l.q, l.p.unit, stepOf(l.p))}</span></div>`).join('')}</div>
    <div class="bar-row" style="margin:14px 0 0"><div><small class="mu">Итого</small><div style="font-size:24px;font-weight:800">${rub(tot)}</div></div><span class="sp"></span><button class="btn pri ${act ? '' : 'off'}" data-a="sendOrder" data-s="${sid}">${ic('send', 20)}${R().approve ? 'Отправить поставщику' : 'На согласование'}</button></div></div>`;
  }).join('')}</div>`;
}

/* ───── ТЕХ. КАРТЫ ───── */
function vRecipes() {
  const fc = menuFC(), rs = [...S.recipes], bad = rs.filter(r => rFC(r) > S.targetFC), worst = [...rs].sort((a, b) => rFC(b) - rFC(a))[0];
  const hint = worst && rFC(worst) > S.targetFC ? Math.ceil(rCost(worst) / (S.targetFC / 100) / 10) * 10 : 0;
  return `<div class="g g3"><div class="kpi t-${fcTone(fc)}" data-s><div class="l">${ic('chart', 18)}Средний food cost</div><div class="v">${$money() ? count(fc, 'pct', '%') : '•••'}</div><div class="s">цель ${S.targetFC}%</div></div>
  <div class="kpi" data-s><div class="l">${ic('chef', 18)}Блюд в меню</div><div class="v">${count(rs.length, 'int')}</div><div class="s">${bad.length} выше цели по себестоимости</div></div>
  <div class="kpi" data-s><div class="l">${ic('spark', 18)}Подсказка</div><div class="s" style="margin:6px 0 0;color:var(--tx);font-size:14px">${$money() && hint ? `«${esc(worst.name)}» — food cost ${n1(rFC(worst), 0)}%. Цена ${hint}${NB}₽ вернёт блюдо в цель.` : 'Все блюда укладываются в целевой food cost.'}</div></div></div>
  <div class="g g3 mt">${rs.map(r => { const f = rFC(r), po = rPortions(r), t = fcTone(f); return `<button class="tile" data-s data-a="rec" data-id="${r.id}"><div class="hd"><div class="tx"><b>${esc(r.name)}</b><small>${r.ing.length} ингр. · ${rub(r.price)}</small></div>${$money() ? ring(Math.min(1, f / 60), n1(f, 0) + '%', t, 62) : ''}</div>
    <div class="ft">${$money() ? chip('', 'себест. ' + rub(rCost(r))) + chip(t, 'маржа ' + rub(r.price - rCost(r))) : ''}${chip(po === 0 ? 'bd' : po < 8 ? 'wn' : 'ok', 'хватит на ' + po + NB + pl(po, ['порцию', 'порции', 'порций']))}</div></button>`; }).join('')}</div>`;
}

/* ───── КОМАНДА ───── */
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function vStaff() {
  const tab = ui.tab.staff, head = `<div class="bar-row">${seg('staff', [['team', 'Команда'], ['sched', 'График недели']])}<span class="sp"></span>${R().staffEdit && tab === 'team' ? `<button class="btn pri" data-s data-a="newEmp">${ic('plus', 20)}Сотрудник</button>` : ''}</div>`;
  if (tab === 'sched') {
    const list = S.staff.filter(e => e.week.some(c => c !== '-')), d0 = new Date(); d0.setDate(d0.getDate() - K.dow());
    const cov = DAYS.map((_, i) => S.staff.filter(e => e.grp === 'kitchen' && e.week[i] !== '-').length);
    return head + `<div class="card" data-s><div class="sch-w"><table class="sch"><thead><tr><th></th>${DAYS.map((d, i) => { const x = new Date(d0); x.setDate(d0.getDate() + i); return `<th class="${i === K.dow() ? 'today' : ''}">${d}<br><span style="font-size:15px;color:${i === K.dow() ? 'var(--ac)' : 'var(--tx)'}">${x.getDate()}</span></th>`; }).join('')}</tr></thead><tbody>
    ${list.map(e => `<tr><td class="nmc"><button class="nm" data-a="emp" data-id="${e.id}" style="text-align:left">${avatar({ ...e, on: false })}<div><b style="font-size:14px">${esc(e.name)}</b><small>${esc(e.pos)}</small></div></button></td>${e.week.map((c, i) => `<td class="c"><button class="sh ${c === 'Д' ? 'd' : c === 'В' ? 'v' : ''}" ${R().staffEdit ? '' : 'disabled'} data-a="shift" data-e="${e.id}" data-d="${i}">${c === '-' ? '·' : c}</button></td>`).join('')}</tr>`).join('')}
    <tr class="cov"><td class="nmc"><b style="font-size:13px" class="mu">Поваров на кухне</b></td>${cov.map(c => `<td class="c"><div class="cov-c ${c >= 5 ? '' : c >= 4 ? 'wn' : 'bd'}">${c}</div></td>`).join('')}</tr></tbody></table></div>
    <div class="bar-row" style="margin:14px 0 0"><span class="chip in">Д · день 09–17</span><span class="chip ac">В · вечер 15–23</span><span class="chip">· · выходной</span><span class="sp"></span><small class="mu">${R().staffEdit ? 'Нажмите на ячейку, чтобы сменить смену. ' : ''}Жёлтым отмечены дни с 4 поварами, красным — когда меньше 4.</small></div></div>`;
  }
  const G = [['mgmt', 'Управление'], ['kitchen', 'Кухня'], ['hall', 'Зал']];
  return head + G.map(([g, n]) => `<div class="sec" data-s>${n}</div><div class="g g3">${S.staff.filter(e => e.grp === g).map(e => { const m = medState(e); return `<button class="tile" data-s data-a="emp" data-id="${e.id}"><div class="hd">${avatar(e)}<div class="tx"><b>${esc(e.name)}</b><small>${esc(e.pos)}</small></div></div><div class="ft">${e.on ? chip('ok', 'на смене с ' + e.since) : chip('', todayShift(e) === '-' ? 'выходной' : 'смена не начата')}${m && m[0] !== 'ok' ? chip(m[0], m[1]) : ''}</div></button>`; }).join('')}</div>`).join('');
}

/* ───── ПОДРЯДЧИКИ ───── */
function vVendors() {
  const tab = ui.tab.vendors, head = `<div class="bar-row">${seg('vendors', [['con', 'Подрядные организации'], ['sup', 'Поставщики продуктов']])}<span class="sp"></span>${R().vendorEdit ? `<button class="btn pri" data-s data-a="newVen">${ic('plus', 20)}Добавить</button>` : ''}</div>`;
  if (tab === 'sup') {
    return head + `<div class="g g3">${S.vendors.filter(v => v.kind === 'supplier').map(v => `<div class="tile" data-s data-a="ven" data-id="${v.id}" role="button"><div class="hd"><span class="ico ac">${ic('truck', 22)}</span><div class="tx"><b>${esc(v.name)}</b><small>${esc(v.type)}</small></div></div><div class="ft">${chip('in', esc(v.days))}${chip('', esc(v.terms))}${v.debt && $money() ? chip('wn', 'долг ' + rub(v.debt)) : ''}</div><div class="ft">${stars(v.rating)}<span class="sp"></span><button class="btn xs" data-a="go" data-r="orders">Заявка</button></div></div>`).join('')}</div>`;
  }
  const cons = S.vendors.filter(v => v.kind === 'contractor').sort((a, b) => nextVisit(a).localeCompare(nextVisit(b)));
  return head + `<div class="g g3">${cons.map(c => { const d = dd(nextVisit(c)), t = dd(c.till); return `<div class="tile" data-s data-a="ven" data-id="${c.id}" role="button"><div class="hd"><span class="ico ${d < 0 ? 'bd' : d <= 3 ? 'wn' : 'ac'}">${ic(TYPE[c.type][0], 22)}</span><div class="tx"><b>${esc(c.name)}</b><small>${esc(TYPE[c.type][1])}</small></div></div>
    <div class="mu" style="font-size:14px;min-height:40px">${esc(c.svc)}</div>
    <div class="ft">${chip(d < 0 ? 'bd' : d <= 3 ? 'wn' : '', d < 0 ? 'визит просрочен на ' + -d + NB + 'дн.' : 'визит ' + rel(nextVisit(c)))}${chip(t <= 30 ? 'wn' : '', 'договор до ' + dm(c.till))}</div>
    <div class="ft">${stars(c.rating)}<span class="sp"></span>${R().vendorEdit ? `<button class="btn xs ok" data-a="visit" data-id="${c.id}">${ic('check', 16)}Визит</button>` : ''}</div></div>`; }).join('')}</div>`;
}

/* ───── КОНТРОЛЬ ───── */
function vControl() {
  const tab = ui.tab.control, head = `<div class="bar-row">${seg('control', [['temps', 'Температуры'], ['lists', 'Чек-листы смены']])}</div>`;
  if (tab === 'lists') {
    return head + `<div class="g g3" style="align-items:start">${S.checklists.map(c => `<div class="card" data-s><div class="card-h">${ring(clPct(c), Math.round(clPct(c) * 100) + '%', clPct(c) === 1 ? 'ok' : '', 62)}<div><h3>${c.name}</h3><small>${c.by ? 'подписал ' + esc(c.by) + ' в ' + c.at : c.done.length + ' из ' + c.items.length}</small></div></div>
    <div class="list">${c.items.map((t, i) => `<button class="ck ${c.done.includes(i) ? 'on' : ''}" data-a="ck" data-c="${c.id}" data-i="${i}"><span class="box">${ic('check', 18)}</span><span>${esc(t)}</span></button>`).join('')}</div>
    ${clPct(c) === 1 && !c.by ? `<button class="btn ok wide" style="margin-top:12px" data-a="sign" data-c="${c.id}">${ic('check', 20)}Подписать</button>` : ''}</div>`).join('')}</div>`;
  }
  return head + `<div class="g g3">${S.temps.map(t => { const l = tLast(t), ok = tOk(t), span = (t.hi - t.lo) * 2.4, a = t.lo - span / 2.4 * .6, b = t.hi + span / 2.4 * .6, pos = v => Math.max(2, Math.min(98, (v - a) / (b - a) * 100));
    return `<div class="tile" data-s><div class="hd"><span class="ico ${ok ? 'ok' : 'bd'}">${ic('therm', 22)}</span><div class="tx"><b>${esc(t.name)}</b><small>норма ${t.lo}…${t.hi}°C</small></div>${chip(ok ? 'ok' : 'bd', ok ? 'в норме' : 'отклонение')}</div>
    <div style="display:flex;align-items:flex-end;gap:12px;justify-content:space-between"><div class="tv ${ok ? 'ok' : 'bd'}">${n1(l.v, 1)}<small>°C</small></div>${spark(t.log.map(x => x.v), 120, 50)}</div>
    <div class="rng"><div class="zone" style="left:${pos(t.lo)}%;width:${pos(t.hi) - pos(t.lo)}%"></div><div class="pt ${ok ? '' : 'bd'}" style="left:${pos(l.v)}%"></div></div>
    <div class="ft"><small class="mu">${agoTs(l.ts)} · ${esc(emp(l.who)?.name.split(' ')[0] || '')}</small><span class="sp"></span><button class="btn sm ${ok ? '' : 'pri'}" data-a="temp" data-id="${t.id}">${ic('plus', 18)}Замер</button></div>${!ok && l.act ? `<small class="mu">Действие: ${esc(l.act)}</small>` : ''}</div>`; }).join('')}</div>`;
}

/* ───── АНАЛИТИКА ───── */
function vReports() {
  const fc = menuFC(), w14 = wasteMv(14), wsum = w14.reduce((s, m) => s + mvCost(m), 0), rs = {};
  w14.forEach(m => rs[m.reason] = (rs[m.reason] || 0) + mvCost(m));
  const reasons = Object.entries(rs).sort((a, b) => b[1] - a[1]), rmax = reasons[0]?.[1] || 1;
  const cat = {}; S.orders.filter(o => o.st === 'received' && dd(o.d) >= -28).forEach(o => o.items.forEach(i => { const c = prod(i.pid)?.cat || 'Прочее'; cat[c] = (cat[c] || 0) + i.q * i.price; }));
  const cats = Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ n, v, t: Math.round(v / 1000) + NB + 'тыс.' })), ctot = cats.reduce((s, c) => s + c.v, 0);
  const k = kpiMap(), worst = [...S.recipes].sort((a, b) => rFC(b) - rFC(a)).slice(0, 3);
  return `<div class="g g4">${['fc', 'waste7', 'spend7', 'stockValue'].map(id => kpiCard(k[id])).join('')}</div>
  <div class="g g12 mt"><div class="card" data-s><div class="card-h"><h3>Закупки по неделям</h3><span class="sp"></span><small>тыс. ₽</small></div>${barChart(S.hist.spend, S.hist.wk)}</div>
  <div class="card" data-s><div class="card-h"><h3>Куда уходят деньги · 4 недели</h3></div><div style="display:flex;gap:22px;align-items:center">${donut(cats, Math.round(ctot / 1000) + NB + 'тыс.', 'закупки, ₽')}${legend(cats)}</div></div></div>
  <div class="g g2 mt"><div class="card" data-s><div class="card-h"><h3>Списания по причинам · 14 дней</h3><span class="sp"></span>${chip('wn', rub(wsum))}</div><div class="list">${reasons.map(([n, v]) => `<div class="li" style="display:block;min-height:0;padding:10px 4px"><div style="display:flex;justify-content:space-between;margin-bottom:7px"><b style="font-size:14px">${esc(n)}</b><span class="mu">${rub(v)}</span></div>${bar(v / rmax, 'wn')}</div>`).join('') || empty('Списаний нет')}</div></div>
  <div class="card" data-s><div class="card-h"><h3>Блюда с самой высокой себестоимостью</h3></div><div class="list">${worst.map(r => { const f = rFC(r); return `<button class="li" data-a="rec" data-id="${r.id}"><span class="tx"><b>${esc(r.name)}</b><small>цена ${rub(r.price)} · себестоимость ${rub(rCost(r))}</small></span><span class="end">${chip(fcTone(f), n1(f, 0) + '%')}</span></button>`; }).join('')}</div>
  <div style="margin-top:12px">${lineChart(S.hist.fc.concat(fc), S.hist.wk, S.targetFC)}</div></div></div>`;
}

K.V = { home: vHome, stock: vStock, orders: vOrders, recipes: vRecipes, staff: vStaff, vendors: vVendors, control: vControl, reports: vReports };
K.suggestions = suggestions; K.ST = ST; K.stepper = stepper;
})();
