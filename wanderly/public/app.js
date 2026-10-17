/* Wanderly front-end — vanilla JS single-page app */
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const S = { trips: [], dests: [], rates: {}, cats: [], cur: localStorage.getItem('wl_cur') || 'INR', tab: 'overview', filter: 'all', q: '', estimate: null };

const CAT_COLOR = { Flights: '#3b82f6', Stay: '#14b8a6', Food: '#ff7a59', Transport: '#8b5cf6', Activities: '#f5a524', Shopping: '#ec4899', Other: '#94a3b8' };
const CAT_ABBR = { Flights: 'FL', Stay: 'ST', Food: 'FD', Transport: 'TR', Activities: 'AC', Shopping: 'SH', Other: 'OT' };

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
const conv = (a, from, to) => (a / (S.rates[from] || 1)) * (S.rates[to] || 1);
const money = (a, cur) => {
  try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(a || 0); }
  catch { return `${cur} ${Math.round(a || 0)}`; }
};
const fdate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fdateY = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const tripDays = (t) => Math.max(1, daysBetween(t.start, t.end) + 1);
const spent = (t) => t.expenses.reduce((a, e) => a + e.amount, 0);
const pct = (a, b) => (b > 0 ? Math.min(999, Math.round((a / b) * 100)) : 0);
const imgTag = (src, alt = '') => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG">`;
const barClass = (p) => (p >= 100 ? 'bad' : p >= 85 ? 'warn' : '');
const status = (t) => (t.end < today() ? 'Completed' : t.start <= today() ? 'Ongoing' : 'Upcoming');

function toast(msg, err) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
const icons = {
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  suitcase: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M8 12h2m4 0h2M8 16h2m4 0h2"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4m4 4H7"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="16" cy="13.5" r="1.2"/>',
  spend: '<path d="M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3"/>',
  save: '<path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
  plane: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/>'
};
const ico = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icons[n]}</svg>`;

/* ---------- charts ---------- */
function donut(items, centerTop, centerBottom) {
  const total = items.reduce((a, i) => a + i.value, 0);
  const R = 70, C = 2 * Math.PI * R;
  let off = 0;
  const segs = total
    ? items.map((i) => {
        const len = (i.value / total) * C;
        const s = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${i.color}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 3)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="round"/>`;
        off += len;
        return s;
      }).join('')
    : '';
  return `<div class="donut"><svg width="180" height="180" viewBox="0 0 180 180"><circle cx="90" cy="90" r="${R}" fill="none" stroke="#edf2f9" stroke-width="22"/>${segs}</svg><div class="mid"><div><b>${centerTop}</b><small>${centerBottom}</small></div></div></div>`;
}
const legend = (items, fmt) => `<div class="legend">${items.map((i) => `<div><i style="background:${i.color}"></i><span>${esc(i.label)}</span><span>${fmt(i.value)}</span></div>`).join('')}</div>`;

/* ---------- shell ---------- */
const NAV = [
  ['dashboard', 'Dashboard', 'home'], ['explore', 'Explore', 'compass'], ['trips', 'My Trips', 'suitcase'],
  ['estimate', 'Budget Estimator', 'calc'], ['currency', 'Currency', 'swap']
];
function renderNav(route) {
  $('#nav').innerHTML = NAV.map(([k, l, i]) => `<a class="nav-link ${route === k || (k === 'trips' && route === 'trip') ? 'active' : ''}" href="#/${k}">${ico(i)}<span>${l}</span></a>`).join('');
}
function renderCurSelect() {
  const sel = $('#curSelect');
  sel.innerHTML = Object.keys(S.rates).map((c) => `<option ${c === S.cur ? 'selected' : ''}>${c}</option>`).join('');
}

