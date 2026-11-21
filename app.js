/* Kitchen Control — оболочка: роутер, шторки, действия, запуск. */
(() => {
const K = window.KC, S = K.S(), ui = K.ui;
const { $, $$, ic, esc, NB, grp, n1, rub, pl, dm, rel, agoTs, hm, avatar, dd, day, addDays, prod, vend, emp, nextVisit, expChip, rCost, rFC, rPortions, fcTone, mvCost, oSum, tLast, tOk, medState, sugQty, stepOf, alerts, chip, bar, stars, ROLES, NAV, R, me, $money, TYPE, reduced } = K;
ui.np = { val: '', neg: false, act: '' }; ui.form = {}; ui.rcv = {}; ui.vs = { rating: 5, note: '' };
let sheetFn = null;

/* ───── утилиты интерфейса ───── */
function toast(msg, tone = '') {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast ' + tone;
  t.innerHTML = ic(tone === 'bd' ? 'alert' : 'check', 22) + '<span>' + msg + '</span>'; $('#layer').append(t); setTimeout(() => t.remove(), 3200);
}
function countUp(root) {
  if (reduced) return;
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count, f = K.FM[el.dataset.fmt], t0 = performance.now();
    const tick = t => { const k = Math.min(1, (t - t0) / 1000), e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(tick); else el.textContent = f(to); };
    el.textContent = f(0); requestAnimationFrame(tick);
  });
}
const persist = () => K.save();

/* ───── оболочка ───── */
function renderSide() {
  const r = R(), u = me(), nav = $('.nav-ind') ? $('#side .nav') : null;
  if (!nav) {
    $('#side').innerHTML = `<div class="brand"><svg viewBox="0 0 100 100"><defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a1f"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="url(#bg1)"/><path d="M50 22c3 11 17 15 17 31a17 17 0 0 1-34 0c0-7 3-11 7-15 0 6 3 10 7 10 0-12-4-19 3-26z" fill="#1d0d02"/></svg><div><b>Kitchen<br>Control</b></div></div>
    <nav class="nav"><i class="nav-ind"></i></nav>
    <button class="me" data-a="me"><span id="meav"></span><div><b id="mename"></b><small id="merole"></small></div></button>`;
  }
  const bd = { stock: K.lowList().length, orders: S.orders.filter(o => o.st === 'pending').length, control: S.temps.filter(t => !tOk(t)).length, vendors: S.vendors.filter(v => v.kind === 'contractor' && dd(nextVisit(v)) < 0).length, staff: S.staff.filter(e => e.med !== null && dd(e.med) < 0).length };
  const nv = $('#side .nav'); $$('.nav-i', nv).forEach(b => b.remove());
  nv.insertAdjacentHTML('beforeend', r.nav.map(id => `<button class="nav-i ${id === ui.route ? 'on' : ''}" data-a="go" data-r="${id}">${ic(NAV[id][1], 24)}<span>${NAV[id][0]}</span>${bd[id] ? `<em class="bg ${id === 'stock' ? 'wn' : ''}" style="font-style:normal">${bd[id]}</em>` : ''}</button>`).join(''));
  const i = Math.max(0, r.nav.indexOf(ui.route)); $('.nav-ind').style.transform = `translateY(${i * 56}px)`;
  $('#meav').innerHTML = avatar({ ...u, on: false }); $('#mename').textContent = u.name; $('#merole').textContent = r.n;
}
function renderTop() {
  const d = new Date(), title = ui.route === 'home' ? 'Обзор' : NAV[ui.route][0], n = alerts().length;
  $('#top').innerHTML = `<div><h2>${title}</h2><div class="sub">${esc(S.venue)} · ${d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div><span class="sp"></span>
  <div class="clock"><b id="clk">${hm(d)}</b><small>${R().n}</small></div>
  <button class="ib" data-a="theme" aria-label="Тема">${ic(S.theme === 'dark' ? 'sun' : 'moon', 22)}</button>
  <button class="ib" data-a="bell" aria-label="Уведомления">${ic('bell', 22)}${n ? `<span class="dot">${n}</span>` : ''}</button>`;
}
function render(anim = true) {
  if (!R().nav.includes(ui.route)) ui.route = 'home';
  const v = $('#view'), f = document.activeElement, fin = f && f.dataset && f.dataset.in, pos = f && f.selectionStart;
  v.className = anim ? 'enter' : '';
  v.innerHTML = K.V[ui.route]();
  $$('[data-s]', v).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
  if (anim) { $('#main').scrollTop = 0; countUp(v); }
  if (fin) { const i = $(`[data-in="${fin}"]`, v); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} } }
  renderSide(); renderTop();
}
const go = (r, tab) => { ui.route = r; if (tab) ui.tab[r] = tab; ui.q = ''; ui.f = 'all'; ui.cat = 'Все'; closeSheet(true); render(true); };
const refresh = () => { persist(); render(false); if (sheetFn) paintSheet(); };

