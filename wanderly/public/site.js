/* Wanderly public website */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAT_COLOR = { Flights: '#3b82f6', Stay: '#14b8a6', Food: '#ff7a59', Transport: '#8b5cf6', Activities: '#f5a524', Other: '#94a3b8' };
const state = { dests: [], rates: { USD: 1 }, filter: 'all', est: null };

const conv = (usd, cur) => usd * (state.rates[cur] || 1);
const money = (usd, cur) => {
  try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(conv(usd, cur)); }
  catch { return cur + ' ' + Math.round(conv(usd, cur)); }
};
const img = (src, alt = '') => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src=FALLBACK_IMG">`;
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toastRoot').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

/* nav */
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
window.addEventListener('scroll', onScroll); onScroll();
$('#burger').addEventListener('click', () => nav.classList.toggle('open'));
nav.addEventListener('click', (e) => { if (e.target.closest('.links a')) nav.classList.remove('open'); });
$('#yr').textContent = new Date().getFullYear();

/* reveal on scroll */
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
const observe = () => document.querySelectorAll('.rv:not(.in)').forEach((el) => io.observe(el));

/* destinations */
function renderFilters() {
  const tags = ['all', 'beach', 'city', 'culture', 'nature', 'adventure', 'luxury'];
  $('#filters').innerHTML = tags.map((t) => `<button class="pill ${state.filter === t ? 'on' : ''}" data-f="${t}">${t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}</button>`).join('');
}
function renderDests() {
  const list = state.dests.filter((d) => state.filter === 'all' || d.tags.includes(state.filter));
  $('#dgrid').innerHTML = list.map((d) => `
    <a class="dcard" href="/destination.html?id=${d.id}">
      ${img(d.image, d.name)}
      <div class="top"><span class="tag">${esc(d.tags[0])}</span><span class="tag">★ ${d.rating}</span></div>
      <div class="info"><h3>${esc(d.name)}, ${esc(d.country)}</h3><p>${esc(d.blurb)}</p>
        <div class="price"><span>From <b>${money(d.daily.budget, 'USD')}</b>/day</span><span class="arrow"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></div>
    </a>`).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">No destinations match.</p>';
}
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  state.filter = b.dataset.f; renderFilters(); renderDests();
});

/* estimator */
function renderEstimate() {
  const e = state.est, cur = $('#eCur').value;
  if (!e) return;
  const items = Object.entries(e.breakdown);
  const max = Math.max(...items.map(([, v]) => v));
  $('#estResult').innerHTML = `<div class="result">
    <div class="total"><small>${esc(e.destination.name)} · ${e.days} day${e.days > 1 ? 's' : ''} · ${e.travelers} traveler${e.travelers > 1 ? 's' : ''}</small>
      <b>${money(e.total, cur)}</b>
      <div class="sub"><div><small>Per person</small><b>${money(e.perPerson, cur)}</b></div><div><small>Per day</small><b>${money(e.perDay, cur)}</b></div></div></div>
    <div class="panel"><h3 style="margin-bottom:18px">Where the money goes</h3>
      ${items.map(([k, v]) => `<div class="brow"><div class="t"><span>${k}</span><span>${money(v, cur)}</span></div><div class="bar"><i style="width:${Math.round((v / max) * 100)}%;background:${CAT_COLOR[k] || '#94a3b8'}"></i></div></div>`).join('')}
      <div class="cmp">${['budget', 'mid', 'luxury'].map((s) => `<div class="${e.style === s ? 'on' : ''}"><small>${s === 'mid' ? 'comfort' : s}</small><b>${money(e.compare[s], cur)}</b></div>`).join('')}</div></div>
    <div class="panel"><h3 style="margin-bottom:8px">Smart tips</h3>${e.tips.map((t) => `<div class="tip">${esc(t)}</div>`).join('')}
      <a class="btn btn-primary" style="margin-top:18px" href="/app.html#/new?dest=${e.destination.id}">Plan this trip in the dashboard →</a></div>
  </div>`;
  $('#estResult').classList.add('in');
}
async function runEstimate() {
  const f = $('#estForm');
  const data = Object.fromEntries(new FormData(f));
  try { state.est = await api('/api/estimate', 'POST', data); renderEstimate(); }
  catch (err) { toast(err.message); }
}
$('#estForm').addEventListener('submit', (e) => { e.preventDefault(); runEstimate(); });
$('#eCur').addEventListener('change', renderEstimate);

$('#quickForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#eDest').value = $('#qDest').value;
  $('#eDays').value = $('#qDays').value;
  $('#eTrav').value = $('#qTrav').value;
  await runEstimate();
  $('#estimator').scrollIntoView({ behavior: 'smooth' });
});

/* newsletter */
$('#subForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#subMsg');
  try {
    await api('/api/subscribe', 'POST', { email: $('#subEmail').value });
    msg.style.color = '#12803a'; msg.textContent = "You're in! Watch your inbox for travel tips.";
    $('#subEmail').value = '';
  } catch (err) { msg.style.color = '#c62828'; msg.textContent = err.message; }
});

/* init */
(async function init() {
  observe();
  try {
    const b = await api('/api/bootstrap');
    state.dests = b.destinations; state.rates = b.rates;
  } catch (e) {
    $('#dgrid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Start the server with <code>npm start</code> to load destinations.</p>';
    return;
  }
  const opts = state.dests.map((d) => `<option value="${d.id}">${esc(d.name)}, ${esc(d.country)}</option>`).join('');
  $('#qDest').innerHTML = opts; $('#eDest').innerHTML = opts;
  $('#eCur').innerHTML = Object.keys(state.rates).map((c) => `<option ${c === 'USD' ? 'selected' : ''}>${c}</option>`).join('');
  $('#stDest').textContent = state.dests.length;
  $('#stCur').textContent = Object.keys(state.rates).length;
  renderFilters(); renderDests(); observe();
})();