/* ---------- pages ---------- */
async function pageDashboard() {
  const sum = await api('/api/summary?currency=' + S.cur);
  const upcoming = S.trips.filter((t) => t.end >= today()).sort((a, b) => a.start.localeCompare(b.start));
  const next = upcoming[0];
  const p = pct(sum.totalSpent, sum.totalBudget);
  const cd = next ? Math.max(0, daysBetween(today(), next.start)) : 0;
  const hero = next
    ? `<div class="hero">${imgTag(next.image, next.destination)}
        <div class="count"><div><b>${cd}</b><span>days</span></div><div><b>${tripDays(next)}</b><span>nights</span></div></div>
        <div class="hero-in"><span class="chip">${status(next) === 'Ongoing' ? 'Happening now' : 'Next adventure'}</span>
        <h1>${esc(next.name)}</h1><p>${esc(next.destination)} · ${fdate(next.start)} – ${fdateY(next.end)} · ${next.travelers} traveler${next.travelers > 1 ? 's' : ''}</p>
        <a class="btn btn-white" href="#/trip/${next.id}">Open trip plan →</a></div></div>`
    : `<div class="hero">${imgTag('https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=70')}
        <div class="hero-in"><span class="chip">Welcome</span><h1>Where to next?</h1><p>Plan a trip, set a budget and track every rupee as you go.</p>
        <button class="btn btn-white" data-act="new-trip">Plan your first trip</button></div></div>`;
  const cats = sum.byCategory.map((c) => ({ label: c.category, value: c.amount, color: CAT_COLOR[c.category] || '#94a3b8' }));
  view.innerHTML = `
    <div class="page-head"><div><h1>Hey traveler 👋</h1><p>Here's your travel and budget snapshot.</p></div></div>
    ${hero}
    <div class="grid g4 mt">
      ${statCard('Total budget', money(sum.totalBudget, S.cur), 'wallet', '#e0f2fe', '#0284c7')}
      ${statCard('Total spent', money(sum.totalSpent, S.cur), 'spend', '#ffe9e2', '#ea580c')}
      ${statCard('Remaining', money(sum.remaining, S.cur), 'save', sum.remaining >= 0 ? '#e3f8ec' : '#ffe9e9', sum.remaining >= 0 ? '#16a34a' : '#dc2626')}
      ${statCard('Trips planned', sum.tripCount, 'plane', '#ede9fe', '#7c3aed')}
    </div>
    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><h2>Budget vs spent by trip</h2><span class="chip ${p >= 100 ? 'bad' : p >= 85 ? 'warn' : 'ok'}">${p}% used overall</span></div>
        ${sum.trips.length ? sum.trips.map((t) => { const tp = pct(t.spent, t.budget); return `<div class="row-bar"><div class="top"><a href="#/trip/${t.id}">${esc(t.name)}</a><span class="muted">${money(t.spent, S.cur)} / ${money(t.budget, S.cur)}</span></div><div class="bar ${barClass(tp)}"><i style="width:${Math.min(100, tp)}%"></i></div></div>`; }).join('') : '<div class="empty">No trips yet.</div>'}
      </div>
      <div class="card"><div class="card-head"><h2>Spending mix</h2></div>
        ${cats.length ? `<div class="donut-wrap">${donut(cats, money(sum.totalSpent, S.cur), 'spent')}${legend(cats, (v) => money(v, S.cur))}</div>` : '<div class="empty">Add expenses to see your mix.</div>'}
      </div>
    </div>
    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><h2>Recent expenses</h2></div>
        ${sum.recent.length ? sum.recent.map((e) => expenseRow(e, money(e.amount, S.cur), `${esc(e.trip)} · ${fdate(e.date)}`)).join('') : '<div class="empty">Nothing logged yet.</div>'}
      </div>
      <div class="card"><div class="card-head"><h2>Trending picks</h2><a class="btn btn-ghost btn-sm" href="#/explore">See all</a></div>
        ${S.dests.slice(0, 4).map((d) => `<a class="list-item" href="#/explore"><div style="width:58px;height:58px;border-radius:16px;overflow:hidden;flex:none">${imgTag(d.image, d.name)}</div><div class="li-main"><b>${esc(d.name)}, ${esc(d.country)}</b><small>★ ${d.rating} · best ${esc(d.best)}</small></div><span class="amount">${money(conv(d.daily.mid, 'USD', S.cur), S.cur)}<small class="muted">/day</small></span></a>`).join('')}
      </div>
    </div>`;
}
const statCard = (label, val, icon, bg, fg) => `<div class="card stat"><div class="ico" style="background:${bg};color:${fg}">${ico(icon, 24)}</div><div><small>${label}</small><b>${val}</b></div></div>`;
const expenseRow = (e, amt, sub, del = '') => `<div class="list-item"><div class="li-ico" style="background:${CAT_COLOR[e.category]}22;color:${CAT_COLOR[e.category]}">${CAT_ABBR[e.category] || 'OT'}</div><div class="li-main"><b>${esc(e.title)}</b><small>${sub}</small></div><span class="amount">${amt}</span>${del}</div>`;