/* ───── шторки ───── */
function openSheet(fn, o = {}) {
  closeSheet(true); sheetFn = fn; ui.form = o.keepForm ? ui.form : {};
  const ov = document.createElement('div'); ov.className = 'ov' + (o.mid ? ' mid' : '');
  ov.innerHTML = `<div class="sheet ${o.wide ? 'wide' : ''}" role="dialog"></div>`; $('#layer').append(ov); paintSheet();
}
function paintSheet() {
  const sh = $('.sheet'); if (!sh) return;
  const sb = $('.sh-b', sh), st = sb ? sb.scrollTop : 0;
  $$('input[name]', sh).forEach(i => ui.form[i.name] = i.value);
  const c = sheetFn();
  sh.innerHTML = `<div class="sh-h"><h3>${c.title}${c.sub ? `<small>${c.sub}</small>` : ''}</h3><button class="ib" data-a="close" aria-label="Закрыть">${ic('x', 22)}</button></div><div class="sh-b">${c.body}</div>${c.foot ? `<div class="sh-f">${c.foot}</div>` : ''}`;
  $('.sh-b', sh).scrollTop = st;
}
function closeSheet(now) {
  const ov = $('.ov'); sheetFn = null; if (!ov) return;
  if (now || reduced) ov.remove(); else { ov.classList.add('out'); setTimeout(() => ov.remove(), 280); }
}
const kv = a => `<div class="kv">${a.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;
const pick = (name, items, cur) => `<div class="pills" style="flex-wrap:wrap">${items.map(([v, l]) => `<button class="pill ${String(cur) === String(v) ? 'on' : ''}" data-a="fpick" data-k="${name}" data-v="${esc(v)}">${esc(l ?? v)}</button>`).join('')}</div>`;
const fld = (name, label, ph = '', mode = '') => `<div class="fld"><label>${label}</label><input name="${name}" value="${esc(ui.form[name] || '')}" placeholder="${ph}" ${mode ? `inputmode="${mode}"` : ''} autocomplete="off"></div>`;
const keypad = () => `<div class="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => `<button class="key ${k === '⌫' || k === '.' ? 'f' : ''}" data-a="key" data-k="${k}">${k}</button>`).join('')}</div>`;

