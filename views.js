/* Kitchen Control — экраны. Каждый экран возвращает HTML; интерактивность — через data-a (см. app.js). */
(() => {
const K = window.KC, S = K.S();
const { docSum, ic, esc, NB, grp, n1, rub, pl, dm, rel, agoTs, avatar, dd, prod, vend, emp, nextVisit, pStatus, lowList, expList, expChip, rCost, rFC, rPortions, menuFC, fcTone, wasteMv, mvCost, stockValue, oSum, inFlight, todayShift, tLast, tOk, clPct, medState, sugQty, stepOf, feed, chip, ring, bar, stars, count, spark, lineChart, barChart, donut, legend, PAL, R, me, $money } = K;

const ui = K.ui = { route: 'home', tab: { stock: 'list', orders: 'rec', team: 'team', checks: 'temps', money: 'sum', docs: 'new' }, q: '', cat: 'Все', f: 'all', draft: {}, allOrders: false, alerts: [] };
const TYPE = { clean: ['spark', 'Клининг'], vent: ['wind', 'Вентиляция'], pest: ['bug', 'Дезинсекция'], waste: ['trash', 'Отходы'], laundry: ['shirt', 'Прачечная'], tech: ['wrench', 'Техника'] };
K.TYPE = TYPE;
K.alias = (r, tab) => {
  if (r === 'reports') return ['money', tab || 'sum'];
  if (r === 'recipes') return R().nav.includes('dishes') ? ['dishes', tab] : ['money', 'dishes'];
  if (r === 'vendors') return tab === 'sup' ? ['orders', 'sup'] : ['checks', 'con'];
  if (r === 'control') return ['checks', tab || 'temps'];
  if (r === 'staff') return ['team', tab];
  return [r, tab];
};
const seg = (view, items) => items.length < 2 ? '' : `<div class="seg" data-s>${items.map(([k, l]) => `<button class="${k === ui.tab[view] ? 'on' : ''}" data-a="tab" data-v="${view}" data-k="${k}">${l}</button>`).join('')}</div>`;
const empty = (t, i = 'check') => `<div class="empty">${ic(i, 36)}<div>${t}</div></div>`;
const searchBox = ph => `<label class="search" data-s>${ic('search', 20)}<input data-in="q" value="${esc(ui.q)}" placeholder="${ph}" autocomplete="off"></label>`;
const catColor = c => PAL[[...new Set(S.products.map(p => p.cat))].indexOf(c) % PAL.length];
const dat = o => Object.entries(o || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');

/* ───── лента «что сделать сейчас» ───── */
const feedRow = x => `<div class="li fi"><span class="ico ${x.tone}">${ic(x.ic, 22)}</span><span class="tx"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span class="end">${x.tel ? `<a class="btn sm" href="tel:${esc(x.tel)}" aria-label="Позвонить">${ic('phone', 18)}</a>` : ''}${x.btn2 ? `<button class="btn sm" data-a="${x.a2}" ${dat(x.data2)}>${x.btn2}</button>` : ''}<button class="btn sm ${x.s === 0 ? 'pri' : ''}" data-a="${x.a}" ${dat(x.data)}>${x.btn}</button></span></div>`;
K.feedRow = feedRow;

/* ───── ГЛАВНАЯ ───── */
function kpiMap() {
  const w7 = wasteMv(7), w7s = w7.reduce((s, m) => s + mvCost(m), 0);
  const reason = {}; w7.forEach(m => reason[m.reason] = (reason[m.reason] || 0) + mvCost(m));
  const top = Object.entries(reason).sort((a, b) => b[1] - a[1])[0];
  const sp7 = S.orders.filter(o => dd(o.d) >= -7 && o.st !== 'draft').reduce((s, o) => s + oSum(o), 0);
  const fc = menuFC(), over = S.recipes.filter(r => rFC(r) > S.targetFC).length;
  const lo = lowList(), ex = expList(3), on = S.staff.filter(e => e.on).length;
  const cons = S.vendors.filter(v => v.kind === 'contractor'), due = cons.filter(v => dd(nextVisit(v)) <= 3);
  const fl = S.orders.filter(o => o.st === 'sent' || o.st === 'pending');
  const goFc = R().nav.includes('money') ? 'money' : 'dishes';
  return {
    fc: { l: 'Себестоимость блюд', icon: 'chart', v: fc, f: 'pct', u: '%', s: `доля продуктов в цене · цель ${S.targetFC}%` + (over ? ` · выше цели: ${over}` : ''), tone: fcTone(fc), spark: S.hist.fc.concat(fc), go: goFc, tab: 'dishes' },
    waste7: { l: 'Списано за 7 дней', icon: 'trash', v: w7s, f: 'rub', s: top ? `${w7.length} ${pl(w7.length, ['случай', 'случая', 'случаев'])} · чаще всего: ${top[0].toLowerCase()}` : 'ничего не списывали', tone: w7s > 35000 ? 'wn' : '', go: R().nav.includes('money') ? 'money' : 'stock' },
    spend7: { l: 'Закупки за 7 дней', icon: 'cart', v: sp7, f: 'rub', s: `${S.orders.filter(o => dd(o.d) >= -7).length} заказов поставщикам`, go: 'orders', tab: 'list' },
    stockValue: { l: 'Стоимость склада', icon: 'box', v: stockValue(), f: 'rub', s: `${S.products.length} позиций на остатках`, go: 'stock' },
    low: { l: 'Заканчивается', icon: 'box', v: lo.length, f: 'int', s: lo.length ? lo.slice(0, 2).map(p => p.name).join(', ') + '…' : 'всего хватает', tone: lo.length ? 'bd' : 'ok', go: 'orders' },
    expiring: { l: 'Скоро срок (3 дня)', icon: 'clock', v: ex.length, f: 'int', s: ex.length ? ex.slice(0, 2).map(p => p.name).join(', ') + '…' : 'просрочки нет', tone: ex.length ? 'wn' : 'ok', go: 'stock', tab: 'exp' },
    docsNew: { l: 'Ждут внесения в 1С', icon: 'doc', v: S.docs.filter(d => d.st === 'new').length, f: 'int', s: `поступлений: ${S.docs.filter(d => d.st === 'new' && d.type === 'in').length} · списаний: ${S.docs.filter(d => d.st === 'new' && d.type === 'out').length}`, tone: S.docs.some(d => d.st === 'new') ? 'wn' : 'ok', go: 'docs' },
    inWeek: { l: 'Поступило за 7 дней', icon: 'inbox', v: S.docs.filter(d => d.type === 'in' && dd(d.date) >= -7).reduce((s, d) => s + docSum(d), 0), f: 'rub', s: `${S.docs.filter(d => d.type === 'in' && dd(d.date) >= -7).length} накладных`, go: 'docs', tab: 'done' },
    onShift: { l: 'Сейчас на смене', icon: 'users', v: on, f: 'int', s: `из ${S.staff.filter(e => e.id !== 'e1').length} в штате`, go: 'team' },
    orders: { l: 'Заказы в пути', icon: 'send', v: fl.length, f: 'int', s: fl.length ? fl.map(o => vend(o.sup).name).slice(0, 2).join(', ') : 'нет активных', tone: fl.length ? '' : 'ok', go: 'orders', tab: 'list' },
    vendorsDue: { l: 'Визиты подрядчиков', icon: 'truck', v: due.length, f: 'int', s: due.length ? 'нужно внимание: ' + due.map(v => v.name).slice(0, 2).join(', ') : 'всё по графику', tone: due.some(v => dd(nextVisit(v)) < 0) ? 'bd' : due.length ? 'wn' : 'ok', go: 'checks', tab: 'con' },
  };
}
const kpiCard = k => `<button class="kpi t-${k.tone || ''}" data-s data-a="go" data-r="${k.go}" ${k.tab ? `data-tab="${k.tab}"` : ''}>
  <div class="l">${ic(k.icon, 18)}${k.l}</div><div class="v">${count(k.v, k.f, k.u)}</div><div class="s">${k.s}</div>${k.spark ? spark(k.spark) : ''}</button>`;

const BLK = {
  feed() {
    const a = ui.alerts = feed();
    return `<div class="card" data-s><div class="card-h"><h3>Что сделать сейчас</h3><span class="sp"></span>${a.length ? chip(a.some(x => x.s === 0) ? 'bd' : 'wn', String(a.length)) : chip('ok', 'всё сделано')}</div>
    <div class="list">${a.slice(0, 5).map(feedRow).join('') || empty('Срочных дел нет. Хорошая работа!')}</div>${a.length > 5 ? `<div style="padding-top:10px"><button class="btn wide" data-a="bell">Показать все (${a.length})</button></div>` : ''}</div>`;
  },
  shifts() {
    const on = S.staff.filter(e => e.on);
    return `<div class="card" data-s><div class="card-h"><h3>Сейчас на смене</h3><span class="sp"></span>${chip('ok', String(on.length))}</div>
    <div class="list">${on.slice(0, 6).map(e => `<button class="li" data-a="emp" data-id="${e.id}">${avatar(e)}<span class="tx"><b>${esc(e.name)}</b><small>${esc(e.pos)}</small></span><span class="end mu">с ${e.since}</span></button>`).join('') || empty('Никто не отмечен', 'users')}</div></div>`;
  },
  trend() {
    const fc = menuFC();
    return `<div class="card" data-s><div class="card-h"><h3>Себестоимость блюд · 8 недель</h3><span class="sp"></span>${chip(fcTone(fc), 'сейчас ' + n1(fc, 1) + '%')}</div>${lineChart(S.hist.fc.concat(fc), S.hist.wk, S.targetFC)}</div>`;
  },
  tempsMini() {
    return `<div class="card" data-s><div class="card-h"><h3>Температуры</h3><span class="sp"></span><button class="btn xs" data-a="go" data-r="checks" data-tab="temps">Журнал</button></div><div class="list">${S.temps.map(t => `<button class="li" data-a="temp" data-id="${t.id}"><span class="ico ${tOk(t) ? 'ok' : 'bd'}">${ic('therm', 22)}</span><span class="tx"><b>${esc(t.name)}</b><small>норма ${t.lo}…${t.hi}° · ${agoTs(tLast(t).ts)}</small></span><span class="end">${chip(tOk(t) ? 'ok' : 'bd', n1(tLast(t).v, 1) + '°')}</span></button>`).join('')}</div></div>`;
  },
};

/* главная повара: четыре крупные кнопки без меню */
function vCook() {
  const u = me(), k1 = S.checklists[0], k2 = S.checklists[1], h = new Date().getHours(), cl = h >= 19 ? k2 : k1;
  const due = K.tempDue(), bad = S.temps.filter(t => !tOk(t)), ex = expList(4), fa = feed(), f = [...fa.filter(x => x.s === 0).slice(0, 2), ...fa.filter(x => x.k === 'rep')];
  const tSub = bad.length ? `${bad.length} вне нормы — нужно записать` : due.length ? `пора: ${due.length} из ${S.temps.length}` : 'всё записано';
  return `<div class="hello" data-s><div><h1>Привет, ${esc(u.name.split(' ')[0])}</h1><p>${u.on ? 'Вы на смене с ' + u.since : 'Смена не начата'} · что делаем?</p></div></div>
  <div class="g g2 acts">
    <button class="act bd" data-s data-a="pickProd" data-t="waste"><span class="ai">${ic('trash', 40)}</span><b>Списать продукт</b><small>брак, порча, истёк срок</small></button>
    <button class="act ${bad.length ? 'bd' : due.length ? 'wn' : 'ok'}" data-s data-a="go" data-r="checks" data-tab="temps"><span class="ai">${ic('therm', 40)}</span><b>Записать температуру</b><small>${tSub}</small></button>
    <button class="act ${clPct(cl) === 1 ? 'ok' : 'ac'}" data-s data-a="go" data-r="checks" data-tab="lists"><span class="ai">${ic('check', 40)}</span><b>Мои задачи</b><small>${cl.name}: ${cl.done.length} из ${cl.items.length}</small></button>
    <button class="act ${ex.length ? 'wn' : 'ok'}" data-s data-a="go" data-r="stock" data-tab="exp"><span class="ai">${ic('clock', 40)}</span><b>Что использовать первым</b><small>${ex.length ? ex.length + ' ' + pl(ex.length, ['продукт скоро испортится', 'продукта скоро испортятся', 'продуктов скоро испортятся']) : 'всё свежее'}</small></button>
  </div>
  ${f.length ? `<div class="card mt" data-s><div class="card-h"><h3>Срочно</h3></div><div class="list">${f.map(feedRow).join('')}</div></div>` : ''}`;
}

function vHome() {
  const r = R(); if (r.cook) return vCook();
  const u = me(), k = kpiMap(), h = new Date().getHours(), a = feed(), on = S.staff.filter(e => e.on).length;
  const g = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const kp = r.kpis.length ? `<div class="g g${r.kpis.length}">${r.kpis.map(id => kpiCard(k[id])).join('')}</div>` : '';
  return `<div class="hello" data-s><div><h1>${g}, ${esc(u.name.split(' ')[0])}</h1><p>${on} на смене · ${a.length ? `<b style="color:${a.some(x => x.s === 0) ? 'var(--bd)' : 'var(--wn)'}">${a.length} ${pl(a.length, ['дело ждёт', 'дела ждут', 'дел ждут'])}</b>` : 'всё в порядке'}</p></div></div>
  ${kp}${r.blocks.map(([lay, ids]) => `<div class="g ${lay} mt">${ids.map(id => BLK[id]()).join('')}</div>`).join('')}`;
}

/* ───── СКЛАД ───── */
function vStock() {
  const r = R(), tab = ui.tab.stock;
  const tabs = r.simple ? [['list', 'Все продукты'], ['exp', 'Что использовать первым']] : [['list', 'Остатки'], ['exp', 'Что использовать первым'], ['log', 'История']];
  const head = `<div class="bar-row">${seg('stock', tabs)}<span class="sp"></span>${tab === 'list' ? searchBox('Найти продукт') : ''}${r.simple ? '' : `<button class="btn pri" data-s data-a="newProd">${ic('plus', 20)}Продукт</button>`}</div>`;
  if (tab === 'exp') {
    const l = expList(7), urgent = l.filter(p => dd(p.exp) <= 2), soon = l.filter(p => dd(p.exp) > 2);
    const row = p => { const c = expChip(p); return `<div class="li fi"><span class="ico ${c[0]}">${ic('clock', 22)}</span><span class="tx"><b>${esc(p.name)}</b><small>${n1(p.stock)} ${p.unit} · ${esc(p.loc)} · до ${dm(p.exp)}</small></span><span class="end">${chip(c[0], c[1])}<button class="btn sm" data-a="op" data-p="${p.id}" data-t="out">В работу</button><button class="btn sm bd" data-a="op" data-p="${p.id}" data-t="waste">Списать</button></span></div>`; };
    return head + `<div class="card" data-s style="background:linear-gradient(120deg,var(--acb),var(--s1))"><div class="card-h" style="margin:0"><span class="ico ac">${ic('spark', 22)}</span><div><h3>Сначала то, что скорее испортится</h3><small>«В работу» — продукт ушёл в блюдо. «Списать» — не успели, выбросили.</small></div></div></div>
    <div class="card mt" data-s><div class="card-h"><h3>Срочно — сегодня и завтра</h3><span class="sp"></span>${chip(urgent.length ? 'bd' : 'ok', String(urgent.length))}</div><div class="list">${urgent.map(row).join('') || empty('Срочного нет')}</div></div>
    <div class="card mt" data-s><div class="card-h"><h3>В течение недели</h3><span class="sp"></span>${chip(soon.length ? 'wn' : 'ok', String(soon.length))}</div><div class="list">${soon.map(row).join('') || empty('Ничего не горит')}</div></div>`;
  }
  if (tab === 'log') {
    const T = { in: ['inbox', 'ok', 'Приход'], out: ['knife', 'ac', 'В работу'], waste: ['trash', 'bd', 'Списание'], inv: ['edit', 'in', 'Пересчёт'] };
    const l = [...S.mv].sort((a, b) => b.ts - a.ts).slice(0, 40);
    return head + `<div class="card" data-s><div class="list">${l.map(m => { const t = T[m.type], p = prod(m.pid) || { name: '—', unit: '' }; return `<div class="li"><span class="ico ${t[1]}">${ic(t[0], 22)}</span><span class="tx"><b>${esc(p.name)}</b><small>${t[2]}${m.reason && m.reason !== t[2] ? ' · ' + esc(m.reason) : ''} · ${esc(emp(m.who)?.name || '')} · ${agoTs(m.ts)}</small></span><span class="end">${m.ph ? `<img class="thumb" src="${m.ph}" alt="фото">` : ''}<b>${m.type === 'in' ? '+' : m.type === 'inv' ? '=' : '−'}${n1(m.qty)} ${p.unit}</b>${m.type === 'waste' ? `<span class="mu">${rub(mvCost(m))}</span>` : ''}</span></div>`; }).join('')}</div></div>`;
  }
  const cats = ['Все', ...new Set(S.products.map(p => p.cat))];
  const q = ui.q.trim().toLowerCase();
  let l = S.products.filter(p => (ui.cat === 'Все' || p.cat === ui.cat) && (!q || p.name.toLowerCase().includes(q)));
  if (ui.f === 'low') l = l.filter(p => p.stock < p.min);
  if (ui.f === 'exp') l = l.filter(p => dd(p.exp) <= 4);
  const nLow = lowList().length, nExp = expList(4).length;
  const filters = r.simple ? '' : `<div class="bar-row" data-s><div class="pills">${cats.map(c => `<button class="pill ${c === ui.cat ? 'on' : ''}" data-a="cat" data-k="${esc(c)}">${esc(c)}</button>`).join('')}</div><span class="sp"></span>
    <div class="pills"><button class="pill ${ui.f === 'low' ? 'on' : ''}" data-a="flt" data-k="low">Заканчивается · ${nLow}</button><button class="pill ${ui.f === 'exp' ? 'on' : ''}" data-a="flt" data-k="exp">Скоро срок · ${nExp}</button></div></div>`;
  return head + filters + `<table class="tbl" data-s><thead><tr><th>Продукт</th><th>Остаток</th><th class="hm">Минимум</th><th>Срок</th><th class="hm">Цена</th><th class="hm">Поставщик</th></tr></thead><tbody>
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
const ST = { pending: ['wn', 'Ждёт согласования'], sent: ['in', 'В пути'], received: ['ok', 'Принят'] };
function venSup() {
  return `<div class="g g3">${S.vendors.filter(v => v.kind === 'supplier').map(v => `<div class="tile" data-s data-a="ven" data-id="${v.id}" role="button"><div class="hd"><span class="ico ac">${ic('truck', 22)}</span><div class="tx"><b>${esc(v.name)}</b><small>${esc(v.type)}</small></div></div><div class="ft">${chip('in', esc(v.days))}${chip('', esc(v.terms))}${v.debt && $money() ? chip('wn', 'долг ' + rub(v.debt)) : ''}</div><div class="ft">${stars(v.rating)}</div></div>`).join('')}</div>`;
}
function vOrders() {
  const r = R(), tab = ui.tab.orders, by = suggestions(), nRec = Object.values(by).reduce((s, a) => s + a.length, 0), nAct = S.orders.filter(o => o.st !== 'received').length;
  const tabs = [['rec', `Что заказать · ${nRec}`], ['list', `Заказы · ${nAct}`]]; if (r.vendors) tabs.push(['sup', 'Поставщики']);
  const head = `<div class="bar-row">${seg('orders', tabs)}${r.vendorEdit && tab === 'sup' ? `<span class="sp"></span><button class="btn pri" data-s data-a="newVen" data-k="supplier">${ic('plus', 20)}Добавить</button>` : ''}</div>`;
  if (tab === 'sup' && r.vendors) return head + venSup();
  if (tab === 'list') {
    const l = ui.allOrders ? S.orders : S.orders.slice(0, 8);
    return head + `<div class="card" data-s><div class="list">${l.map(o => { const s = ST[o.st], v = vend(o.sup); return `<div class="li fi"><span class="ico ${s[0]}">${ic(o.st === 'received' ? 'check' : o.st === 'sent' ? 'truck' : 'send', 22)}</span><span class="tx"><b>${esc(v.name)}</b><small>${o.items.length} ${pl(o.items.length, ['позиция', 'позиции', 'позиций'])} · ${rub(oSum(o))} · ${dm(o.d)} · ${esc(emp(o.by)?.name || '')}</small></span><span class="end">${chip(s[0], s[1])}${o.st === 'pending' && R().approve ? `<button class="btn sm pri" data-a="approve" data-id="${o.id}">Согласовать</button>` : ''}${o.st === 'sent' ? `<button class="btn sm ok" data-a="ord" data-id="${o.id}">Принять товар</button>` : ''}${o.st === 'received' ? `<button class="btn sm" data-a="ord" data-id="${o.id}">Открыть</button>` : ''}</span></div>`; }).join('')}</div>
    ${!ui.allOrders && S.orders.length > 8 ? `<div style="padding-top:10px"><button class="btn wide" data-a="allOrders">Показать все (${S.orders.length})</button></div>` : ''}</div>`;
  }
  const sups = Object.keys(by);
  if (!sups.length) return head + `<div class="card" data-s>${empty('Заказывать нечего — всего хватает. Когда продукт начнёт заканчиваться, он появится здесь сам.')}</div>`;
  return head + `<div class="g g2">${sups.map(sid => {
    const v = vend(sid), ls = by[sid], tot = ls.reduce((s, l) => s + l.q * l.p.price, 0), act = ls.filter(l => l.q > 0).length;
    return `<div class="card" data-s><div class="card-h"><span class="ico ac">${ic('truck', 22)}</span><div><h3>${esc(v.name)}</h3><small>Привозят: ${esc(v.days)} · ${esc(v.terms)}</small></div><span class="sp"></span>${$money() && tot < v.minOrder ? chip('wn', 'от ' + grp(v.minOrder) + NB + '₸') : ''}</div>
    <div class="list">${ls.map(l => `<div class="li" style="${l.q === 0 ? 'opacity:.45' : ''}"><span class="tx"><b>${esc(l.p.name)}</b><small>осталось ${n1(l.p.stock)} из ${n1(l.p.min)} ${l.p.unit} · ${rub(l.q * l.p.price)}</small></span><span class="end">${stepper(l.p.id, l.q, l.p.unit, stepOf(l.p))}</span></div>`).join('')}</div>
    <div class="bar-row" style="margin:14px 0 0"><div><small class="mu">Итого</small><div style="font-size:24px;font-weight:800">${rub(tot)}</div></div><span class="sp"></span><button class="btn pri ${act ? '' : 'off'}" data-a="sendOrder" data-s="${sid}">${ic('send', 20)}${R().approve ? 'Отправить заказ' : 'Отправить шефу'}</button></div></div>`;
  }).join('')}</div>`;
}

/* ───── БЛЮДА (рецептуры и себестоимость) ───── */
function vRecipes() {
  const fc = menuFC(), rs = [...S.recipes], bad = rs.filter(r => rFC(r) > S.targetFC), worst = [...rs].sort((a, b) => rFC(b) - rFC(a))[0];
  const hint = worst && rFC(worst) > S.targetFC ? Math.ceil(rCost(worst) / (S.targetFC / 100) / 10) * 10 : 0;
  return `<div class="g g3"><div class="kpi t-${fcTone(fc)}" data-s><div class="l">${ic('chart', 18)}Себестоимость блюд</div><div class="v">${$money() ? count(fc, 'pct', '%') : '•••'}</div><div class="s">доля продуктов в цене · цель ${S.targetFC}%</div></div>
  <div class="kpi" data-s><div class="l">${ic('chef', 18)}Блюд в меню</div><div class="v">${count(rs.length, 'int')}</div><div class="s">${bad.length} дороже нормы по продуктам</div></div>
  <div class="kpi" data-s><div class="l">${ic('spark', 18)}Подсказка</div><div class="s" style="margin:6px 0 0;color:var(--tx);font-size:14px">${$money() && hint ? `«${esc(worst.name)}» — продукты стоят ${n1(rFC(worst), 0)}% цены. Цена ${hint}${NB}₸ вернёт блюдо в норму.` : 'Все блюда в пределах нормы.'}</div></div></div>
  <div class="g g3 mt">${rs.map(r => { const f = rFC(r), po = rPortions(r), t = fcTone(f); return `<button class="tile" data-s data-a="rec" data-id="${r.id}"><div class="hd"><div class="tx"><b>${esc(r.name)}</b><small>${r.ing.length} ингр. · ${rub(r.price)}</small></div>${$money() ? ring(Math.min(1, f / 60), n1(f, 0) + '%', t, 62) : ''}</div>
    <div class="ft">${$money() ? chip('', 'продукты ' + rub(rCost(r))) + chip(t, 'заработок ' + rub(r.price - rCost(r))) : ''}${chip(po === 0 ? 'bd' : po < 8 ? 'wn' : 'ok', 'хватит на ' + po + NB + pl(po, ['порцию', 'порции', 'порций']))}</div></button>`; }).join('')}</div>`;
}

/* ───── КОМАНДА ───── */
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function vStaff() {
  const tab = ui.tab.team, head = `<div class="bar-row">${seg('team', [['team', 'Кто работает'], ['sched', 'График недели']])}<span class="sp"></span>${R().staffEdit && tab === 'team' ? `<button class="btn pri" data-s data-a="newEmp">${ic('plus', 20)}Сотрудник</button>` : ''}</div>`;
  if (tab === 'sched') {
    const list = S.staff.filter(e => e.week.some(c => c !== '-')), d0 = new Date(); d0.setDate(d0.getDate() - K.dow());
    const cov = DAYS.map((_, i) => S.staff.filter(e => e.grp === 'kitchen' && e.week[i] !== '-').length);
    return head + `<div class="card" data-s><div class="sch-w"><table class="sch"><thead><tr><th></th>${DAYS.map((d, i) => { const x = new Date(d0); x.setDate(d0.getDate() + i); return `<th class="${i === K.dow() ? 'today' : ''}">${d}<br><span style="font-size:15px;color:${i === K.dow() ? 'var(--ac)' : 'var(--tx)'}">${x.getDate()}</span></th>`; }).join('')}</tr></thead><tbody>
    ${list.map(e => `<tr><td class="nmc"><button class="nm" data-a="emp" data-id="${e.id}" style="text-align:left">${avatar({ ...e, on: false })}<div><b style="font-size:14px">${esc(e.name)}</b><small>${esc(e.pos)}</small></div></button></td>${e.week.map((c, i) => `<td class="c"><button class="sh ${c === 'Д' ? 'd' : c === 'В' ? 'v' : ''}" ${R().staffEdit ? '' : 'disabled'} data-a="shift" data-e="${e.id}" data-d="${i}">${c === '-' ? '·' : c === 'Д' ? 'День' : 'Веч.'}</button></td>`).join('')}</tr>`).join('')}
    <tr class="cov"><td class="nmc"><b style="font-size:13px" class="mu">Поваров на кухне</b></td>${cov.map(c => `<td class="c"><div class="cov-c ${c >= 5 ? '' : c >= 4 ? 'wn' : 'bd'}">${c}</div></td>`).join('')}</tr></tbody></table></div>
    <div class="bar-row" style="margin:14px 0 0"><span class="chip in">День · 09–17</span><span class="chip ac">Вечер · 15–23</span><span class="chip">· · выходной</span><span class="sp"></span><small class="mu">${R().staffEdit ? 'Нажмите на клетку — смена поменяется. ' : ''}Жёлтым отмечены дни с 4 поварами, красным — меньше 4.</small></div></div>`;
  }
  const G = [['mgmt', 'Управление'], ['kitchen', 'Кухня'], ['hall', 'Зал']];
  return head + G.map(([g, n]) => `<div class="sec" data-s>${n}</div><div class="g g3">${S.staff.filter(e => e.grp === g).map(e => { const m = medState(e); return `<button class="tile" data-s data-a="emp" data-id="${e.id}"><div class="hd">${avatar(e)}<div class="tx"><b>${esc(e.name)}</b><small>${esc(e.pos)}</small></div></div><div class="ft">${e.on ? chip('ok', 'на смене с ' + e.since) : chip('', todayShift(e) === '-' ? 'выходной' : 'смена не начата')}${m && m[0] !== 'ok' ? chip(m[0], m[1].replace('Мед. книжка', 'Медкнижка')) : ''}</div></button>`; }).join('')}</div>`).join('');
}

/* ───── ПРОВЕРКИ: температуры, задачи смены, подрядчики ───── */
function venCon() {
  const cons = S.vendors.filter(v => v.kind === 'contractor').sort((a, b) => nextVisit(a).localeCompare(nextVisit(b)));
  return `<div class="g g3">${cons.map(c => { const d = dd(nextVisit(c)), t = dd(c.till); return `<div class="tile" data-s data-a="ven" data-id="${c.id}" role="button"><div class="hd"><span class="ico ${d < 0 ? 'bd' : d <= 3 ? 'wn' : 'ac'}">${ic(TYPE[c.type][0], 22)}</span><div class="tx"><b>${esc(c.name)}</b><small>${esc(TYPE[c.type][1])}</small></div></div>
    <div class="mu" style="font-size:14px;min-height:40px">${esc(c.svc)}</div>
    <div class="ft">${chip(d < 0 ? 'bd' : d <= 3 ? 'wn' : '', d < 0 ? 'визит просрочен на ' + -d + NB + 'дн.' : 'визит ' + rel(nextVisit(c)))}${chip(t <= 30 ? 'wn' : '', 'договор до ' + dm(c.till))}</div>
    <div class="ft">${stars(c.rating)}<span class="sp"></span>${R().vendorEdit ? `<button class="btn xs ok" data-a="visit" data-id="${c.id}">${ic('check', 16)}Приезжали</button>` : ''}</div></div>`; }).join('')}</div>`;
}
function vChecks() {
  const r = R(), tab = ui.tab.checks, due = K.tempDue().length, nb = S.temps.filter(t => !tOk(t)).length;
  const tabs = [['temps', 'Температуры' + (nb || due ? ` · ${nb + due}` : '')], ['lists', 'Задачи смены']]; if (r.vendors) tabs.push(['con', 'Подрядчики']);
  const head = `<div class="bar-row">${seg('checks', tabs)}${r.vendorEdit && tab === 'con' ? `<span class="sp"></span><button class="btn pri" data-s data-a="newVen" data-k="contractor">${ic('plus', 20)}Добавить</button>` : ''}${tab === 'lists' && r.feed.includes('rep') ? `<span class="sp"></span><button class="btn pri" data-s data-a="repOpen">${ic('doc', 20)}Сдать отчёт по продуктам</button>` : ''}</div>`;
  if (tab === 'con' && r.vendors) return head + venCon();
  if (tab === 'lists') {
    return head + `<div class="g g3" style="align-items:start">${S.checklists.map(c => `<div class="card" data-s><div class="card-h">${ring(clPct(c), Math.round(clPct(c) * 100) + '%', clPct(c) === 1 ? 'ok' : '', 62)}<div><h3>${c.name}</h3><small>${c.by ? 'подписал ' + esc(c.by) + ' в ' + c.at : c.done.length + ' из ' + c.items.length}</small></div></div>
    <div class="list">${c.items.map((t, i) => `<button class="ck ${c.done.includes(i) ? 'on' : ''}" data-a="ck" data-c="${c.id}" data-i="${i}"><span class="box">${ic('check', 18)}</span><span>${esc(t)}</span></button>`).join('')}</div>
    ${clPct(c) === 1 && !c.by ? `<button class="btn ok wide" style="margin-top:12px" data-a="sign" data-c="${c.id}">${ic('check', 20)}Всё сделано — подписать</button>` : ''}</div>`).join('')}</div>`;
  }
  const dueIds = K.tempDue().map(t => t.id);
  return head + `<div class="g g3">${S.temps.map(t => { const l = tLast(t), ok = tOk(t), isDue = dueIds.includes(t.id), span = (t.hi - t.lo) * 2.4, a = t.lo - span / 2.4 * .6, b = t.hi + span / 2.4 * .6, pos = v => Math.max(2, Math.min(98, (v - a) / (b - a) * 100));
    return `<div class="tile" data-s><div class="hd"><span class="ico ${ok ? 'ok' : 'bd'}">${ic('therm', 22)}</span><div class="tx"><b>${esc(t.name)}</b><small>норма ${t.lo}…${t.hi}°C</small></div>${chip(ok ? (isDue ? 'wn' : 'ok') : 'bd', ok ? (isDue ? 'пора мерить' : 'в норме') : 'вне нормы')}</div>
    <div style="display:flex;align-items:flex-end;gap:12px;justify-content:space-between"><div class="tv ${ok ? 'ok' : 'bd'}">${n1(l.v, 1)}<small>°C</small></div>${spark(t.log.map(x => x.v), 120, 50)}</div>
    <div class="rng"><div class="zone" style="left:${pos(t.lo)}%;width:${pos(t.hi) - pos(t.lo)}%"></div><div class="pt ${ok ? '' : 'bd'}" style="left:${pos(l.v)}%"></div></div>
    <div class="ft"><small class="mu">${agoTs(l.ts)} · ${esc(emp(l.who)?.name.split(' ')[0] || '')}</small><span class="sp"></span><button class="btn sm ${ok && !isDue ? '' : 'pri'}" data-a="temp" data-id="${t.id}">${ic('plus', 18)}Записать</button></div>${!ok && l.act ? `<small class="mu">Что сделали: ${esc(l.act)}</small>` : ''}</div>`; }).join('')}</div>`;
}

/* ───── ДЕНЬГИ: итоги и блюда ───── */
function vReports() {
  const fc = menuFC(), w14 = wasteMv(14), wsum = w14.reduce((s, m) => s + mvCost(m), 0), rs = {};
  w14.forEach(m => rs[m.reason] = (rs[m.reason] || 0) + mvCost(m));
  const reasons = Object.entries(rs).sort((a, b) => b[1] - a[1]), rmax = reasons[0]?.[1] || 1;
  const cat = {}; S.orders.filter(o => o.st === 'received' && dd(o.d) >= -28).forEach(o => o.items.forEach(i => { const c = prod(i.pid)?.cat || 'Прочее'; cat[c] = (cat[c] || 0) + i.q * i.price; }));
  const cats = Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ n, v, t: Math.round(v / 1000) + NB + 'тыс.' })), ctot = cats.reduce((s, c) => s + c.v, 0);
  const k = kpiMap(), worst = [...S.recipes].sort((a, b) => rFC(b) - rFC(a)).slice(0, 3);
  return `<div class="g g4">${['fc', 'waste7', 'spend7', 'stockValue'].map(id => kpiCard(k[id])).join('')}</div>
  <div class="g g12 mt"><div class="card" data-s><div class="card-h"><h3>Закупки по неделям</h3><span class="sp"></span><small>тыс. ₸</small></div>${barChart(S.hist.spend, S.hist.wk)}</div>
  <div class="card" data-s><div class="card-h"><h3>Куда уходят деньги · 4 недели</h3></div><div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">${donut(cats, Math.round(ctot / 1000) + NB + 'тыс.', 'закупки, ₸')}${legend(cats)}</div></div></div>
  <div class="g g2 mt"><div class="card" data-s><div class="card-h"><h3>Почему списываем · 14 дней</h3><span class="sp"></span>${chip('wn', rub(wsum))}</div><div class="list">${reasons.map(([n, v]) => `<div class="li" style="display:block;min-height:0;padding:10px 4px"><div style="display:flex;justify-content:space-between;margin-bottom:7px"><b style="font-size:14px">${esc(n)}</b><span class="mu">${rub(v)}</span></div>${bar(v / rmax, 'wn')}</div>`).join('') || empty('Списаний нет')}</div></div>
  <div class="card" data-s><div class="card-h"><h3>Самые дорогие по продуктам блюда</h3></div><div class="list">${worst.map(r => { const f = rFC(r); return `<button class="li" data-a="rec" data-id="${r.id}"><span class="tx"><b>${esc(r.name)}</b><small>цена ${rub(r.price)} · продукты ${rub(rCost(r))}</small></span><span class="end">${chip(fcTone(f), n1(f, 0) + '%')}</span></button>`; }).join('')}</div></div></div>`;
}
function vMoney() {
  const tab = ui.tab.money;
  return `<div class="bar-row">${seg('money', [['sum', 'Итоги'], ['dishes', 'Блюда']])}</div>` + (tab === 'dishes' ? vRecipes() : vReports());
}


/* ───── ДОКУМЕНТЫ для бухгалтерии (1С) ───── */
const DT = { in: ['inbox', 'ok', 'Поступление'], out: ['trash', 'wn', 'Списание'] };
K.DT = DT;
function vDocs() {
  const tab = ui.tab.docs, nNew = S.docs.filter(d => d.st === 'new').length, l = S.docs.filter(d => tab === 'new' ? d.st === 'new' : d.st === 'done').slice(0, 40);
  const head = `<div class="bar-row">${seg('docs', [['new', 'Ждут внесения в 1С · ' + nNew], ['done', 'Уже внесены']])}${tab === 'new' && nNew ? `<span class="sp"></span><button class="btn pri" data-s data-a="docCsvAll">${ic('inbox', 20)}Скачать всё для 1С</button>` : ''}</div>`;
  return head + `<div class="card" data-s><div class="list">${l.map(d => `<button class="li" data-a="doc" data-id="${d.id}"><span class="ico ${DT[d.type][1]}">${ic(DT[d.type][0], 22)}</span><span class="tx"><b>${DT[d.type][2]} ${d.num}</b><small>${dm(d.date)} · ${d.type === 'in' ? esc(vend(d.sup)?.name || '') : 'отчёт смены'} · ${d.items.length} ${pl(d.items.length, ['позиция', 'позиции', 'позиций'])} · ${esc(emp(d.by)?.name || '')}</small></span><span class="end">${d.diff ? chip('wn', 'расхождение') : ''}<b>${rub(docSum(d))}</b>${ic('arrow', 18)}</span></button>`).join('') || empty(tab === 'new' ? 'Новых документов нет — всё внесено в 1С' : 'Пока ничего не внесено', 'doc')}</div></div>`;
}

K.V = { docs: vDocs, home: vHome, stock: vStock, orders: vOrders, dishes: vRecipes, team: vStaff, checks: vChecks, money: vMoney };
K.suggestions = suggestions; K.ST = ST; K.stepper = stepper; K.venSup = venSup;
})();