function pageExplore() {
  const tags = ['all', 'beach', 'city', 'culture', 'nature', 'adventure', 'luxury'];
  const q = S.q.toLowerCase();
  const list = S.dests.filter((d) => (S.filter === 'all' || d.tags.includes(S.filter)) && (!q || (d.name + d.country).toLowerCase().includes(q)));
  view.innerHTML = `
    <div class="page-head"><div><h1>Explore destinations</h1><p>Hand-picked places with realistic daily costs.</p></div></div>
    <div class="filters">${tags.map((t) => `<button class="pill ${S.filter === t ? 'on' : ''}" data-act="filter" data-v="${t}">${t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    <div class="grid g3">${list.map((d) => `
      <article class="dest"><div class="pic">${imgTag(d.image, d.name)}<span class="rate">★ ${d.rating}</span></div>
        <div class="body"><h3>${esc(d.name)} <small class="muted" style="font-weight:600">${esc(d.country)}</small></h3>
          <p class="muted" style="font-size:14px">${esc(d.blurb)}</p>
          <div class="tags">${d.tags.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
          <div class="price"><div><b>${money(conv(d.daily.mid, 'USD', S.cur), S.cur)}</b><small>per person / day · mid-range</small></div>
            <div style="display:flex;gap:8px"><a class="btn btn-ghost btn-sm" href="#/estimate" data-act="estimate-for" data-id="${d.id}">Estimate</a><button class="btn btn-primary btn-sm" data-act="new-trip" data-dest="${d.id}">Plan</button></div></div>
        </div></article>`).join('') || '<div class="card empty" style="grid-column:1/-1">No destinations match.</div>'}</div>`;
}

function pageTrips() {
  const q = S.q.toLowerCase();
  const list = S.trips.filter((t) => !q || (t.name + t.destination).toLowerCase().includes(q));
  view.innerHTML = `
    <div class="page-head"><div><h1>My trips</h1><p>${S.trips.length} trip${S.trips.length === 1 ? '' : 's'} on your radar.</p></div><button class="btn btn-primary" data-act="new-trip">+ New trip</button></div>
    <div class="grid g3">${list.map((t) => {
      const sp = spent(t), p = pct(sp, t.budget), st = status(t);
      return `<a class="dest trip-card" href="#/trip/${t.id}"><div class="pic">${imgTag(t.image, t.destination)}<span class="chip ${st === 'Completed' ? '' : 'ok'}">${st}</span></div>
        <div class="body"><h3>${esc(t.name)}</h3><p class="muted" style="font-size:14px">${esc(t.destination)} · ${fdate(t.start)} – ${fdate(t.end)}</p>
          <div style="margin-top:14px"><div class="row-bar" style="margin:0"><div class="top"><span>${money(sp, t.currency)} spent</span><span class="muted">of ${money(t.budget, t.currency)}</span></div><div class="bar ${barClass(p)}"><i style="width:${Math.min(100, p)}%"></i></div></div></div>
        </div></a>`;
    }).join('') || '<div class="card empty" style="grid-column:1/-1">No trips found. Create one!</div>'}</div>`;
}

function pageTrip(id) {
  const t = S.trips.find((x) => x.id === id);
  if (!t) { view.innerHTML = '<div class="card empty">Trip not found. <a href="#/trips" class="chip">Back to trips</a></div>'; return; }
  const sp = spent(t), p = pct(sp, t.budget), left = t.budget - sp, days = tripDays(t);
  const tabs = [['overview', 'Overview'], ['itinerary', 'Itinerary'], ['expenses', 'Expenses'], ['packing', 'Packing']];
  let body = '';
  if (S.tab === 'overview') {
    const byCat = {};
    t.expenses.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + e.amount));
    const items = Object.entries(byCat).map(([k, v]) => ({ label: k, value: v, color: CAT_COLOR[k] }));
    const dayLeft = Math.max(1, daysBetween(today(), t.end) + 1);
    const packDone = t.packing.filter((x) => x.done).length;
    body = `<div class="grid g4">
        ${statCard('Budget', money(t.budget, t.currency), 'wallet', '#e0f2fe', '#0284c7')}
        ${statCard('Spent', money(sp, t.currency), 'spend', '#ffe9e2', '#ea580c')}
        ${statCard(left >= 0 ? 'Left to spend' : 'Over budget', money(Math.abs(left), t.currency), 'save', left >= 0 ? '#e3f8ec' : '#ffe9e9', left >= 0 ? '#16a34a' : '#dc2626')}
        ${statCard('Per person / day', money(t.budget / t.travelers / days, t.currency), 'plane', '#ede9fe', '#7c3aed')}
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-head"><h2>Budget health</h2><span class="chip ${p >= 100 ? 'bad' : p >= 85 ? 'warn' : 'ok'}">${p >= 100 ? 'Over budget' : p >= 85 ? 'Almost there' : 'On track'}</span></div>
          <div class="donut-wrap">${donut(items.length ? items : [], p + '%', 'of budget')}${items.length ? legend(items, (v) => money(v, t.currency)) : '<div class="muted">No expenses yet.</div>'}</div>
          ${t.end >= today() && left > 0 ? `<p class="muted" style="margin-top:16px;font-size:14px">Safe daily spend for the remaining ${dayLeft} day${dayLeft > 1 ? 's' : ''}: <b style="color:var(--ink)">${money(left / dayLeft, t.currency)}</b></p>` : ''}
        </div>
        <div class="card"><div class="card-head"><h2>Trip progress</h2></div>
          <div class="row-bar"><div class="top"><span>Packing</span><span class="muted">${packDone}/${t.packing.length}</span></div><div class="bar"><i style="width:${pct(packDone, t.packing.length)}%"></i></div></div>
          <div class="row-bar"><div class="top"><span>Itinerary activities</span><span class="muted">${t.itinerary.length} planned</span></div><div class="bar"><i style="width:${Math.min(100, (t.itinerary.length / (days * 2)) * 100)}%"></i></div></div>
          <div class="row-bar"><div class="top"><span>Budget used</span><span class="muted">${p}%</span></div><div class="bar ${barClass(p)}"><i style="width:${Math.min(100, p)}%"></i></div></div>
          <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" data-act="edit-budget" data-id="${t.id}">Edit budget</button><button class="btn btn-danger btn-sm" data-act="del-trip" data-id="${t.id}">Delete trip</button></div>
        </div></div>`;
  } else if (S.tab === 'itinerary') {
    const byDay = {};
    t.itinerary.forEach((a) => (byDay[a.day] = byDay[a.day] || []).push(a));
    const dayNums = [...new Set([...Array(days).keys()].map((i) => i + 1).concat(Object.keys(byDay).map(Number)))].sort((a, b) => a - b);
    body = `<div class="grid g-main"><div class="card"><div class="card-head"><h2>Day-by-day plan</h2></div>
      ${dayNums.map((d) => {
        const date = new Date(new Date(t.start + 'T00:00:00').getTime() + (d - 1) * 864e5).toISOString().slice(0, 10);
        return `<div class="day"><span class="dot"></span><h3>Day ${d} <span class="muted" style="font-weight:600">· ${fdate(date)}</span></h3>${(byDay[d] || []).map((a) => `<div class="act"><time>${esc(a.time)}</time><div class="li-main"><b>${esc(a.title)}</b>${a.note ? `<small>${esc(a.note)}</small>` : ''}</div><button class="x" data-act="del-act" data-id="${a.id}" aria-label="Remove">×</button></div>`).join('') || '<small class="muted">Free day — add something fun</small>'}</div>`;
      }).join('')}</div>
      <div class="card"><div class="card-head"><h2>Add activity</h2></div>
        <form data-form="activity"><div class="row2"><div class="field"><label>Day</label><select name="day">${[...Array(days).keys()].map((i) => `<option value="${i + 1}">Day ${i + 1}</option>`).join('')}</select></div><div class="field"><label>Time</label><input type="time" name="time" value="09:00"></div></div>
        <div class="field"><label>Activity</label><input name="title" placeholder="e.g. Sunset cruise" required></div>
        <div class="field"><label>Note</label><textarea name="note" rows="2" placeholder="Booking ref, tips…"></textarea></div>
        <button class="btn btn-primary" style="width:100%">Add to itinerary</button></form></div></div>`;
  } else if (S.tab === 'expenses') {
    const total = sp;
    body = `<div class="grid g-main"><div class="card"><div class="card-head"><h2>Expenses</h2><span class="chip">${t.expenses.length} items · ${money(total, t.currency)}</span></div>
      ${t.expenses.length ? t.expenses.map((e) => expenseRow(e, money(e.amount, t.currency), `${esc(e.category)} · ${fdate(e.date)}`, `<button class="x" data-act="del-exp" data-id="${e.id}" aria-label="Remove">×</button>`)).join('') : '<div class="empty">No expenses yet. Log your first one →</div>'}</div>
      <div class="card"><div class="card-head"><h2>Add expense</h2></div>
        <form data-form="expense"><div class="field"><label>What was it?</label><input name="title" placeholder="e.g. Dinner at beach shack" required></div>
        <div class="row2"><div class="field"><label>Amount (${t.currency})</label><input type="number" name="amount" min="1" step="any" required></div><div class="field"><label>Category</label><select name="category">${S.cats.map((c) => `<option>${c}</option>`).join('')}</select></div></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${today()}"></div>
        <button class="btn btn-primary" style="width:100%">Add expense</button></form></div></div>`;
  } else {
    const done = t.packing.filter((x) => x.done).length;
    body = `<div class="grid g-main"><div class="card"><div class="card-head"><h2>Packing checklist</h2><span class="chip ${done === t.packing.length && done ? 'ok' : ''}">${done}/${t.packing.length} packed</span></div>
      <div class="bar" style="margin-bottom:10px"><i style="width:${pct(done, t.packing.length)}%"></i></div>
      ${t.packing.map((x) => `<div class="pack ${x.done ? 'done' : ''}"><input type="checkbox" data-act="toggle-pack" data-id="${x.id}" ${x.done ? 'checked' : ''}><span>${esc(x.text)}</span><button class="x" data-act="del-pack" data-id="${x.id}" aria-label="Remove">×</button></div>`).join('') || '<div class="empty">Your list is empty.</div>'}</div>
      <div class="card"><div class="card-head"><h2>Add item</h2></div><form data-form="pack"><div class="field"><label>Item</label><input name="text" placeholder="e.g. Rain jacket" required></div><button class="btn btn-primary" style="width:100%">Add item</button></form></div></div>`;
  }
  view.innerHTML = `
    <div class="banner">${imgTag(t.image, t.destination)}<div class="banner-in"><div><span class="chip" style="background:rgba(255,255,255,.22);color:#fff">${status(t)}</span><h1>${esc(t.name)}</h1>
      <div class="meta"><span>📍 ${esc(t.destination)}</span><span>🗓 ${fdate(t.start)} – ${fdateY(t.end)} (${days} days)</span><span>👥 ${t.travelers} traveler${t.travelers > 1 ? 's' : ''}</span></div></div>
      <a class="btn btn-white" href="#/trips">← All trips</a></div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div>
    ${body}`;
}

function pageEstimate() {
  const e = S.estimate;
  const d0 = e ? e.destination.id : (S.estDest || S.dests[0].id);
  view.innerHTML = `
    <div class="page-head"><div><h1>Smart budget estimator</h1><p>Get a realistic price for your trip in seconds.</p></div></div>
    <div class="est-hero">
      <div class="card"><form data-form="estimate">
        <div class="field"><label>Destination</label><select name="destId">${S.dests.map((d) => `<option value="${d.id}" ${d.id === d0 ? 'selected' : ''}>${esc(d.name)}, ${esc(d.country)}</option>`).join('')}</select></div>
        <div class="row2"><div class="field"><label>Days</label><input type="number" name="days" min="1" max="60" value="${e ? e.days : 7}"></div><div class="field"><label>Travelers</label><input type="number" name="travelers" min="1" max="20" value="${e ? e.travelers : 2}"></div></div>
        <div class="field"><label>Travel style</label><div class="seg">${['budget', 'mid', 'luxury'].map((s) => `<label><input type="radio" name="style" value="${s}" ${(e ? e.style : 'mid') === s ? 'checked' : ''}>${s === 'mid' ? 'Comfort' : s[0].toUpperCase() + s.slice(1)}</label>`).join('')}</div></div>
        <button class="btn btn-primary" style="width:100%">Calculate estimate</button></form></div>
      <div id="estResult">${e ? estimateResult(e) : `<div class="card empty"><div style="font-size:42px">🧭</div><h3>Your estimate will appear here</h3><p>Pick a destination and style, then hit calculate.</p></div>`}</div>
    </div>`;
}
function estimateResult(e) {
  const items = Object.entries(e.breakdown).map(([k, v]) => ({ label: k, value: v, color: CAT_COLOR[k] }));
  const f = (usd) => money(conv(usd, 'USD', S.cur), S.cur);
  return `<div class="grid">
    <div class="dest" style="display:grid;grid-template-columns:200px 1fr"><div class="pic" style="height:100%;min-height:150px">${imgTag(e.destination.image, e.destination.name)}</div>
      <div class="big-total" style="border-radius:0"><small>${esc(e.destination.name)} · ${e.days} days · ${e.travelers} traveler${e.travelers > 1 ? 's' : ''}</small><b>${f(e.total)}</b><div class="sub"><div><small>Per person</small><b>${f(e.perPerson)}</b></div><div><small>Per day</small><b>${f(e.perDay)}</b></div></div></div></div>
    <div class="card"><div class="card-head"><h2>Where the money goes</h2></div>
      <div class="donut-wrap">${donut(items, f(e.total), 'total')}${legend(items, f)}</div>
      <div class="cmp">${['budget', 'mid', 'luxury'].map((s) => `<div class="${e.style === s ? 'on' : ''}"><small>${s === 'mid' ? 'comfort' : s}</small><b>${f(e.compare[s])}</b></div>`).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>Smart tips</h2><button class="btn btn-primary btn-sm" data-act="trip-from-estimate">Create trip with this budget</button></div>${e.tips.map((t) => `<div class="tip">${esc(t)}</div>`).join('')}</div></div>`;
}

function pageCurrency() {
  const codes = Object.keys(S.rates);
  const opts = (sel) => codes.map((c) => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
  view.innerHTML = `
    <div class="page-head"><div><h1>Currency converter</h1><p>Quick conversions for spending abroad. Rates are indicative.</p></div></div>
    <div class="grid g-main"><div class="card">
      <div class="conv-box"><div class="field" style="margin:0"><label>Amount</label><input id="cvAmt" type="number" value="100" min="0" step="any"></div>
      <button class="icon-btn" id="cvSwap" title="Swap" style="margin-bottom:2px">${ico('swap')}</button>
      <div class="field" style="margin:0"><label>From → To</label><div class="row2"><select id="cvFrom">${opts('USD')}</select><select id="cvTo">${opts(S.cur === 'USD' ? 'EUR' : S.cur)}</select></div></div></div>
      <div class="conv-out" id="cvOut">—</div><div class="muted" id="cvRate"></div></div>
      <div class="card"><div class="card-head"><h2>Rates vs USD</h2></div>${codes.filter((c) => c !== 'USD').map((c) => `<div class="rate-row"><span>1 USD</span><span>${S.rates[c]} ${c}</span></div>`).join('')}</div></div>`;
  const run = async () => {
    try {
      const r = await api(`/api/convert?amount=${encodeURIComponent($('#cvAmt').value || 0)}&from=${$('#cvFrom').value}&to=${$('#cvTo').value}`);
      $('#cvOut').textContent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.result) + ' ' + r.to;
      $('#cvRate').textContent = `1 ${r.from} = ${r.rate.toFixed(4)} ${r.to}`;
    } catch (e) { $('#cvOut').textContent = '—'; }
  };
  ['cvAmt', 'cvFrom', 'cvTo'].forEach((id) => $('#' + id).addEventListener('input', run));
  $('#cvSwap').onclick = () => { const a = $('#cvFrom').value; $('#cvFrom').value = $('#cvTo').value; $('#cvTo').value = a; run(); };
  run();
}

/* ---------- modal ---------- */
function openModal(html) {
  $('#modalRoot').innerHTML = `<div class="overlay" data-act="close-modal"><div class="modal" onclick="event.stopPropagation()">${html}</div></div>`;
}
const closeModal = () => ($('#modalRoot').innerHTML = '');

function tripModal(destId, budgetUSD) {
  const d = S.dests.find((x) => x.id === destId);
  const s = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const e = new Date(Date.now() + 36 * 864e5).toISOString().slice(0, 10);
  const cur = d ? (S.rates[d.currency] && ['INR', 'USD', 'EUR', 'AED', 'CHF'].includes(d.currency) ? d.currency : S.cur) : S.cur;
  const bud = budgetUSD ? Math.round(conv(budgetUSD, 'USD', cur)) : '';
  openModal(`<h2>Plan a new trip</h2><p class="sub">Set the basics — you can add the details later.</p>
    <form data-form="trip">
      <div class="field"><label>Trip name</label><input name="name" placeholder="e.g. Summer escape" value="${d ? esc(d.name) + ' getaway' : ''}" required></div>
      <div class="field"><label>Destination</label><select name="destId">${S.dests.map((x) => `<option value="${x.id}" ${d && d.id === x.id ? 'selected' : ''}>${esc(x.name)}, ${esc(x.country)}</option>`).join('')}</select></div>
      <div class="row2"><div class="field"><label>Start</label><input type="date" name="start" value="${s}" required></div><div class="field"><label>End</label><input type="date" name="end" value="${e}" required></div></div>
      <div class="row2"><div class="field"><label>Travelers</label><input type="number" name="travelers" min="1" value="2"></div>
      <div class="field"><label>Currency</label><select name="currency">${Object.keys(S.rates).map((c) => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
      <div class="field"><label>Budget</label><input type="number" name="budget" min="0" step="any" value="${bud}" placeholder="Total budget" required></div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="close-modal">Cancel</button><button class="btn btn-primary">Create trip</button></div>
    </form>`);
}

/* ---------- events ---------- */
async function refresh() { const b = await api('/api/bootstrap'); S.trips = b.trips; S.dests = b.destinations; S.rates = b.rates; S.cats = b.categories; }
const currentTripId = () => (location.hash.match(/#\/trip\/([^/?]+)/) || [])[1];

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, tid = currentTripId();
  try {
    switch (act) {
      case 'close-modal': if (ev.target === el || el.tagName === 'BUTTON') closeModal(); break;
      case 'new-trip': tripModal(el.dataset.dest); break;
      case 'filter': S.filter = el.dataset.v; pageExplore(); break;
      case 'estimate-for': S.estDest = id; S.estimate = null; break;
      case 'tab': S.tab = el.dataset.v; pageTrip(tid); break;
      case 'del-trip':
        if (!confirm('Delete this trip and everything in it?')) return;
        await api('/api/trips/' + id, 'DELETE'); await refresh(); toast('Trip deleted'); location.hash = '#/trips'; break;
      case 'edit-budget': {
        const t = S.trips.find((x) => x.id === id);
        const v = prompt(`New budget in ${t.currency}:`, t.budget);
        if (v === null) return;
        await api('/api/trips/' + id, 'PUT', { budget: v }); await refresh(); pageTrip(id); toast('Budget updated'); break;
      }
      case 'del-exp': await api(`/api/trips/${tid}/expenses/${id}`, 'DELETE'); await refresh(); pageTrip(tid); toast('Expense removed'); break;
      case 'del-act': await api(`/api/trips/${tid}/itinerary/${id}`, 'DELETE'); await refresh(); pageTrip(tid); break;
      case 'del-pack': await api(`/api/trips/${tid}/packing/${id}`, 'DELETE'); await refresh(); pageTrip(tid); break;
      case 'toggle-pack': await api(`/api/trips/${tid}/packing/${id}`, 'PATCH', { done: el.checked }); await refresh(); pageTrip(tid); break;
      case 'trip-from-estimate': tripModal(S.estimate.destination.id, S.estimate.total); break;
    }
  } catch (e) { toast(e.message, true); }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  const tid = currentTripId();
  try {
    switch (f.dataset.form) {
      case 'trip': {
        const t = await api('/api/trips', 'POST', data);
        await refresh(); closeModal(); toast('Trip created ✈️'); S.tab = 'overview'; location.hash = '#/trip/' + t.id; break;
      }
      case 'expense': await api(`/api/trips/${tid}/expenses`, 'POST', data); await refresh(); pageTrip(tid); toast('Expense added'); break;
      case 'activity': await api(`/api/trips/${tid}/itinerary`, 'POST', data); await refresh(); pageTrip(tid); toast('Activity added'); break;
      case 'pack': await api(`/api/trips/${tid}/packing`, 'POST', data); await refresh(); pageTrip(tid); break;
      case 'estimate': S.estimate = await api('/api/estimate', 'POST', data); $('#estResult').innerHTML = estimateResult(S.estimate); break;
    }
  } catch (e) { toast(e.message, true); }
});

$('#curSelect').addEventListener('change', (e) => { S.cur = e.target.value; localStorage.setItem('wl_cur', S.cur); router(); });
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#globalSearch').addEventListener('input', (e) => {
  S.q = e.target.value;
  const r = (location.hash.slice(2).split('/')[0]) || 'dashboard';
  if (r === 'trips') pageTrips();
  else if (S.q && r !== 'explore') location.hash = '#/explore';
  else if (r === 'explore') pageExplore();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ---------- router ---------- */
async function router() {
  const [route = 'dashboard', param] = location.hash.slice(2).split('?')[0].split('/');
  $('#sidebar').classList.remove('open');
  renderNav(route || 'dashboard');
  window.scrollTo({ top: 0 });
  try {
    if (route === 'dashboard' || !route) await pageDashboard();
    else if (route === 'explore') pageExplore();
    else if (route === 'trips') pageTrips();
    else if (route === 'trip') pageTrip(param);
    else if (route === 'estimate') pageEstimate();
    else if (route === 'currency') pageCurrency();
    else if (route === 'new') {
      const dest = new URLSearchParams(location.hash.split('?')[1] || '').get('dest') || undefined;
      history.replaceState(null, '', '#/trips');
      renderNav('trips'); pageTrips(); tripModal(dest);
    }
    else location.hash = '#/dashboard';
  } catch (e) { view.innerHTML = `<div class="card empty">Couldn't load this page: ${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', () => { if (!/^#\/trip\//.test(location.hash)) S.tab = 'overview'; router(); });

(async function init() {
  try { await refresh(); } catch (e) { view.innerHTML = '<div class="card empty">Cannot reach the server. Start it with <code>npm start</code>.</div>'; return; }
  if (!S.rates[S.cur]) S.cur = 'USD';
  renderCurSelect();
  if (!location.hash) location.hash = '#/dashboard'; else router();
})();