const sProduct = id => () => {
  const p = prod(id), l = S.mv.filter(m => m.pid === id).sort((a, b) => b.ts - a.ts).slice(0, 4), c = expChip(p), T = { in: 'Приход', out: 'Расход', waste: 'Списание', inv: 'Инвентаризация' };
  return { title: esc(p.name), sub: `${esc(p.cat)} · ${esc(p.loc)}`, body: `${p.stock < p.min ? `<div class="card" style="background:var(--wnb);margin-bottom:12px;padding:14px">${ic('alert', 18)} Ниже минимума. <button class="btn xs" data-a="go" data-r="orders" style="margin-left:8px">В закупки</button></div>` : ''}
    ${kv([['Остаток', `${n1(p.stock)} ${p.unit}`], ['Минимум', `${n1(p.min)} ${p.unit}`], ['Срок годности', `${dm(p.exp)} · ${chip(c[0], c[1])}`], ['Цена', `${rub(p.price)} / ${p.unit}`], ['Стоимость остатка', rub(p.stock * p.price)], ['Поставщик', esc(vend(p.sup)?.name || '—')]])}
    <div class="g g3" style="gap:10px"><button class="btn ok" data-a="op" data-p="${id}" data-t="in">${ic('inbox', 20)}Приход</button><button class="btn bd" data-a="op" data-p="${id}" data-t="waste">${ic('trash', 20)}Списать</button><button class="btn" data-a="op" data-p="${id}" data-t="inv">${ic('edit', 20)}Пересчёт</button></div>
    <div class="sec">Последние операции</div><div class="list">${l.map(m => `<div class="li" style="min-height:52px"><span class="tx"><b>${T[m.type]}${m.reason && m.reason !== T[m.type] ? ' · ' + esc(m.reason) : ''}</b><small>${esc(emp(m.who)?.name || '')} · ${agoTs(m.ts)}</small></span><span class="end"><b>${m.type === 'in' ? '+' : m.type === 'inv' ? '=' : '−'}${n1(m.qty)} ${p.unit}</b></span></div>`).join('') || '<div class="mu" style="padding:8px 0">Операций пока нет</div>'}</div>` };
};
const REASONS = ['Истёк срок', 'Порча', 'Брак / возврат', 'Пересортица', 'Проба / персонал'];
const sOp = () => {
  const { pid, type } = ui.op, p = prod(pid), np = ui.np, q = parseFloat(np.val) || 0;
  const T = { in: ['Приход товара', 'Принять', 'ok'], out: ['Расход на кухню', 'Списать в расход', 'pri'], waste: ['Списание', 'Списать', 'bd'], inv: ['Пересчёт остатка', 'Сохранить', 'pri'] }[type];
  const after = type === 'in' ? p.stock + q : type === 'inv' ? q : Math.max(0, p.stock - q);
  return { title: T[0], sub: esc(p.name) + ' · сейчас ' + n1(p.stock) + ' ' + p.unit,
    body: `<div class="dsp ${type === 'waste' && q ? 'bd' : ''}"><b>${(np.val || '0').replace('.', ',')}</b><span>${p.unit}</span></div>
    <div style="text-align:center;color:var(--mu);margin-bottom:8px">${type === 'inv' ? 'Фактическое количество' : `Станет ${n1(after)} ${p.unit}`}${type === 'waste' && q ? ` · потери ${rub(q * p.price)}` : ''}</div>
    ${type === 'waste' ? `<div class="q">${REASONS.map(r => `<button class="pill ${ui.op.reason === r ? 'on' : ''}" data-a="reason" data-k="${r}">${r}</button>`).join('')}</div>` : ''}${keypad()}`,
    foot: `<button class="btn" data-a="close">Отмена</button><button class="btn ${T[2]} ${q > 0 || (type === 'inv' && np.val !== '') ? '' : 'off'}" data-a="opOk">${T[1]}</button>` };
};
const ACTS = ['Проверил дверь и уплотнитель', 'Перенёс продукты в другую камеру', 'Вызвал сервис', 'Повторный замер через 30 мин'];
const sTemp = () => {
  const t = S.temps.find(x => x.id === ui.tid), np = ui.np, has = np.val !== '' && np.val !== '.', v = has ? parseFloat((np.neg ? '-' : '') + np.val) : null, bad = has && !tOk(t, v);
  return { title: 'Замер температуры', sub: esc(t.name) + ' · норма ' + t.lo + '…' + t.hi + '°C',
    body: `<div style="display:flex;justify-content:center"><div class="seg"><button class="${np.neg ? '' : 'on'}" data-a="neg" data-v="0">Плюс</button><button class="${np.neg ? 'on' : ''}" data-a="neg" data-v="1">Минус</button></div></div>
    <div class="dsp ${bad ? 'bd' : ''}"><b>${np.neg ? '−' : ''}${(np.val || '0').replace('.', ',')}</b><span>°C</span></div>
    ${bad ? `<div style="text-align:center;color:var(--bd);font-weight:700;margin-bottom:10px">Вне нормы — выберите действие</div><div class="q">${ACTS.map(a => `<button class="pill ${np.act === a ? 'on' : ''}" data-a="act" data-k="${a}">${a}</button>`).join('')}</div>` : has ? `<div style="text-align:center;color:var(--ok);font-weight:700;margin-bottom:10px">В норме</div>` : ''}${keypad()}`,
    foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri ${has && (!bad || np.act) ? '' : 'off'}" data-a="tempOk">Записать</button>` };
};
const rq = (pid, q, unit, step) => `<div class="step"><button data-a="rq" data-p="${pid}" data-d="${-step}">${ic('minus', 18)}</button><b>${n1(q)} ${unit}</b><button data-a="rq" data-p="${pid}" data-d="${step}">${ic('plus', 18)}</button></div>`;
const sOrd = () => {
  const o = S.orders.find(x => x.id === ui.ordId), v = vend(o.sup), st = K.ST[o.st], rc = o.st === 'sent';
  return { title: esc(v.name), sub: `${st[1]} · ${dm(o.d)} · ${esc(emp(o.by)?.name || '')}`,
    body: `<div class="list">${o.items.map(i => { const p = prod(i.pid), got = ui.rcv[i.pid] ?? i.q; return `<div class="li"><span class="tx"><b>${esc(p.name)}</b><small>заказано ${n1(i.q)} ${p.unit}${o.st === 'received' ? ' · принято ' + n1(i.got ?? i.q) : ''} · ${rub(i.q * i.price)}</small></span><span class="end">${rc ? rq(i.pid, got, p.unit, stepOf(p)) : ''}</span></div>`; }).join('')}</div>
    <div class="bar-row" style="margin:14px 0 0"><span class="sp"></span><div style="text-align:right"><small class="mu">Сумма заявки</small><div style="font-size:26px;font-weight:800">${rub(oSum(o))}</div></div></div>`,
    foot: rc ? `<button class="btn" data-a="close">Позже</button><button class="btn ok" data-a="receive">${ic('inbox', 20)}Принять на склад</button>` : o.st === 'pending' && R().approve ? `<button class="btn pri" data-a="approve" data-id="${o.id}">Согласовать и отправить</button>` : '' };
};
const sRec = () => {
  const r = S.recipes.find(x => x.id === ui.rid), f = rFC(r), c = rCost(r), t = fcTone(f), po = rPortions(r), hint = Math.ceil(c / (S.targetFC / 100) / 10) * 10, $ = $money();
  return { title: esc(r.name), sub: `Тех. карта · ${r.ing.length} ингредиентов`,
    body: `${$ ? kv([['Цена блюда', rub(r.price)], ['Себестоимость', rub(c)], ['Food cost', `<span style="color:var(--${t === 'ok' ? 'ok' : t === 'wn' ? 'wn' : 'bd'})">${n1(f, 1)}%</span> <small class="mu">цель ${S.targetFC}%</small>`], ['Маржа с порции', rub(r.price - c)]]) : ''}
    ${$ ? `<div class="bar-row" style="margin:0 0 6px"><b>Цена в меню</b><span class="sp"></span><div class="step"><button data-a="rp" data-d="-10">${ic('minus', 18)}</button><b>${grp(r.price)}${NB}₽</b><button data-a="rp" data-d="10">${ic('plus', 18)}</button></div>${f > S.targetFC ? `<button class="btn sm" data-a="rpt" data-v="${hint}">Под цель: ${hint}${NB}₽</button>` : ''}</div>` : ''}
    <div class="sec">Состав на порцию</div><div class="list">${r.ing.map(i => { const p = prod(i.pid), ci = p.price * i.q; return `<div class="li" style="min-height:58px"><span class="tx"><b>${esc(p.name)}</b><small>${n1(i.q * (p.unit === 'шт' ? 1 : 1000), p.unit === 'шт' ? 2 : 0)} ${p.unit === 'шт' ? 'шт' : p.unit === 'кг' ? 'г' : 'мл'} · на складе ${n1(p.stock)} ${p.unit}</small></span><span class="end">${$ ? `<div style="width:90px">${bar(ci / c)}</div><b style="min-width:64px;text-align:right">${rub(ci)}</b>` : ''}</span></div>`; }).join('')}</div>
    <div class="bar-row" style="margin:14px 0 0">${chip(po === 0 ? 'bd' : po < 8 ? 'wn' : 'ok', 'Хватит на ' + po + NB + pl(po, ['порцию', 'порции', 'порций']))}</div>`,
    foot: `<button class="btn" data-a="close">Закрыть</button><button class="btn pri ${po ? '' : 'off'}" data-a="cook">${ic('flame', 20)}Списать порцию</button>` };
};
const sEmp = () => {
  const e = emp(ui.eid), m = medState(e), sc = e.week.map((c, i) => `<span class="chip ${c === 'Д' ? 'in' : c === 'В' ? 'ac' : ''}" style="${i === K.dow() ? 'outline:2px solid var(--ac)' : ''}">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]} ${c === '-' ? '·' : c}</span>`).join('');
  return { title: esc(e.name), sub: esc(e.pos),
    body: `<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">${avatar(e, 'lg')}<div>${e.on ? chip('ok', 'на смене с ' + e.since) : chip('', 'не на смене')}<div style="margin-top:8px">${m ? chip(m[0], m[1]) : ''}</div></div></div>
    ${kv([['Телефон', `<a href="tel:${esc(e.phone.replace(/[^+\d]/g, ''))}" style="color:var(--tx);text-decoration:none">${esc(e.phone)}</a>`], ['Смена сегодня', todayLabel(e)], ['Часов в месяце', e.hours + ' ч'], ['Ставка', $money() ? rub(e.rate) + ' / ч' : '•••']])}
    <div class="sec">График недели</div><div class="q" style="justify-content:flex-start">${sc}</div>`,
    foot: `${R().staffEdit || e.id === me().id ? `<button class="btn ${e.on ? 'bd' : 'ok'}" data-a="clock">${ic('clock', 20)}${e.on ? 'Отметить уход' : 'Отметить приход'}</button>` : ''}<a class="btn" href="tel:${esc(e.phone.replace(/[^+\d]/g, ''))}">${ic('phone', 20)}Позвонить</a>` };
};
const todayLabel = e => { const c = K.todayShift(e); return c === 'Д' ? 'День 09–17' : c === 'В' ? 'Вечер 15–23' : 'Выходной'; };
const sVen = () => {
  const v = vend(ui.vid), con = v.kind === 'contractor';
  if (!con) return { title: esc(v.name), sub: esc(v.type), body: `${kv([['Контакт', esc(v.contact)], ['Телефон', esc(v.phone)], ['Доставка', esc(v.days)], ['Условия', esc(v.terms)], ['Мин. заказ', rub(v.minOrder)], ['Задолженность', rub(v.debt)]])}${v.note ? `<div class="mu">${esc(v.note)}</div>` : ''}<div style="margin-top:10px">${stars(v.rating)}</div>`, foot: `<a class="btn" href="tel:${esc(v.phone.replace(/[^+\d]/g, ''))}">${ic('phone', 20)}Позвонить</a><button class="btn pri" data-a="go" data-r="orders">${ic('cart', 20)}К закупкам</button>` };
  const d = dd(nextVisit(v));
  return { title: esc(v.name), sub: `${TYPE[v.type][1]} · ${esc(v.svc)}`,
    body: `${d < 0 ? `<div class="card" style="background:var(--bdb);margin-bottom:12px;padding:14px">${ic('alert', 18)} Плановый визит просрочен на ${-d} ${pl(-d, ['день', 'дня', 'дней'])}</div>` : ''}
    ${kv([['Контакт', esc(v.contact)], ['Телефон', esc(v.phone)], ['Периодичность', 'раз в ' + v.freq + NB + pl(v.freq, ['день', 'дня', 'дней'])], ['Последний визит', rel(v.last)], ['Следующий визит', dm(nextVisit(v)) + ' · ' + rel(nextVisit(v))], ['Договор до', dm(v.till) + ' · ' + rel(v.till)]])}
    ${v.note ? `<div class="mu" style="margin-bottom:8px">${esc(v.note)}</div>` : ''}<div>${stars(v.rating)}</div>
    <div class="sec">История визитов и акты</div><div class="list">${v.visits.slice(0, 5).map(x => `<div class="li" style="min-height:52px"><span class="ico ok">${ic('doc', 20)}</span><span class="tx"><b>${esc(x.t)}</b><small>${dm(x.d)} · ${rel(x.d)}</small></span></div>`).join('')}</div>`,
    foot: `<a class="btn" href="tel:${esc(v.phone.replace(/[^+\d]/g, ''))}">${ic('phone', 20)}Позвонить</a>${R().vendorEdit ? `<button class="btn ok" data-a="visit" data-id="${v.id}">${ic('check', 20)}Визит выполнен</button>` : ''}` };
};
const NOTES = ['Замечаний нет', 'Есть замечания', 'Акт подписан', 'Нужен повторный визит'];
const sVisit = () => { const v = vend(ui.vid), s = ui.vs; return { title: 'Визит выполнен', sub: esc(v.name),
  body: `<div class="sec" style="margin-top:4px">Оценка работы</div><div class="q" style="justify-content:flex-start">${[1, 2, 3, 4, 5].map(i => `<button class="ib" style="width:58px;height:58px;color:${i <= s.rating ? 'var(--ac2)' : 'var(--mu2)'}" data-a="vrate" data-v="${i}">${ic('star', 26).replace('fill="none"', i <= s.rating ? 'fill="currentColor"' : 'fill="none"')}</button>`).join('')}</div>
  <div class="sec">Итог</div><div class="q" style="justify-content:flex-start">${NOTES.map(n => `<button class="pill ${s.note === n ? 'on' : ''}" data-a="vnote" data-k="${n}">${n}</button>`).join('')}</div>`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn ok ${s.note ? '' : 'off'}" data-a="visitOk">Сохранить визит</button>` }; };
const sNewProd = () => { const f = ui.form, cats = [...new Set(S.products.map(p => p.cat))]; return { title: 'Новая позиция', sub: 'Добавьте продукт на склад',
  body: `${fld('name', 'Название', 'Например, Сёмга')}<div class="sec" style="margin-top:0">Категория</div>${pick('cat', cats.map(c => [c, c]), f.cat || cats[0])}<div class="sec">Единица</div>${pick('unit', ['кг', 'л', 'шт', 'уп'].map(c => [c, c]), f.unit || 'кг')}
  <div class="fr" style="margin-top:14px">${fld('stock', 'Остаток', '0', 'decimal')}${fld('min', 'Минимум', '0', 'decimal')}</div>${fld('price', 'Цена за единицу, ₽', '0', 'decimal')}<div class="sec" style="margin-top:0">Поставщик</div>${pick('sup', S.vendors.filter(v => v.kind === 'supplier').map(v => [v.id, v.name]), f.sup || 's1')}`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="saveProd">Добавить</button>` }; };
const POS = [['Повар горячего цеха', 'kitchen'], ['Повар холодного цеха', 'kitchen'], ['Повар-заготовщик', 'kitchen'], ['Кондитер', 'kitchen'], ['Мойщик посуды', 'kitchen'], ['Официант', 'hall'], ['Бариста', 'hall']];
const sNewEmp = () => ({ title: 'Новый сотрудник', sub: 'Добавится в команду и график',
  body: `${fld('name', 'Имя и фамилия', 'Например, Иван Петров')}<div class="sec" style="margin-top:0">Должность</div>${pick('pos', POS.map(p => [p[0], p[0]]), ui.form.pos || POS[0][0])}<div class="fr" style="margin-top:14px">${fld('phone', 'Телефон', '+7 ')}${fld('rate', 'Ставка, ₽/ч', '350', 'numeric')}</div>`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="saveEmp">Добавить</button>` });
const sNewVen = () => { const f = ui.form, con = (f.kind || 'contractor') === 'contractor'; return { title: 'Новый контрагент', sub: 'Подрядчик или поставщик',
  body: `${pick('kind', [['contractor', 'Подрядная организация'], ['supplier', 'Поставщик продуктов']], f.kind || 'contractor')}<div style="height:14px"></div>${fld('name', 'Название', 'ООО «…»')}${con ? `<div class="sec" style="margin-top:0">Вид услуги</div>${pick('type', Object.entries(TYPE).map(([k, v]) => [k, v[1]]), f.type || 'clean')}<div class="sec">Как часто визиты</div>${pick('freq', [[1, 'Ежедневно'], [7, 'Раз в неделю'], [30, 'Раз в месяц'], [90, 'Раз в квартал'], [180, 'Раз в полгода']], f.freq || 30)}` : ''}<div class="fr" style="margin-top:14px">${fld('contact', 'Контактное лицо')}${fld('phone', 'Телефон', '+7 ')}</div>`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="saveVen">Добавить</button>` }; };
const sBell = () => { const a = ui.alerts = alerts(); return { title: 'Уведомления', sub: a.length ? a.length + ' ' + pl(a.length, ['задача', 'задачи', 'задач']) + ' требуют внимания' : 'Всё спокойно',
  body: `<div class="list">${a.map((x, i) => `<button class="li" data-a="alert" data-i="${i}"><span class="ico ${x.tone}">${ic(x.ic, 22)}</span><span class="tx"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><span class="end">${ic('arrow', 18)}</span></button>`).join('') || `<div class="empty">${ic('check', 36)}<div>Замечаний нет</div></div>`}</div>` }; };
const sMe = () => { const u = me(); return { title: 'Профиль и настройки', sub: esc(S.venue),
  body: `<div class="sec" style="margin-top:4px">Войти как</div><div class="list">${Object.entries(ROLES).map(([id, r]) => `<button class="li" data-a="role" data-id="${id}"><span class="ico ${S.role === id ? 'ac' : ''}">${ic(r.ic, 22)}</span><span class="tx"><b>${r.n}</b><small>${esc(r.d)}</small></span><span class="end">${S.role === id ? chip('ac', 'сейчас') : ''}</span></button>`).join('')}</div>
  <div class="sec">Целевой food cost</div><div class="bar-row" style="margin:0"><div class="step"><button data-a="tfc" data-d="-1">${ic('minus', 18)}</button><b>${S.targetFC}%</b><button data-a="tfc" data-d="1">${ic('plus', 18)}</button></div><span class="sp"></span><button class="btn bd sm" data-a="reset">Сбросить демо-данные</button></div>` }; };

/* ───── роутер ───── */
function enter() {
  $('#gate').hidden = true; $('#app').hidden = false; ui.route = K.QS.get('route') || 'home'; if (K.QS.get('tab')) ui.tab[ui.route] = K.QS.get('tab');
  render(true);
}
function gate() {
  const g = $('#gate'); g.hidden = false; g.className = 'enter';
  g.innerHTML = `<div class="gt"><h1 data-s>Kitchen Control</h1><p data-s>${esc(S.venue)} · выберите, кто работает на планшете</p><div class="gt-g">${Object.entries(ROLES).map(([id, r]) => `<button class="role" data-s data-a="role" data-id="${id}"><span class="ri">${ic(r.ic, 28)}</span><b>${r.n}</b><span>${esc(r.d)}</span><em>${esc(S.staff.find(e => e.id === r.user).name)}</em></button>`).join('')}</div></div>`;
  $$('[data-s]', g).forEach((el, i) => el.style.setProperty('--i', i));
}
function setRole(id) { S.role = id; persist(); ui.route = 'home'; closeSheet(true); if (!$('#gate').hidden) { $('#gate').hidden = true; $('#app').hidden = false; } render(true); }

/* ───── действия ───── */
const draftSet = (pid, q) => { ui.draft[pid] = Math.max(0, Math.round(q * 100) / 100); };
const A = {
  go: el => go(el.dataset.r, el.dataset.tab),
  close: () => closeSheet(),
  tab: el => { ui.tab[el.dataset.v] = el.dataset.k; ui.q = ''; render(true); },
  cat: el => { ui.cat = el.dataset.k; render(false); },
  flt: el => { ui.f = ui.f === el.dataset.k ? 'all' : el.dataset.k; render(false); },
  theme: () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = S.theme; refresh(); },
  bell: () => openSheet(sBell), me: () => openSheet(sMe),
  role: el => setRole(el.dataset.id),
  alert: el => { const x = ui.alerts[+el.dataset.i]; if (!x) return; go(x.go, x.tab); if (x.emp) { ui.eid = x.emp; openSheet(sEmp); } if (x.ven) { ui.vid = x.ven; openSheet(sVen); } },
  prod: el => openSheet(sProduct(el.dataset.id)),
  op: el => { const p = prod(el.dataset.p); ui.op = { pid: p.id, type: el.dataset.t, reason: 'Истёк срок' }; ui.np = { val: el.dataset.t === 'inv' ? String(p.stock) : '', neg: false, act: '' }; openSheet(sOp); },
  key: el => { const k = el.dataset.k, np = ui.np; if (k === '⌫') np.val = np.val.slice(0, -1); else if (k === '.') { if (!np.val.includes('.')) np.val = (np.val || '0') + '.'; } else if (np.val.replace('.', '').length < 6) np.val = np.val === '0' ? k : np.val + k; paintSheet(); },
  neg: el => { ui.np.neg = el.dataset.v === '1'; paintSheet(); },
  act: el => { ui.np.act = el.dataset.k; paintSheet(); },
  reason: el => { ui.op.reason = el.dataset.k; paintSheet(); },
  opOk: () => {
    const { pid, type, reason } = ui.op, p = prod(pid), q = parseFloat(ui.np.val); if (isNaN(q)) return;
    if (type === 'in') { if (p.stock <= 0) p.exp = day(p.sh); p.stock += q; } else if (type === 'inv') p.stock = q; else p.stock = Math.max(0, p.stock - q);
    S.mv.unshift({ id: 'm' + (++S.seq), ts: Date.now(), type, pid, qty: q, who: me().id, reason: type === 'in' ? 'Приёмка' : type === 'inv' ? 'Инвентаризация' : type === 'out' ? 'Приготовлено' : reason });
    closeSheet(); refresh(); toast(type === 'in' ? `Принято ${n1(q)} ${p.unit} · ${esc(p.name)}` : type === 'inv' ? 'Остаток обновлён' : `Списано ${n1(q)} ${p.unit} · ${esc(p.name)}`);
  },
  temp: el => { ui.tid = el.dataset.id; ui.np = { val: '', neg: S.temps.find(t => t.id === ui.tid).hi < 0, act: '' }; openSheet(sTemp); },
  tempOk: () => { const t = S.temps.find(x => x.id === ui.tid), np = ui.np, v = parseFloat((np.neg ? '-' : '') + np.val); if (isNaN(v)) return; t.log.push({ ts: Date.now(), v, who: me().id, act: tOk(t, v) ? '' : np.act }); if (t.log.length > 14) t.log.shift(); closeSheet(); refresh(); toast(tOk(t, v) ? 'Замер записан — в норме' : 'Отклонение записано в журнал', tOk(t, v) ? '' : 'bd'); },
  dq: el => { const p = prod(el.dataset.p); draftSet(p.id, (ui.draft[p.id] ?? sugQty(p)) + +el.dataset.d); render(false); },
  sendOrder: el => {
    const sid = el.dataset.s, ls = (K.suggestions()[sid] || []).filter(l => l.q > 0); if (!ls.length) return;
    const ap = R().approve; S.orders.unshift({ id: 'o' + (++S.seq), sup: sid, st: ap ? 'sent' : 'pending', d: day(0), eta: day(1), by: me().id, items: ls.map(l => ({ pid: l.p.id, q: l.q, price: l.p.price })) });
    ls.forEach(l => delete ui.draft[l.p.id]); ui.tab.orders = 'list'; persist(); render(true); toast(ap ? `Заявка отправлена · ${esc(vend(sid).name)}` : 'Заявка ушла на согласование');
  },
  approve: el => { const o = S.orders.find(x => x.id === el.dataset.id); o.st = 'sent'; o.eta = day(1); closeSheet(); refresh(); toast('Заявка согласована и отправлена'); },
  allOrders: () => { ui.allOrders = true; render(false); },
  ord: el => { ui.ordId = el.dataset.id; ui.rcv = {}; openSheet(sOrd); },
  rq: el => { const o = S.orders.find(x => x.id === ui.ordId), i = o.items.find(x => x.pid === el.dataset.p); ui.rcv[i.pid] = Math.max(0, Math.round(((ui.rcv[i.pid] ?? i.q) + +el.dataset.d) * 100) / 100); paintSheet(); },
  receive: () => {
    const o = S.orders.find(x => x.id === ui.ordId); let diff = 0;
    o.items.forEach(i => { const got = ui.rcv[i.pid] ?? i.q, p = prod(i.pid); i.got = got; if (got !== i.q) diff++; if (got > 0) { if (p.stock <= 0) p.exp = day(p.sh); p.stock += got; S.mv.unshift({ id: 'm' + (++S.seq), ts: Date.now(), type: 'in', pid: p.id, qty: got, who: me().id, reason: 'Приёмка' }); } });
    o.st = 'received'; o.rcv = day(0); closeSheet(); refresh(); toast(diff ? `Принято с расхождением: ${diff} ${pl(diff, ['позиция', 'позиции', 'позиций'])}` : 'Товар принят на склад');
  },
  rec: el => { ui.rid = el.dataset.id; openSheet(sRec); },
  rp: el => { const r = S.recipes.find(x => x.id === ui.rid); r.price = Math.max(10, r.price + +el.dataset.d); refresh(); },
  rpt: el => { S.recipes.find(x => x.id === ui.rid).price = +el.dataset.v; refresh(); toast('Цена обновлена под целевой food cost'); },
  cook: () => { const r = S.recipes.find(x => x.id === ui.rid); if (!rPortions(r)) return; r.ing.forEach(i => { const p = prod(i.pid); p.stock = Math.max(0, Math.round((p.stock - i.q) * 1000) / 1000); S.mv.unshift({ id: 'm' + (++S.seq), ts: Date.now(), type: 'out', pid: p.id, qty: i.q, who: me().id, reason: 'Приготовлено' }); }); refresh(); toast('Порция списана со склада по тех. карте'); },
  emp: el => { ui.eid = el.dataset.id; openSheet(sEmp); },
  clock: () => { const e = emp(ui.eid); e.on = !e.on; e.since = e.on ? hm(Date.now()) : ''; refresh(); toast(e.on ? `${esc(e.name.split(' ')[0])} на смене` : `${esc(e.name.split(' ')[0])} закончил(а) смену`); },
  shift: el => { const e = emp(el.dataset.e), i = +el.dataset.d, o = ['-', 'Д', 'В']; e.week[i] = o[(o.indexOf(e.week[i]) + 1) % 3]; refresh(); },
  ven: el => { ui.vid = el.dataset.id; openSheet(sVen); },
  visit: el => { ui.vid = el.dataset.id; ui.vs = { rating: vend(ui.vid).rating, note: '' }; openSheet(sVisit); },
  vrate: el => { ui.vs.rating = +el.dataset.v; paintSheet(); }, vnote: el => { ui.vs.note = el.dataset.k; paintSheet(); },
  visitOk: () => { const v = vend(ui.vid); v.last = day(0); v.rating = ui.vs.rating; v.visits.unshift({ d: day(0), t: ui.vs.note }); closeSheet(); refresh(); toast(`Визит отмечен · следующий ${dm(nextVisit(v))}`); },
  ck: el => { const c = S.checklists.find(x => x.id === el.dataset.c), i = +el.dataset.i; if (c.by) return; const k = c.done.indexOf(i); k < 0 ? c.done.push(i) : c.done.splice(k, 1); refresh(); },
  sign: el => { const c = S.checklists.find(x => x.id === el.dataset.c); c.by = me().name; c.at = hm(Date.now()); refresh(); toast(`${c.name}: подписано`); },
  fpick: el => { ui.form[el.dataset.k] = el.dataset.v; paintSheet(); },
  newProd: () => openSheet(sNewProd), newEmp: () => openSheet(sNewEmp), newVen: () => openSheet(sNewVen),
  saveProd: () => { paintSheet(); const f = ui.form, name = (f.name || '').trim(); if (!name) return toast('Введите название', 'bd'); const cats = [...new Set(S.products.map(p => p.cat))];
    S.products.push({ id: 'p' + (++S.seq), name, cat: f.cat || cats[0], unit: f.unit || 'кг', stock: parseFloat(f.stock) || 0, min: parseFloat(f.min) || 0, price: parseFloat(f.price) || 0, sup: f.sup || 's1', exp: day(14), sh: 14, loc: 'Склад' }); closeSheet(); refresh(); toast('Позиция добавлена'); },
  saveEmp: () => { paintSheet(); const f = ui.form, name = (f.name || '').trim(); if (!name) return toast('Введите имя', 'bd'); const pos = f.pos || POS[0][0];
    S.staff.push({ id: 'e' + (++S.seq), name, pos, grp: POS.find(p => p[0] === pos)[1], med: day(365), phone: f.phone || '', rate: parseFloat(f.rate) || 0, week: 'ДДДДД--'.split(''), hours: 0, on: false, since: '' }); closeSheet(); refresh(); toast('Сотрудник добавлен'); },
  saveVen: () => { paintSheet(); const f = ui.form, name = (f.name || '').trim(); if (!name) return toast('Введите название', 'bd'); const con = (f.kind || 'contractor') === 'contractor';
    S.vendors.push(con ? { id: 'c' + (++S.seq), kind: 'contractor', name, type: f.type || 'clean', svc: TYPE[f.type || 'clean'][1], contact: f.contact || '—', phone: f.phone || '', freq: +(f.freq || 30), last: day(0), till: day(365), rating: 5, note: '', visits: [] } : { id: 's' + (++S.seq), kind: 'supplier', name, type: 'Поставщик', contact: f.contact || '—', phone: f.phone || '', days: 'По заявке', minOrder: 0, terms: 'по факту', debt: 0, rating: 5, note: '' }); closeSheet(); refresh(); toast('Контрагент добавлен'); },
  tfc: el => { S.targetFC = Math.max(15, Math.min(60, S.targetFC + +el.dataset.d)); refresh(); },
  reset: () => { if (confirm('Сбросить все данные и вернуть демо?')) { try { localStorage.removeItem('kc.v1'); } catch (e) {} location.reload(); } },
};

document.addEventListener('click', e => {
  const ov = e.target.closest('.ov'); if (ov && e.target === ov) return closeSheet();
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = A[el.dataset.a]; if (f) f(el, e);
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.in; if (k === 'q') { ui.q = e.target.value; render(false); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
setInterval(() => { const c = $('#clk'); if (c) c.textContent = hm(Date.now()); }, 15000);

/* ───── запуск ───── */
document.documentElement.dataset.theme = S.theme;
const qr = K.QS.get('role'); if (qr && ROLES[qr]) S.role = qr;
if (K.QS.get('theme')) { S.theme = K.QS.get('theme'); document.documentElement.dataset.theme = S.theme; }
const sp = $('#splash');
let started = false;
const start = () => { if (started) return; started = true; sp.classList.add('out'); setTimeout(() => sp.remove(), 750); S.role ? enter() : gate(); };
if (K.QS.has('nosplash')) { sp.remove(); started = true; S.role ? enter() : gate(); }
else { sp.addEventListener('click', start); setTimeout(start, 3100); }
K.render = render; K.go = go; K.A = A; K.toast = toast; K.openSheet = openSheet; K.sheets = { sProduct, sOp, sTemp, sOrd, sRec, sEmp, sVen, sVisit, sNewProd, sNewEmp, sNewVen, sBell, sMe };
})();
