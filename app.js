/* Kitchen Control — оболочка: вход по PIN, роутер, шторки, действия, отмена, голос, фото, синхронизация. */
(() => {
const K = window.KC, S = K.S(), ui = K.ui;
const { $, $$, ic, esc, NB, grp, n1, rub, pl, dm, rel, agoTs, hm, avatar, dd, day, addDays, prod, vend, emp, nextVisit, expChip, rCost, rFC, rPortions, fcTone, mvCost, oSum, tLast, tOk, medState, sugQty, stepOf, feed, chip, stars, ROLES, NAV, R, me, $money, TYPE, reduced } = K;
ui.np = { val: '', neg: false, act: '', photo: null }; ui.form = {}; ui.rcv = {}; ui.vs = { rating: 5, note: '' }; ui.pin = { id: '', val: '', err: false, mode: 'login' };
let sheetFn = null, authed = false, undoSnap = null;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

/* ───── утилиты ───── */
function toast(msg, tone = '', undo) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast ' + tone;
  t.innerHTML = ic(tone === 'bd' ? 'alert' : 'check', 22) + '<span>' + msg + '</span>' + (undo ? '<button class="tbtn" data-a="undo">Отменить</button>' : '');
  if (undo) { undoSnap = undo; t.style.animation = 'toastIn .6s var(--spring),toastOut .4s 7.6s var(--ease) forwards'; }
  $('#layer').append(t); setTimeout(() => t.remove(), undo ? 8200 : 3200);
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
function replaceState(data) { const keep = {}; K.DEV.forEach(k => keep[k] = S[k]); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, data, keep); K.rollover(); }
function commit(msg, fn, tone) { const snap = JSON.stringify(S); fn(); closeSheet(); refresh(); toast(msg, tone || '', snap); }
function prunePhotos(keep = 25) {
  const l = [...S.mv.filter(m => m.ph).map(m => ({ t: m.ts, o: m })), ...S.orders.filter(o => o.ph).map(o => ({ t: Date.parse(o.d), o }))].sort((a, b) => b.t - a.t);
  l.slice(keep).forEach(x => delete x.o.ph);
}
function readPhoto(file, cb) {
  const r = new FileReader();
  r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 560 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .55)); }; im.src = r.result; };
  r.readAsDataURL(file);
}

/* ───── голосовой ввод: «списать два килограмма свинины» ───── */
const NUMW = { ноль: 0, один: 1, одну: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, полтора: 1.5, пол: .5, половину: .5 };
function parseVoice(text, def = 'waste') {
  const t = text.toLowerCase().replace(/ё/g, 'е').replace(/,/g, '.'); let q = null;
  const m = t.match(/\d+(\.\d+)?/); if (m) q = parseFloat(m[0]); else for (const w of t.split(/\s+/)) if (NUMW[w] != null) { q = NUMW[w]; break; }
  let best = null, bs = 0;
  S.products.forEach(p => { const s = p.name.toLowerCase().replace(/ё/g, 'е').split(/[\s,]+/).filter(w => w.length >= 3).reduce((a, w) => a + (t.includes(w.slice(0, Math.max(3, w.length - 2))) ? 1 : 0), 0); if (s > bs) { bs = s; best = p; } });
  const tg = t.replace(/килограмм\w*|кило\w*|кг/g, ' ');
  if (best && q != null && /грамм|(^|\s)г(\s|$)/.test(tg) && ['кг', 'л'].includes(best.unit)) q = q / 1000;
  return { p: best, q, t: /в работу|взять|взяли|расход/.test(t) ? 'out' : def };
}

