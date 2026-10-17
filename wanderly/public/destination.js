/* Wanderly destination detail page */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = (src, alt = '') => `<img src="${esc(src)}" alt="${esc(alt)}" onerror="this.onerror=null;this.src=FALLBACK_IMG">`;
const CAT_COLOR = { Flights: '#3b82f6', Stay: '#14b8a6', Food: '#ff7a59', Transport: '#8b5cf6', Activities: '#f5a524', Other: '#94a3b8' };
let rates = { USD: 1 }, cur = 'USD', dest = null, est = null;

const money = (usd) => {
  const v = usd * (rates[cur] || 1);
  try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v); }
  catch { return cur + ' ' + Math.round(v); }
};
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

$('#yr').textContent = new Date().getFullYear();
$('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));

function estimateHTML() {
  if (!est) return '';
  const items = Object.entries(est.breakdown);
  const max = Math.max(...items.map(([, v]) => v));
  return `<div class="total" style="margin-bottom:18px"><small>${est.days} days · ${est.travelers} traveler${est.travelers > 1 ? 's' : ''}</small><b style="font-size:42px">${money(est.total)}</b>
      <div class="sub"><div><small>Per person</small><b>${money(est.perPerson)}</b></div><div><small>Per day</small><b>${money(est.perDay)}</b></div></div></div>
    ${items.map(([k, v]) => `<div class="brow"><div class="t"><span>${k}</span><span>${money(v)}</span></div><div class="bar"><i style="width:${Math.round((v / max) * 100)}%;background:${CAT_COLOR[k] || '#94a3b8'}"></i></div></div>`).join('')}`;
}
async function runEstimate() {
  const data = Object.fromEntries(new FormData($('#mini')));
  data.destId = dest.id;
  try { est = await api('/api/estimate', 'POST', data); $('#miniOut').innerHTML = estimateHTML(); }
  catch (e) { $('#miniOut').innerHTML = `<p style="color:#c62828">${esc(e.message)}</p>`; }
}

function render() {
  const d = dest;
  document.title = `${d.name}, ${d.country} · Wanderly`;
  $('#page').innerHTML = `
    <section class="dhero" style="padding:0">${img(d.image, d.name)}
      <div class="wrap"><div style="display:flex;gap:8px;flex-wrap:wrap">${d.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <h1>${esc(d.name)}</h1><p class="lead" style="color:rgba(255,255,255,.92);font-size:21px">${esc(d.country)} · ${esc(d.blurb)}</p></div></section>
    <div class="wrap">
      <div class="facts">
        <div class="fact"><small>Rating</small><b>★ ${d.rating}</b></div>
        <div class="fact"><small>Best time to go</small><b style="font-size:19px">${esc(d.best)}</b></div>
        <div class="fact"><small>Mid-range / day</small><b id="fDay">${money(d.daily.mid)}</b></div>
        <div class="fact"><small>Typical flight</small><b id="fFlight">${money(d.flight)}</b></div>
      </div>
      <div class="dlayout">
        <div>
          <span class="eyebrow">Daily costs</span>
          <h2 style="font-size:34px;margin-bottom:8px">What a day in ${esc(d.name)} costs</h2>
          <p style="color:var(--muted);margin-bottom:22px">Per person, per day, excluding flights.</p>
          <div class="panel" style="padding:10px 28px">
            <div class="cost-row"><div><b>Budget</b><div style="color:var(--muted);font-size:14px">Hostels, street food, public transport</div></div><b data-usd="${d.daily.budget}">${money(d.daily.budget)}</b></div>
            <div class="cost-row"><div><b>Comfort</b><div style="color:var(--muted);font-size:14px">3-star stays, restaurants, some tours</div></div><b data-usd="${d.daily.mid}">${money(d.daily.mid)}</b></div>
            <div class="cost-row"><div><b>Luxury</b><div style="color:var(--muted);font-size:14px">Premium stays, fine dining, private transfers</div></div><b data-usd="${d.daily.luxury}">${money(d.daily.luxury)}</b></div>
          </div>
          <div class="panel" style="margin-top:22px;background:linear-gradient(135deg,#e8fbf9,#eaf2ff)">
            <h3>Ready to plan ${esc(d.name)}?</h3><p style="color:var(--muted);margin:6px 0 16px">Create a trip in the dashboard with dates, budget, itinerary and packing list.</p>
            <a class="btn btn-primary" href="/app.html#/new?dest=${d.id}">Plan this trip →</a></div>
        </div>
        <div class="sticky"><div class="panel">
          <h3 style="margin-bottom:16px">Quick estimate</h3>
          <form id="mini">
            <div class="row2"><div class="field"><label>Days</label><input type="number" name="days" min="1" max="60" value="7"></div><div class="field"><label>Travelers</label><input type="number" name="travelers" min="1" max="20" value="2"></div></div>
            <div class="field"><label>Style</label><div class="seg"><label><input type="radio" name="style" value="budget">Budget</label><label><input type="radio" name="style" value="mid" checked>Comfort</label><label><input type="radio" name="style" value="luxury">Luxury</label></div></div>
            <div class="field"><label>Currency</label><select id="curSel">${Object.keys(rates).map((c) => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <button class="btn btn-primary" style="width:100%;margin-bottom:20px">Estimate</button>
          </form>
          <div id="miniOut"></div>
        </div></div>
      </div>
      ${d.related.length ? `<div style="padding:30px 0 20px"><h2 style="font-size:30px;margin-bottom:22px">You might also like</h2>
        <div class="rel">${d.related.map((r) => `<a class="dcard" href="/destination.html?id=${r.id}">${img(r.image, r.name)}<div class="top"><span class="tag">${esc(r.tags[0])}</span><span class="tag">★ ${r.rating}</span></div><div class="info"><h3>${esc(r.name)}</h3><p>${esc(r.blurb)}</p></div></a>`).join('')}</div></div>` : ''}
    </div>`;
  $('#mini').addEventListener('submit', (e) => { e.preventDefault(); runEstimate(); });
  $('#curSel').addEventListener('change', (e) => {
    cur = e.target.value;
    $('#fDay').textContent = money(d.daily.mid); $('#fFlight').textContent = money(d.flight);
    document.querySelectorAll('[data-usd]').forEach((el) => (el.textContent = money(Number(el.dataset.usd))));
    $('#miniOut').innerHTML = estimateHTML();
  });
  runEstimate();
}

(async function init() {
  const id = new URLSearchParams(location.search).get('id');
  try {
    const b = await api('/api/bootstrap'); rates = b.rates;
    dest = await api('/api/destinations/' + encodeURIComponent(id || ''));
    render();
  } catch (e) {
    $('#page').innerHTML = `<div class="wrap" style="padding:170px 24px 100px;text-align:center"><h2>Destination not found</h2><p style="color:var(--muted);margin:10px 0 24px">${esc(e.message)}</p><a class="btn btn-primary" href="/#destinations">Browse destinations</a></div>`;
  }
})();