/* ───── оболочка ───── */
const TABS_TITLE = { lists: 'Мои задачи', temps: 'Температуры' };
function renderSide() {
  const r = R(), u = me(); $('#app').classList.toggle('noside', !!r.cook);
  if (!$('#side .nav')) $('#side').innerHTML = `<div class="brand"><svg viewBox="0 0 100 100"><defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a1f"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs><rect width="100" height="100" rx="26" fill="url(#bg1)"/><path d="M50 22c3 11 17 15 17 31a17 17 0 0 1-34 0c0-7 3-11 7-15 0 6 3 10 7 10 0-12-4-19 3-26z" fill="#1d0d02"/></svg><div><b>Kitchen<br>Control</b></div></div><nav class="nav"><i class="nav-ind"></i></nav>`;
  const f = feed(), cnt = k => f.filter(x => x.k === k).length;
  const bd = { stock: K.lowList().length, orders: cnt('appr') + cnt('recv'), checks: S.temps.filter(t => !tOk(t)).length + K.tempDue().length + cnt('ven'), team: cnt('med') };
  const nv = $('#side .nav'); $$('.nav-i', nv).forEach(b => b.remove());
  nv.insertAdjacentHTML('beforeend', r.nav.map(id => `<button class="nav-i ${id === ui.route ? 'on' : ''}" data-a="go" data-r="${id}">${ic(NAV[id][1], 24)}<span>${NAV[id][0]}</span>${bd[id] ? `<em class="bg ${id === 'stock' ? 'wn' : ''}" style="font-style:normal">${bd[id]}</em>` : ''}</button>`).join(''));
  const i = Math.max(0, r.nav.indexOf(ui.route)); $('.nav-ind').style.transform = `translateY(${i * 56}px)`;
  const on = $('.nav-i.on'); if (on && on.scrollIntoView && innerWidth <= 640) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
function renderTop() {
  const d = new Date(), r = R(), u = me(), n = feed().length;
  let title = ui.route === 'home' ? 'Главная' : NAV[ui.route][0]; if (r.cook && ui.route === 'checks') title = TABS_TITLE[ui.tab.checks] || title;
  $('#top').innerHTML = `${r.cook && ui.route !== 'home' ? `<button class="ib" data-a="go" data-r="home" aria-label="Назад">${ic('back', 22)}</button>` : ''}<div><h2>${title}</h2><div class="sub">${esc(S.venue)}<span class="hd-d"> · ${d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>${S.sync ? ' · ' + ic('check', 12) + ' общие данные' : ''}</div></div><span class="sp"></span>
  <button class="ib" data-a="bell" aria-label="Что сделать">${ic('bell', 22)}${n ? `<span class="dot">${n}</span>` : ''}</button>
  <button class="usr" data-a="me" aria-label="Профиль">${avatar({ ...u, on: false })}<div><b>${esc(u.name.split(' ')[0])}</b><small>${r.n}</small></div></button>`;
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
function go(r, tab) {
  [r, tab] = K.alias(r, tab); if (!R().nav.includes(r)) r = 'home';
  ui.route = r; if (tab) ui.tab[r] = tab; ui.q = ''; ui.f = 'all'; ui.cat = 'Все'; closeSheet(true); render(true);
}
const refresh = () => { persist(); render(false); if (sheetFn) paintSheet(); };

/* ───── шторки ───── */
function openSheet(fn, o = {}) {
  closeSheet(true); sheetFn = fn; ui.form = {};
  const ov = document.createElement('div'); ov.className = 'ov' + (o.mid ? ' mid' : '');
  ov.innerHTML = `<div class="sheet ${o.wide ? 'wide' : ''}" role="dialog"></div>`; $('#layer').append(ov); paintSheet();
}
function paintSheet() {
  const sh = $('.sheet'); if (!sh) return;
  const sb = $('.sh-b', sh), st = sb ? sb.scrollTop : 0, fa = document.activeElement, fname = fa && fa.name && sh.contains(fa) ? fa.name : '', pos = fa && fa.selectionStart;
  $$('input[name]', sh).forEach(i => ui.form[i.name] = i.value);
  const c = sheetFn();
  sh.innerHTML = `<div class="sh-h"><h3>${c.title}${c.sub ? `<small>${c.sub}</small>` : ''}</h3><button class="ib" data-a="close" aria-label="Закрыть">${ic('x', 22)}</button></div><div class="sh-b">${c.body}</div>${c.foot ? `<div class="sh-f">${c.foot}</div>` : ''}`;
  $('.sh-b', sh).scrollTop = st;
  if (fname) { const n = sh.querySelector(`[name="${fname}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
}
function closeSheet(now) {
  const ov = $('.ov'); sheetFn = null; if (!ov) return;
  if (now || reduced) ov.remove(); else { ov.classList.add('out'); setTimeout(() => ov.remove(), 280); }
}
const kv = a => `<div class="kv">${a.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;
const pick = (name, items, cur) => `<div class="pills" style="flex-wrap:wrap">${items.map(([v, l]) => `<button class="pill ${String(cur) === String(v) ? 'on' : ''}" data-a="fpick" data-k="${name}" data-v="${esc(v)}">${esc(l ?? v)}</button>`).join('')}</div>`;
const fld = (name, label, ph = '', mode = '') => `<div class="fld"><label>${label}</label><input name="${name}" value="${esc(ui.form[name] || '')}" placeholder="${ph}" ${mode ? `inputmode="${mode}"` : ''} autocomplete="off"></div>`;
const keypad = () => `<div class="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => `<button class="key ${k === '⌫' || k === '.' ? 'f' : ''}" data-a="key" data-k="${k}">${k}</button>`).join('')}</div>`;
const photoBtn = (kind, url) => `<div class="q" style="align-items:center">${url ? `<img class="thumb big" src="${url}" alt="фото"><button class="btn xs" data-a="photoX" data-k="${kind}">Убрать фото</button>` : `<label class="btn sm photo">${ic('camera', 20)}Добавить фото<input type="file" accept="image/*" capture="environment" data-photo="${kind}" hidden></label>`}</div>`;

const sProduct = id => () => {
  const p = prod(id), l = S.mv.filter(m => m.pid === id).sort((a, b) => b.ts - a.ts).slice(0, 4), c = expChip(p), T = { in: 'Приход', out: 'В работу', waste: 'Списание', inv: 'Пересчёт' };
  return { title: esc(p.name), sub: `${esc(p.cat)} · ${esc(p.loc)}`, body: `${p.stock < p.min ? `<div class="card" style="background:var(--wnb);margin-bottom:12px;padding:14px">${ic('alert', 18)} Заканчивается. ${R().nav.includes('orders') ? `<button class="btn xs" data-a="go" data-r="orders" style="margin-left:8px">Заказать</button>` : ''}</div>` : ''}
    ${kv([['Осталось', `${n1(p.stock)} ${p.unit}`], ['Минимум', `${n1(p.min)} ${p.unit}`], ['Срок годности', `${dm(p.exp)} · ${chip(c[0], c[1])}`], ['Цена', `${rub(p.price)} / ${p.unit}`], ['Стоимость остатка', rub(p.stock * p.price)], ['Поставщик', esc(vend(p.sup)?.name || '—')]])}
    <div class="g g3" style="gap:10px"><button class="btn bd" data-a="op" data-p="${id}" data-t="waste">${ic('trash', 20)}Списать</button><button class="btn" data-a="op" data-p="${id}" data-t="out">${ic('knife', 20)}В работу</button><button class="btn ok" data-a="op" data-p="${id}" data-t="in">${ic('inbox', 20)}Приход</button></div>
    <div style="margin-top:10px"><button class="btn wide" data-a="op" data-p="${id}" data-t="inv">${ic('edit', 20)}Пересчитать остаток</button></div>
    <div class="sec">Последние операции</div><div class="list">${l.map(m => `<div class="li" style="min-height:52px"><span class="tx"><b>${T[m.type]}${m.reason && m.reason !== T[m.type] ? ' · ' + esc(m.reason) : ''}</b><small>${esc(emp(m.who)?.name || '')} · ${agoTs(m.ts)}</small></span><span class="end">${m.ph ? `<img class="thumb" src="${m.ph}" alt="фото">` : ''}<b>${m.type === 'in' ? '+' : m.type === 'inv' ? '=' : '−'}${n1(m.qty)} ${p.unit}</b></span></div>`).join('') || '<div class="mu" style="padding:8px 0">Операций пока нет</div>'}</div>` };
};
const sPick = () => {
  const t = ui.pick.t, q = (ui.form.pq || '').toLowerCase().replace(/ё/g, 'е'); let l = S.products.filter(p => !q || p.name.toLowerCase().replace(/ё/g, 'е').includes(q)).sort((a, b) => a.exp.localeCompare(b.exp)); const more = l.length - 8; if (!q) l = l.slice(0, 8);
  return { title: t === 'waste' ? 'Что списываем?' : 'Что берём в работу?', sub: q ? '' : 'Сверху то, что скорее испортится',
    body: `<div class="bar-row" style="margin-bottom:10px"><label class="search" style="max-width:none;flex:1">${ic('search', 20)}<input name="pq" value="${esc(ui.form.pq || '')}" placeholder="Начните печатать название" autocomplete="off"></label>${SR ? `<button class="btn ${ui.listening ? 'pri' : ''}" data-a="voice" aria-label="Сказать голосом">${ic('mic', 22)}${ui.listening ? 'Слушаю…' : 'Голосом'}</button>` : ''}</div>
    ${SR ? `<div class="mu" style="font-size:13px;margin:-2px 0 8px">Можно сказать: «${t === 'waste' ? 'списать два килограмма свинины' : 'взять килограмм говядины'}»</div>` : ''}
    <div class="list">${l.map(p => { const c = expChip(p); return `<button class="li" data-a="op" data-p="${p.id}" data-t="${t}"><span class="tx"><b>${esc(p.name)}</b><small>${n1(p.stock)} ${p.unit} · ${esc(p.loc)}</small></span><span class="end">${chip(c[0], c[1])}${ic('arrow', 18)}</span></button>`; }).join('') || '<div class="empty">Ничего не найдено</div>'}</div>${!q && more > 0 ? `<div class="mu" style="padding:8px 4px">…и ещё ${more}. Найдите по названию.</div>` : ''}` };
};
const REASONS = ['Истёк срок', 'Порча', 'Брак / возврат', 'Пересортица', 'Проба / персонал'];
const sOp = () => {
  const { pid, type } = ui.op, p = prod(pid), np = ui.np, q = parseFloat(np.val) || 0;
  const T = { in: ['Приход товара', 'Принять', 'ok'], out: ['Берём в работу', 'Готово', 'pri'], waste: ['Списание', 'Списать', 'bd'], inv: ['Пересчёт остатка', 'Сохранить', 'pri'] }[type];
  const after = type === 'in' ? p.stock + q : type === 'inv' ? q : Math.max(0, p.stock - q);
  return { title: T[0], sub: esc(p.name) + ' · сейчас ' + n1(p.stock) + ' ' + p.unit,
    body: `<div class="dsp ${type === 'waste' && q ? 'bd' : ''}"><b>${(np.val || '0').replace('.', ',')}</b><span>${p.unit}</span></div>
    <div style="text-align:center;color:var(--mu);margin-bottom:8px">${type === 'inv' ? 'Сколько осталось на самом деле' : `Останется ${n1(after)} ${p.unit}`}${type === 'waste' && q ? ` · потери ${rub(q * p.price)}` : ''}</div>
    ${type === 'waste' ? `<div class="q">${REASONS.map(r => `<button class="pill ${ui.op.reason === r ? 'on' : ''}" data-a="reason" data-k="${r}">${r}</button>`).join('')}</div>` : ''}${keypad()}
    ${type === 'waste' || type === 'in' ? photoBtn('op', np.photo) : ''}`,
    foot: `<button class="btn" data-a="close">Отмена</button><button class="btn ${T[2]} ${q > 0 || (type === 'inv' && np.val !== '') ? '' : 'off'}" data-a="opOk">${T[1]}</button>` };
};
const ACTS = ['Проверил дверь и уплотнитель', 'Перенёс продукты в другую камеру', 'Вызвал сервис', 'Повторный замер через 30 мин'];
const sTemp = () => {
  const t = S.temps.find(x => x.id === ui.tid), np = ui.np, has = np.val !== '' && np.val !== '.', v = has ? parseFloat((np.neg ? '-' : '') + np.val) : null, bad = has && !tOk(t, v);
  return { title: 'Температура', sub: esc(t.name) + ' · норма ' + t.lo + '…' + t.hi + '°C',
    body: `<div style="display:flex;justify-content:center"><div class="seg"><button class="${np.neg ? '' : 'on'}" data-a="neg" data-v="0">Плюс</button><button class="${np.neg ? 'on' : ''}" data-a="neg" data-v="1">Минус</button></div></div>
    <div class="dsp ${bad ? 'bd' : ''}"><b>${np.neg ? '−' : ''}${(np.val || '0').replace('.', ',')}</b><span>°C</span></div>
    ${bad ? `<div style="text-align:center;color:var(--bd);font-weight:700;margin-bottom:10px">Вне нормы — выберите, что сделали</div><div class="q">${ACTS.map(a => `<button class="pill ${np.act === a ? 'on' : ''}" data-a="act" data-k="${a}">${a}</button>`).join('')}</div>` : has ? `<div style="text-align:center;color:var(--ok);font-weight:700;margin-bottom:10px">В норме</div>` : ''}${keypad()}`,
    foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri ${has && (!bad || np.act) ? '' : 'off'}" data-a="tempOk">Записать</button>` };
};
const rq = (pid, q, unit, step) => `<div class="step"><button data-a="rq" data-p="${pid}" data-d="${-step}">${ic('minus', 18)}</button><b>${n1(q)} ${unit}</b><button data-a="rq" data-p="${pid}" data-d="${step}">${ic('plus', 18)}</button></div>`;
const sOrd = () => {
  const o = S.orders.find(x => x.id === ui.ordId), v = vend(o.sup), st = K.ST[o.st], rc = o.st === 'sent';
  return { title: esc(v.name), sub: `${st[1]} · ${dm(o.d)} · ${esc(emp(o.by)?.name || '')}`,
    body: `<div class="list">${o.items.map(i => { const p = prod(i.pid), got = ui.rcv[i.pid] ?? i.q; return `<div class="li"><span class="tx"><b>${esc(p.name)}</b><small>заказали ${n1(i.q)} ${p.unit}${o.st === 'received' ? ' · приняли ' + n1(i.got ?? i.q) : ''} · ${rub(i.q * i.price)}</small></span><span class="end">${rc ? rq(i.pid, got, p.unit, stepOf(p)) : ''}</span></div>`; }).join('')}</div>
    ${rc ? `<div class="sec">Фото накладной или товара</div>${photoBtn('rcv', ui.rcvPhoto)}` : o.ph ? `<img class="thumb big" src="${o.ph}" alt="фото" style="margin-top:12px">` : ''}
    <div class="bar-row" style="margin:14px 0 0"><span class="sp"></span><div style="text-align:right"><small class="mu">Сумма заказа</small><div style="font-size:26px;font-weight:800">${rub(oSum(o))}</div></div></div>`,
    foot: rc ? `<button class="btn" data-a="close">Позже</button><button class="btn ok" data-a="receive">${ic('inbox', 20)}Принять на склад</button>` : o.st === 'pending' && R().approve ? `<button class="btn pri" data-a="approve" data-id="${o.id}">Согласовать и отправить</button>` : '' };
};
const sRec = () => {
  const r = S.recipes.find(x => x.id === ui.rid), f = rFC(r), c = rCost(r), t = fcTone(f), po = rPortions(r), hint = Math.ceil(c / (S.targetFC / 100) / 10) * 10, $m = $money();
  return { title: esc(r.name), sub: `Рецептура · ${r.ing.length} ингредиентов`,
    body: `${$m ? kv([['Цена блюда', rub(r.price)], ['Продукты', rub(c)], ['Доля продуктов в цене', `<span style="color:var(--${t === 'ok' ? 'ok' : t === 'wn' ? 'wn' : 'bd'})">${n1(f, 1)}%</span> <small class="mu">норма до ${S.targetFC}%</small>`], ['Заработок с порции', rub(r.price - c)]]) : ''}
    ${$m ? `<div class="bar-row" style="margin:0 0 6px"><b>Цена в меню</b><span class="sp"></span><div class="step"><button data-a="rp" data-d="-10">${ic('minus', 18)}</button><b>${grp(r.price)}${NB}₽</b><button data-a="rp" data-d="10">${ic('plus', 18)}</button></div>${f > S.targetFC ? `<button class="btn sm" data-a="rpt" data-v="${hint}">Под норму: ${hint}${NB}₽</button>` : ''}</div>` : ''}
    <div class="sec">Состав на порцию</div><div class="list">${r.ing.map(i => { const p = prod(i.pid), ci = p.price * i.q; return `<div class="li" style="min-height:58px"><span class="tx"><b>${esc(p.name)}</b><small>${n1(i.q * (p.unit === 'шт' ? 1 : 1000), p.unit === 'шт' ? 2 : 0)} ${p.unit === 'шт' ? 'шт' : p.unit === 'кг' ? 'г' : 'мл'} · на складе ${n1(p.stock)} ${p.unit}</small></span><span class="end">${$m ? `<div style="width:90px">${K.bar(ci / c)}</div><b style="min-width:64px;text-align:right">${rub(ci)}</b>` : ''}</span></div>`; }).join('')}</div>
    <div class="bar-row" style="margin:14px 0 0">${chip(po === 0 ? 'bd' : po < 8 ? 'wn' : 'ok', 'Хватит на ' + po + NB + pl(po, ['порцию', 'порции', 'порций']))}</div>`,
    foot: `<button class="btn" data-a="close">Закрыть</button><button class="btn pri ${po ? '' : 'off'}" data-a="cook">${ic('flame', 20)}Приготовили порцию</button>` };
};
const todayLabel = e => { const c = K.todayShift(e); return c === 'Д' ? 'День 09–17' : c === 'В' ? 'Вечер 15–23' : 'Выходной'; };
const sEmp = () => {
  const e = emp(ui.eid), m = medState(e), sc = e.week.map((c, i) => `<span class="chip ${c === 'Д' ? 'in' : c === 'В' ? 'ac' : ''}" style="${i === K.dow() ? 'outline:2px solid var(--ac)' : ''}">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]} ${c === '-' ? '·' : c}</span>`).join('');
  return { title: esc(e.name), sub: esc(e.pos),
    body: `<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">${avatar(e, 'lg')}<div>${e.on ? chip('ok', 'на смене с ' + e.since) : chip('', 'не на смене')}<div style="margin-top:8px">${m ? chip(m[0], m[1].replace('Мед. книжка', 'Медкнижка')) : ''}</div></div></div>
    ${kv([['Телефон', `<a href="tel:${esc(e.phone.replace(/[^+\d]/g, ''))}" style="color:var(--tx);text-decoration:none">${esc(e.phone)}</a>`], ['Смена сегодня', todayLabel(e)], ['Часов в месяце', e.hours + ' ч'], ['Ставка', $money() ? rub(e.rate) + ' / ч' : '•••']])}
    <div class="sec">График недели</div><div class="q" style="justify-content:flex-start">${sc}</div>`,
    foot: `${R().staffEdit || e.id === me().id ? `<button class="btn ${e.on ? 'bd' : 'ok'}" data-a="clock">${ic('clock', 20)}${e.on ? 'Закончил смену' : 'Начал смену'}</button>` : ''}<a class="btn" href="tel:${esc(e.phone.replace(/[^+\d]/g, ''))}">${ic('phone', 20)}Позвонить</a>` };
};
const sVen = () => {
  const v = vend(ui.vid), con = v.kind === 'contractor';
  if (!con) return { title: esc(v.name), sub: esc(v.type), body: `${kv([['Контакт', esc(v.contact)], ['Телефон', esc(v.phone)], ['Привозят', esc(v.days)], ['Условия', esc(v.terms)], ['Мин. заказ', rub(v.minOrder)], ['Долг', rub(v.debt)]])}${v.note ? `<div class="mu">${esc(v.note)}</div>` : ''}<div style="margin-top:10px">${stars(v.rating)}</div>`, foot: `<a class="btn" href="tel:${esc(v.phone.replace(/[^+\d]/g, ''))}">${ic('phone', 20)}Позвонить</a>${R().nav.includes('orders') ? `<button class="btn pri" data-a="go" data-r="orders">${ic('cart', 20)}К закупкам</button>` : ''}` };
  const d = dd(nextVisit(v));
  return { title: esc(v.name), sub: `${TYPE[v.type][1]} · ${esc(v.svc)}`,
    body: `${d < 0 ? `<div class="card" style="background:var(--bdb);margin-bottom:12px;padding:14px">${ic('alert', 18)} Визит просрочен на ${-d} ${pl(-d, ['день', 'дня', 'дней'])}</div>` : ''}
    ${kv([['Контакт', esc(v.contact)], ['Телефон', esc(v.phone)], ['Как часто', 'раз в ' + v.freq + NB + pl(v.freq, ['день', 'дня', 'дней'])], ['Последний визит', rel(v.last)], ['Следующий визит', dm(nextVisit(v)) + ' · ' + rel(nextVisit(v))], ['Договор до', dm(v.till) + ' · ' + rel(v.till)]])}
    ${v.note ? `<div class="mu" style="margin-bottom:8px">${esc(v.note)}</div>` : ''}<div>${stars(v.rating)}</div>
    <div class="sec">История визитов и акты</div><div class="list">${v.visits.slice(0, 5).map(x => `<div class="li" style="min-height:52px"><span class="ico ok">${ic('doc', 20)}</span><span class="tx"><b>${esc(x.t)}</b><small>${dm(x.d)} · ${rel(x.d)}</small></span></div>`).join('')}</div>`,
    foot: `<a class="btn" href="tel:${esc(v.phone.replace(/[^+\d]/g, ''))}">${ic('phone', 20)}Позвонить</a>${R().vendorEdit ? `<button class="btn ok" data-a="visit" data-id="${v.id}">${ic('check', 20)}Приезжали</button>` : ''}` };
};
const NOTES = ['Замечаний нет', 'Есть замечания', 'Акт подписан', 'Нужен повторный визит'];
const sVisit = () => { const v = vend(ui.vid), s = ui.vs; return { title: 'Подрядчик приезжал', sub: esc(v.name),
  body: `<div class="sec" style="margin-top:4px">Как отработали?</div><div class="q" style="justify-content:flex-start">${[1, 2, 3, 4, 5].map(i => `<button class="ib" style="width:58px;height:58px;color:${i <= s.rating ? 'var(--ac2)' : 'var(--mu2)'}" data-a="vrate" data-v="${i}">${ic('star', 26).replace('fill="none"', i <= s.rating ? 'fill="currentColor"' : 'fill="none"')}</button>`).join('')}</div>
  <div class="sec">Итог</div><div class="q" style="justify-content:flex-start">${NOTES.map(n => `<button class="pill ${s.note === n ? 'on' : ''}" data-a="vnote" data-k="${n}">${n}</button>`).join('')}</div>`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn ok ${s.note ? '' : 'off'}" data-a="visitOk">Сохранить</button>` }; };
const sNewProd = () => { const f = ui.form, cats = [...new Set(S.products.map(p => p.cat))]; return { title: 'Новый продукт', sub: 'Добавится на склад',
  body: `${fld('name', 'Название', 'Например, Сёмга')}<div class="sec" style="margin-top:0">Категория</div>${pick('cat', cats.map(c => [c, c]), f.cat || cats[0])}<div class="sec">Единица</div>${pick('unit', ['кг', 'л', 'шт', 'уп'].map(c => [c, c]), f.unit || 'кг')}
  <div class="fr" style="margin-top:14px">${fld('stock', 'Сколько есть', '0', 'decimal')}${fld('min', 'Минимум (ниже — заказать)', '0', 'decimal')}</div>${fld('price', 'Цена за единицу, ₽', '0', 'decimal')}<div class="sec" style="margin-top:0">Поставщик</div>${pick('sup', S.vendors.filter(v => v.kind === 'supplier').map(v => [v.id, v.name]), f.sup || 's1')}`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="saveProd">Добавить</button>` }; };
const POS = [['Повар горячего цеха', 'kitchen'], ['Повар холодного цеха', 'kitchen'], ['Повар-заготовщик', 'kitchen'], ['Кондитер', 'kitchen'], ['Мойщик посуды', 'kitchen'], ['Официант', 'hall'], ['Бариста', 'hall']];
const sNewEmp = () => ({ title: 'Новый сотрудник', sub: 'Попадёт в команду и график. PIN для входа: 1111',
  body: `${fld('name', 'Имя и фамилия', 'Например, Иван Петров')}<div class="sec" style="margin-top:0">Должность</div>${pick('pos', POS.map(p => [p[0], p[0]]), ui.form.pos || POS[0][0])}<div class="fr" style="margin-top:14px">${fld('phone', 'Телефон', '+7 ')}${fld('rate', 'Ставка, ₽/ч', '350', 'numeric')}</div>`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="saveEmp">Добавить</button>` });
const sNewVen = () => { const f = ui.form, con = (f.kind || 'contractor') === 'contractor'; return { title: 'Новый контрагент', sub: 'Подрядчик или поставщик',
  body: `${pick('kind', [['contractor', 'Подрядчик (услуги)'], ['supplier', 'Поставщик продуктов']], f.kind || 'contractor')}<div style="height:14px"></div>${fld('name', 'Название', 'ООО «…»')}${con ? `<div class="sec" style="margin-top:0">Что делают</div>${pick('type', Object.entries(TYPE).map(([k, v]) => [k, v[1]]), f.type || 'clean')}<div class="sec">Как часто приезжают</div>${pick('freq', [[1, 'Каждый день'], [7, 'Раз в неделю'], [30, 'Раз в месяц'], [90, 'Раз в квартал'], [180, 'Раз в полгода']], f.freq || 30)}` : ''}<div class="fr" style="margin-top:14px">${fld('contact', 'Контактное лицо')}${fld('phone', 'Телефон', '+7 ')}</div>`,
  foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="saveVen">Добавить</button>` }; };
const sBell = () => { const a = ui.alerts = feed(); return { title: 'Что сделать сейчас', sub: a.length ? a.length + ' ' + pl(a.length, ['дело', 'дела', 'дел']) : 'Всё сделано',
  body: `<div class="list">${a.map(K.feedRow).join('') || `<div class="empty">${ic('check', 36)}<div>Срочных дел нет</div></div>`}</div>` }; };
const sMe = () => { const u = me(), r = R(), sy = S.sync; return { title: 'Профиль', sub: esc(u.name) + ' · ' + r.n,
  body: `<div class="g g2" style="gap:10px"><button class="btn" data-a="lock">${ic('lock', 20)}Сменить пользователя</button><button class="btn" data-a="pinChange">${ic('edit', 20)}Сменить PIN</button></div>
  <div class="sec">Тема</div><div class="seg"><button class="${S.theme === 'dark' ? 'on' : ''}" data-a="themeSet" data-v="dark">Тёмная</button><button class="${S.theme === 'light' ? 'on' : ''}" data-a="themeSet" data-v="light">Светлая</button></div>
  ${r.money ? `<div class="sec">Норма себестоимости блюд</div><div class="step"><button data-a="tfc" data-d="-1">${ic('minus', 18)}</button><b>${S.targetFC}%</b><button data-a="tfc" data-d="1">${ic('plus', 18)}</button></div>` : ''}
  <div class="sec">Общие данные на нескольких планшетах</div>
  ${sy ? `<div class="card" style="background:var(--s2);padding:14px"><div class="mu" style="font-size:13px">Код заведения (введите его на другом планшете)</div><div class="code">${sy.code}</div><div class="mu" style="font-size:13px;margin-top:6px">${ui.syncMsg || (sy.at ? 'Обновлено в ' + hm(sy.at) : 'Подключаемся…')}</div></div><div style="margin-top:10px"><button class="btn bd sm" data-a="syncOff">Отключить на этом планшете</button></div>`
    : `<div class="mu" style="font-size:14px;margin-bottom:10px">Сейчас данные хранятся только на этом планшете. Включите общий доступ — и остальные увидят те же остатки и задачи.</div><div class="g g2" style="gap:10px"><button class="btn pri" data-a="syncOn">Включить</button><button class="btn" data-a="syncJoin">Ввести код</button></div>`}
  <div class="sec">Прочее</div><div class="g g2" style="gap:10px"><button class="btn" data-a="onbAgain">Показать подсказки</button><button class="btn bd" data-a="reset">Сбросить демо-данные</button></div>` }; };
const sPinChange = () => { const p = ui.pin; return { title: 'Новый PIN', sub: 'Четыре цифры. Его знаете только вы',
  body: `<div class="dots big">${[0, 1, 2, 3].map(i => `<i class="${i < p.val.length ? 'on' : ''}"></i>`).join('')}</div><div class="kp">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? `<button class="key ${k === '⌫' ? 'f' : ''}" data-a="pk" data-k="${k}">${k}</button>` : '<span></span>').join('')}</div>` }; };
const sJoin = () => ({ title: 'Подключиться к данным', sub: 'Данные на этом планшете будут заменены общими',
  body: `${fld('code', 'Код заведения (8 символов)', 'AB12CD34')}`, foot: `<button class="btn" data-a="close">Отмена</button><button class="btn pri" data-a="syncJoinOk">Подключить</button>` });
const ONB = {
  owner: [['chart', 'Всё главное — на первом экране', 'Слева — что делать прямо сейчас, справа — кто на смене. Цифры сверху показывают деньги.'], ['check', 'У каждого дела есть кнопка', 'Нажали «Списать» или «Согласовать» прямо из списка — заходить в разделы не нужно.'], ['lock', 'Ошиблись? Есть «Отменить»', 'После действия внизу появляется кнопка «Отменить» на 8 секунд.']],
  manager: [['chart', 'Что требует решения — сразу видно', 'Красное — срочно, жёлтое — скоро. У каждого дела кнопка действия.'], ['users', 'Команда и график', 'Нажмите на клетку в графике, чтобы сменить смену. Красный день — мало поваров.'], ['lock', 'Ошиблись? Есть «Отменить»', 'После действия внизу появляется кнопка «Отменить» на 8 секунд.']],
  admin: [['check', 'Дела на сегодня — на главной', 'Заказы, подрядчики, медкнижки. Рядом с каждым делом кнопка.'], ['truck', 'Подрядчики — в «Проверках»', 'Отмечайте «Приезжали» — следующий визит посчитается сам.'], ['lock', 'Ошиблись? Есть «Отменить»', 'После действия внизу появляется кнопка «Отменить» на 8 секунд.']],
  chef: [['clock', 'Сначала то, что скорее испортится', 'На главной видно, что пора списать или пустить в работу.'], ['cart', 'Закупки — почти сами', 'Что заканчивается, уже подобрано. Проверьте количество и отправьте.'], ['lock', 'Ошиблись? Есть «Отменить»', 'После действия внизу появляется кнопка «Отменить» на 8 секунд.']],
  sous: [['check', 'Дела смены — на главной', 'Температуры, приёмка, задачи открытия и закрытия. Всё с кнопками.'], ['inbox', 'Приёмка товара', 'Нажмите «Принять товар», поправьте количество, добавьте фото накладной.'], ['lock', 'Ошиблись? Есть «Отменить»', 'После действия внизу появляется кнопка «Отменить» на 8 секунд.']],
  cook: [['trash', 'Всё в четырёх кнопках', 'Списать, записать температуру, задачи смены и что использовать первым. Больше ничего не нужно.'], ['mic', 'Можно говорить', 'В «Списать продукт» нажмите «Голосом» и скажите: «списать два килограмма свинины».'], ['lock', 'Ошиблись? Нажмите «Отменить»', 'После списания внизу на 8 секунд появляется кнопка «Отменить».']],
};
const sOnb = () => { const o = ONB[ui.ob.role], i = ui.ob.i, [icn, t, d] = o[i]; return { title: 'Как тут всё устроено', sub: `${i + 1} из ${o.length}`,
  body: `<div class="onb"><span class="ico ac" style="width:84px;height:84px;border-radius:26px">${ic(icn, 42)}</span><h3>${t}</h3><p>${d}</p><div class="dots">${o.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div></div>`,
  foot: `<button class="btn pri" data-a="onbNext">${i < o.length - 1 ? 'Дальше' : 'Понятно!'}</button>` }; };

/* ───── вход, PIN, блокировка ───── */
function gate() {
  authed = false; const g = $('#gate'); g.hidden = false; $('#app').hidden = true; g.className = 'enter';
  g.innerHTML = `<div class="gt"><h1 data-s>Kitchen Control</h1><p data-s>${esc(S.venue)} · кто вы?</p><div class="gt-g">${Object.entries(ROLES).map(([id, r]) => `<button class="role" data-s data-a="who" data-id="${id}"><span class="ri">${ic(r.ic, 28)}</span><b>${r.n}</b><span>${esc(r.d)}</span><em>${esc(S.staff.find(e => e.id === r.user).name)}</em></button>`).join('')}</div></div>`;
  $$('[data-s]', g).forEach((el, i) => el.style.setProperty('--i', i));
}
function pinScreen(id, anim = true) {
  authed = false; ui.pin = { id, val: '', err: false, mode: 'login' }; $('#app').hidden = true; const g = $('#gate'); g.hidden = false; g.className = anim ? 'enter' : ''; paintPin();
}
function paintPin() {
  const p = ui.pin, e = emp(ROLES[p.id].user), g = $('#gate');
  g.innerHTML = `<div class="gt pin"><button class="btn sm" data-a="gateBack" data-s>${ic('back', 18)}Это не я</button><div class="pin-c">${avatar({ ...e, on: false }, 'lg')}<h1 data-s>${esc(e.name)}</h1><p data-s>${ROLES[p.id].n} · введите PIN</p>
  <div class="dots big ${p.err ? 'shake' : ''}" data-s>${[0, 1, 2, 3].map(i => `<i class="${i < p.val.length ? 'on' : ''}"></i>`).join('')}</div><div class="kp pk" data-s>${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? `<button class="key ${k === '⌫' ? 'f' : ''}" data-a="pk" data-k="${k}">${k}</button>` : '<span></span>').join('')}</div><small class="mu" data-s>${p.err ? '<b style="color:var(--bd)">Неверный PIN, попробуйте ещё раз</b>' : 'Демо: PIN у всех 1111'}</small></div></div>`;
  $$('[data-s]', g).forEach((el, i) => el.style.setProperty('--i', i));
}
function pinKey(k) {
  const p = ui.pin; if (k === '⌫') p.val = p.val.slice(0, -1); else if (p.val.length < 4) p.val += k; p.err = false;
  if (p.mode === 'change') { if (p.val.length === 4) { me().pin = p.val; closeSheet(); refresh(); toast('PIN изменён'); p.val = ''; } else paintSheet(); return; }
  if (p.val.length === 4) { if (p.val === (emp(ROLES[p.id].user).pin || '1111')) { enterAs(p.id); return; } p.err = true; p.val = ''; if (navigator.vibrate) navigator.vibrate(120); }
  paintPin();
}
let idleT;
const bump = () => { clearTimeout(idleT); if (authed) idleT = setTimeout(lock, 10 * 60e3); };
function lock() { closeSheet(true); clearTimeout(idleT); S.role ? pinScreen(S.role, false) : gate(); }
function enterApp(fromPin) {
  authed = true; $('#gate').hidden = true; $('#app').hidden = false; bump();
  const [r, t] = K.alias(K.QS.get('route') || 'home', K.QS.get('tab') || undefined); ui.route = R().nav.includes(r) ? r : 'home'; if (t) ui.tab[ui.route] = t;
  render(true); syncStart();
  if (fromPin && !S.seen[S.role]) setTimeout(() => { ui.ob = { role: S.role, i: 0 }; openSheet(sOnb); }, 600);
}
function enterAs(id) { S.role = id; persist(); ui.route = 'home'; K.QS.delete('route'); K.QS.delete('tab'); enterApp(true); }

/* ───── синхронизация планшетов ───── */
let applying = false, pushT = null, pushing = false, pollT = null;
const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; const r = crypto.getRandomValues(new Uint8Array(8)); r.forEach(x => c += A[x % A.length]); return c; };
const payload = () => { const o = {}; Object.keys(S).forEach(k => { if (!K.DEV.includes(k)) o[k] = S[k]; }); return o; };
const syncUrl = (code, x = '') => `/api/state?code=${code}${x}`;
const saveQuiet = () => { applying = true; K.save(); applying = false; };
K.onSave = () => { if (S.sync && !applying) { clearTimeout(pushT); pushT = setTimeout(push, 900); } };
function applyRemote(data, rev) { applying = true; replaceState(data); S.sync.rev = rev; S.sync.at = Date.now(); K.save(); applying = false; }
async function push() {
  pushT = null; if (!S.sync || pushing) return; pushing = true;
  try {
    prunePhotos(25); let body = JSON.stringify({ base: S.sync.rev, data: payload() }); if (body.length > 1.8e6) { prunePhotos(5); body = JSON.stringify({ base: S.sync.rev, data: payload() }); }
    const r = await fetch(syncUrl(S.sync.code), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
    if (r.status === 200) { S.sync.rev = (await r.json()).rev; S.sync.at = Date.now(); ui.syncMsg = ''; saveQuiet(); }
    else if (r.status === 409) { const j = await r.json(); if (j.data) { applyRemote(j.data, j.rev); ui.syncMsg = 'Данные обновились с другого планшета'; render(false); toast('Данные обновились с другого планшета'); } else { S.sync = null; saveQuiet(); render(false); } }
    else ui.syncMsg = 'Нет связи, повторим';
  } catch (e) { ui.syncMsg = 'Нет связи, повторим'; }
  pushing = false;
}
async function poll() {
  if (!S.sync || pushing || pushT || sheetFn || !authed || (document.activeElement && document.activeElement.tagName === 'INPUT')) return;
  try {
    const r = await fetch(syncUrl(S.sync.code, '&since=' + S.sync.rev));
    if (r.status === 200) { const j = await r.json(); applyRemote(j.data, j.rev); render(false); } else if (r.status === 204) { S.sync.at = Date.now(); ui.syncMsg = ''; saveQuiet(); }
  } catch (e) { ui.syncMsg = 'Нет связи'; }
}
function syncStart() { clearInterval(pollT); if (S.sync) { pollT = setInterval(poll, 5000); poll(); } }

/* ───── действия ───── */
const draftSet = (pid, q) => { ui.draft[pid] = Math.max(0, Math.round(q * 100) / 100); };
const A = {
  go: el => go(el.dataset.r, el.dataset.tab),
  close: () => closeSheet(),
  tab: el => { ui.tab[el.dataset.v] = el.dataset.k; ui.q = ''; render(true); },
  cat: el => { ui.cat = el.dataset.k; render(false); },
  flt: el => { ui.f = ui.f === el.dataset.k ? 'all' : el.dataset.k; render(false); },
  themeSet: el => { S.theme = el.dataset.v; document.documentElement.dataset.theme = S.theme; refresh(); },
  bell: () => openSheet(sBell), me: () => openSheet(sMe),
  who: el => pinScreen(el.dataset.id), gateBack: () => gate(), pk: el => pinKey(el.dataset.k),
  lock: () => { closeSheet(true); clearTimeout(idleT); gate(); },
  pinChange: () => { ui.pin = { id: S.role, val: '', err: false, mode: 'change' }; openSheet(sPinChange); },
  onbAgain: () => { ui.ob = { role: S.role, i: 0 }; openSheet(sOnb); },
  onbNext: () => { const o = ONB[ui.ob.role]; if (ui.ob.i < o.length - 1) { ui.ob.i++; paintSheet(); } else { S.seen[ui.ob.role] = 1; persist(); closeSheet(); } },
  prod: el => openSheet(sProduct(el.dataset.id)),
  pickProd: el => { ui.pick = { t: el.dataset.t }; openSheet(sPick); },
  voice: () => {
    if (!SR) return; const r = new SR(); r.lang = 'ru-RU'; r.interimResults = false; ui.listening = true; paintSheet();
    r.onresult = e => { const t = e.results[0][0].transcript, v = parseVoice(t, ui.pick ? ui.pick.t : 'waste'); ui.listening = false; if (v.p) { ui.op = { pid: v.p.id, type: v.t, reason: 'Истёк срок' }; ui.np = { val: v.q != null ? String(v.q) : '', neg: false, act: '', photo: null }; openSheet(sOp); } else { paintSheet(); toast('Не расслышал: «' + esc(t) + '». Скажите: «списать два килограмма свинины»', 'bd'); } };
    r.onerror = () => { ui.listening = false; if (sheetFn) paintSheet(); toast('Микрофон недоступен — разрешите доступ или найдите продукт по названию', 'bd'); };
    r.onend = () => { if (ui.listening) { ui.listening = false; if (sheetFn) paintSheet(); } };
    try { r.start(); } catch (e) { ui.listening = false; paintSheet(); }
  },
  op: el => { const p = prod(el.dataset.p); ui.op = { pid: p.id, type: el.dataset.t, reason: 'Истёк срок' }; ui.np = { val: el.dataset.t === 'inv' ? String(p.stock) : '', neg: false, act: '', photo: null }; openSheet(sOp); },
  key: el => { const k = el.dataset.k, np = ui.np; if (k === '⌫') np.val = np.val.slice(0, -1); else if (k === '.') { if (!np.val.includes('.')) np.val = (np.val || '0') + '.'; } else if (np.val.replace('.', '').length < 6) np.val = np.val === '0' ? k : np.val + k; paintSheet(); },
  neg: el => { ui.np.neg = el.dataset.v === '1'; paintSheet(); },
  act: el => { ui.np.act = el.dataset.k; paintSheet(); },
  reason: el => { ui.op.reason = el.dataset.k; paintSheet(); },
  photoX: el => { if (el.dataset.k === 'op') ui.np.photo = null; else ui.rcvPhoto = null; paintSheet(); },
  opOk: () => {
    const { pid, type, reason } = ui.op, p = prod(pid), q = parseFloat(ui.np.val), ph = ui.np.photo; if (isNaN(q)) return;
    commit(type === 'in' ? `Принято ${n1(q)} ${p.unit} · ${esc(p.name)}` : type === 'inv' ? 'Остаток обновлён' : type === 'out' ? `В работу: ${n1(q)} ${p.unit} · ${esc(p.name)}` : `Списано ${n1(q)} ${p.unit} · ${esc(p.name)}`, () => {
      if (type === 'in') { if (p.stock <= 0) p.exp = day(p.sh); p.stock += q; } else if (type === 'inv') p.stock = q; else p.stock = Math.max(0, p.stock - q);
      const m = { id: 'm' + (++S.seq), ts: Date.now(), type, pid, qty: q, who: me().id, reason: type === 'in' ? 'Приёмка' : type === 'inv' ? 'Инвентаризация' : type === 'out' ? 'Приготовлено' : reason }; if (ph) m.ph = ph; S.mv.unshift(m); prunePhotos(25);
    });
  },
  temp: el => { ui.tid = el.dataset.id; ui.np = { val: '', neg: S.temps.find(t => t.id === ui.tid).hi < 0, act: '', photo: null }; openSheet(sTemp); },
  tempOk: () => { const t = S.temps.find(x => x.id === ui.tid), np = ui.np, v = parseFloat((np.neg ? '-' : '') + np.val); if (isNaN(v)) return; const good = tOk(t, v); commit(good ? 'Записано — в норме' : 'Отклонение записано', () => { t.log.push({ ts: Date.now(), v, who: me().id, act: good ? '' : np.act }); if (t.log.length > 14) t.log.shift(); }, good ? '' : 'bd'); },
  dq: el => { const p = prod(el.dataset.p); draftSet(p.id, (ui.draft[p.id] ?? sugQty(p)) + +el.dataset.d); render(false); },
  sendOrder: el => {
    const sid = el.dataset.s, ls = (K.suggestions()[sid] || []).filter(l => l.q > 0); if (!ls.length) return; const ap = R().approve;
    const snap = JSON.stringify(S); S.orders.unshift({ id: 'o' + (++S.seq), sup: sid, st: ap ? 'sent' : 'pending', d: day(0), eta: day(1), by: me().id, items: ls.map(l => ({ pid: l.p.id, q: l.q, price: l.p.price })) });
    ls.forEach(l => delete ui.draft[l.p.id]); ui.tab.orders = 'list'; persist(); render(true); toast(ap ? `Заказ отправлен · ${esc(vend(sid).name)}` : 'Заказ ушёл шефу на согласование', '', snap);
  },
  approve: el => { const o = S.orders.find(x => x.id === el.dataset.id); commit('Заказ согласован и отправлен', () => { o.st = 'sent'; o.eta = day(1); }); },
  allOrders: () => { ui.allOrders = true; render(false); },
  ord: el => { ui.ordId = el.dataset.id; ui.rcv = {}; ui.rcvPhoto = null; openSheet(sOrd); },
  rq: el => { const o = S.orders.find(x => x.id === ui.ordId), i = o.items.find(x => x.pid === el.dataset.p); ui.rcv[i.pid] = Math.max(0, Math.round(((ui.rcv[i.pid] ?? i.q) + +el.dataset.d) * 100) / 100); paintSheet(); },
  receive: () => {
    const o = S.orders.find(x => x.id === ui.ordId); let diff = 0;
    commit('Товар принят на склад', () => {
      o.items.forEach(i => { const got = ui.rcv[i.pid] ?? i.q, p = prod(i.pid); i.got = got; if (got !== i.q) diff++; if (got > 0) { if (p.stock <= 0) p.exp = day(p.sh); p.stock += got; S.mv.unshift({ id: 'm' + (++S.seq), ts: Date.now(), type: 'in', pid: p.id, qty: got, who: me().id, reason: 'Приёмка' }); } });
      o.st = 'received'; o.rcv = day(0); if (ui.rcvPhoto) o.ph = ui.rcvPhoto; prunePhotos(25);
    });
    if (diff) toast(`Принято с расхождением: ${diff} ${pl(diff, ['позиция', 'позиции', 'позиций'])}`, '', undoSnap);
  },
  rec: el => { ui.rid = el.dataset.id; openSheet(sRec); },
  rp: el => { const r = S.recipes.find(x => x.id === ui.rid); r.price = Math.max(10, r.price + +el.dataset.d); refresh(); },
  rpt: el => { S.recipes.find(x => x.id === ui.rid).price = +el.dataset.v; refresh(); toast('Цена обновлена'); },
  cook: () => { const r = S.recipes.find(x => x.id === ui.rid); if (!rPortions(r)) return; commit('Порция списана со склада', () => r.ing.forEach(i => { const p = prod(i.pid); p.stock = Math.max(0, Math.round((p.stock - i.q) * 1000) / 1000); S.mv.unshift({ id: 'm' + (++S.seq), ts: Date.now(), type: 'out', pid: p.id, qty: i.q, who: me().id, reason: 'Приготовлено' }); })); },
  emp: el => { ui.eid = el.dataset.id; openSheet(sEmp); },
  clock: () => { const e = emp(ui.eid); commit(e.on ? `${esc(e.name.split(' ')[0])} закончил(а) смену` : `${esc(e.name.split(' ')[0])} на смене`, () => { e.on = !e.on; e.since = e.on ? hm(Date.now()) : ''; }); },
  shift: el => { const e = emp(el.dataset.e), i = +el.dataset.d, o = ['-', 'Д', 'В']; e.week[i] = o[(o.indexOf(e.week[i]) + 1) % 3]; refresh(); },
  ven: el => { ui.vid = el.dataset.id; openSheet(sVen); },
  visit: el => { ui.vid = el.dataset.id; ui.vs = { rating: vend(ui.vid).rating, note: '' }; openSheet(sVisit); },
  vrate: el => { ui.vs.rating = +el.dataset.v; paintSheet(); }, vnote: el => { ui.vs.note = el.dataset.k; paintSheet(); },
  visitOk: () => { const v = vend(ui.vid); commit(`Записали. Следующий визит — ${dm(addDays(day(0), v.freq))}`, () => { v.last = day(0); v.rating = ui.vs.rating; v.visits.unshift({ d: day(0), t: ui.vs.note }); }); },
  ck: el => { const c = S.checklists.find(x => x.id === el.dataset.c), i = +el.dataset.i; if (c.by) return; const k = c.done.indexOf(i); k < 0 ? c.done.push(i) : c.done.splice(k, 1); refresh(); },
  sign: el => { const c = S.checklists.find(x => x.id === el.dataset.c); commit(`${c.name}: подписано`, () => { c.by = me().name; c.at = hm(Date.now()); }); },
  fpick: el => { ui.form[el.dataset.k] = el.dataset.v; paintSheet(); },
  newProd: () => openSheet(sNewProd), newEmp: () => openSheet(sNewEmp),
  newVen: el => { openSheet(sNewVen); ui.form.kind = el.dataset.k || 'contractor'; paintSheet(); },
  saveProd: () => { paintSheet(); const f = ui.form, name = (f.name || '').trim(); if (!name) return toast('Введите название', 'bd'); const cats = [...new Set(S.products.map(p => p.cat))];
    commit('Продукт добавлен', () => S.products.push({ id: 'p' + (++S.seq), name, cat: f.cat || cats[0], unit: f.unit || 'кг', stock: parseFloat(f.stock) || 0, min: parseFloat(f.min) || 0, price: parseFloat(f.price) || 0, sup: f.sup || 's1', exp: day(14), sh: 14, loc: 'Склад' })); },
  saveEmp: () => { paintSheet(); const f = ui.form, name = (f.name || '').trim(); if (!name) return toast('Введите имя', 'bd'); const pos = f.pos || POS[0][0];
    commit('Сотрудник добавлен', () => S.staff.push({ id: 'e' + (++S.seq), name, pos, grp: POS.find(p => p[0] === pos)[1], med: day(365), phone: f.phone || '', rate: parseFloat(f.rate) || 0, week: 'ДДДДД--'.split(''), hours: 0, on: false, since: '', pin: '1111' })); },
  saveVen: () => { paintSheet(); const f = ui.form, name = (f.name || '').trim(); if (!name) return toast('Введите название', 'bd'); const con = (f.kind || 'contractor') === 'contractor';
    commit('Добавлено', () => S.vendors.push(con ? { id: 'c' + (++S.seq), kind: 'contractor', name, type: f.type || 'clean', svc: TYPE[f.type || 'clean'][1], contact: f.contact || '—', phone: f.phone || '', freq: +(f.freq || 30), last: day(0), till: day(365), rating: 5, note: '', visits: [] } : { id: 's' + (++S.seq), kind: 'supplier', name, type: 'Поставщик', contact: f.contact || '—', phone: f.phone || '', days: 'По заявке', minOrder: 0, terms: 'по факту', debt: 0, rating: 5, note: '' })); },
  tfc: el => { S.targetFC = Math.max(15, Math.min(60, S.targetFC + +el.dataset.d)); refresh(); },
  undo: () => { if (!undoSnap) return; replaceState(JSON.parse(undoSnap)); undoSnap = null; K.save(); $$('.toast').forEach(t => t.remove()); closeSheet(true); render(false); toast('Отменено'); },
  syncOn: async () => { S.sync = { code: genCode(), rev: 0, at: 0 }; saveQuiet(); await push(); syncStart(); render(false); if (sheetFn) paintSheet(); },
  syncOff: () => { S.sync = null; clearInterval(pollT); saveQuiet(); render(false); paintSheet(); toast('Отключено. Данные остались на этом планшете'); },
  syncJoin: () => openSheet(sJoin),
  syncJoinOk: async () => {
    paintSheet(); const code = (ui.form.code || '').trim().toUpperCase(); if (!/^[A-Z2-9]{8}$/.test(code)) return toast('Код — 8 символов, буквы и цифры', 'bd');
    try { const r = await fetch(syncUrl(code, '&since=0')); if (r.status === 200) { const j = await r.json(); S.sync = { code, rev: 0, at: 0 }; applyRemote(j.data, j.rev); closeSheet(); render(false); syncStart(); toast('Подключено — данные общие'); } else toast(r.status === 404 ? 'Такого кода нет' : 'Нет связи', 'bd'); } catch (e) { toast('Нет связи', 'bd'); }
  },
  reset: () => { if (confirm('Сбросить все данные и вернуть демо?')) { try { localStorage.removeItem('kc.v1'); } catch (e) {} location.reload(); } },
};

document.addEventListener('click', e => {
  const ov = e.target.closest('.ov'); if (ov && e.target === ov) return closeSheet();
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = A[el.dataset.a]; if (f) f(el, e);
});
document.addEventListener('input', e => { const t = e.target, k = t.dataset && t.dataset.in; if (k === 'q') { ui.q = t.value; render(false); } else if (t.name === 'pq' && sheetFn) paintSheet(); });
document.addEventListener('change', e => { const t = e.target, f = t.files && t.files[0]; if (!f || !t.dataset.photo) return; readPhoto(f, url => { if (t.dataset.photo === 'op') ui.np.photo = url; else ui.rcvPhoto = url; paintSheet(); }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.addEventListener('pointerdown', bump, { passive: true });
setInterval(() => { if (authed && !sheetFn && !$('.ov')) renderTop(); }, 60000);

/* ───── запуск ───── */
document.documentElement.dataset.theme = S.theme;
const qr = K.QS.get('role'); if (qr && ROLES[qr]) { S.role = qr; authed = true; }
if (K.QS.get('theme')) { S.theme = K.QS.get('theme'); document.documentElement.dataset.theme = S.theme; }
const sp = $('#splash');
let started = false;
const begin = () => { if (authed) enterApp(false); else if (S.role && ROLES[S.role]) pinScreen(S.role); else gate(); };
const start = () => { if (started) return; started = true; sp.classList.add('out'); setTimeout(() => sp.remove(), 750); begin(); };
if (K.QS.has('nosplash')) { sp.remove(); started = true; begin(); }
else { sp.addEventListener('click', start); setTimeout(start, 3100); }
K.render = render; K.go = go; K.A = A; K.toast = toast; K.openSheet = openSheet; K.parseVoice = parseVoice; K.push = push; K.poll = poll;
})();
