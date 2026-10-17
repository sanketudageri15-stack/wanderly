require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET;
const LOGIN_EMAIL = (process.env.LOGIN_EMAIL || 'user@example.com').trim().toLowerCase();
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'password123';
const COOKIE_NAME = 'wanderly_session';
const SESSION_DURATION = 24 * 60 * 60;

if (IS_PRODUCTION && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
  throw new Error('Set SESSION_SECRET to a random secret of at least 32 characters.');
}

const SIGNING_SECRET = SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

/* ---------- Static reference data ---------- */

const img = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

const DESTINATIONS = [
  { id: 'bali', name: 'Bali', country: 'Indonesia', image: img('photo-1537996194471-e657df975ab4'), tags: ['beach', 'culture', 'nature'], daily: { budget: 40, mid: 90, luxury: 250 }, flight: 650, best: 'Apr – Oct', currency: 'IDR', rating: 4.8, blurb: 'Rice terraces, surf breaks and temple sunsets on the Island of the Gods.' },
  { id: 'paris', name: 'Paris', country: 'France', image: img('photo-1502602898657-3e91760cbb34'), tags: ['city', 'culture', 'luxury'], daily: { budget: 110, mid: 220, luxury: 550 }, flight: 800, best: 'Apr – Jun, Sep – Oct', currency: 'EUR', rating: 4.7, blurb: 'Cafés, museums and golden-hour walks along the Seine.' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', image: img('photo-1540959733332-eab4deabeeaf'), tags: ['city', 'culture', 'adventure'], daily: { budget: 90, mid: 180, luxury: 450 }, flight: 700, best: 'Mar – May, Oct – Nov', currency: 'JPY', rating: 4.9, blurb: 'Neon streets, world-class food and quiet shrines side by side.' },
  { id: 'santorini', name: 'Santorini', country: 'Greece', image: img('photo-1570077188670-e3a8d69ac5ff'), tags: ['beach', 'luxury', 'culture'], daily: { budget: 100, mid: 210, luxury: 520 }, flight: 850, best: 'May – Oct', currency: 'EUR', rating: 4.8, blurb: 'Whitewashed cliffs, blue domes and caldera sunsets.' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', image: img('photo-1512453979798-5ea266f8880c'), tags: ['city', 'luxury', 'adventure'], daily: { budget: 100, mid: 210, luxury: 600 }, flight: 400, best: 'Nov – Mar', currency: 'AED', rating: 4.6, blurb: 'Record-breaking skyline, desert safaris and shopping.' },
  { id: 'newyork', name: 'New York', country: 'USA', image: img('photo-1496442226666-8d4d0e62e6e9'), tags: ['city', 'culture'], daily: { budget: 150, mid: 300, luxury: 700 }, flight: 1000, best: 'Apr – Jun, Sep – Nov', currency: 'USD', rating: 4.6, blurb: 'Broadway lights, Central Park and a slice on every corner.' },
  { id: 'maldives', name: 'Maldives', country: 'Maldives', image: img('photo-1514282401047-d79a71a590e8'), tags: ['beach', 'luxury', 'nature'], daily: { budget: 130, mid: 300, luxury: 900 }, flight: 600, best: 'Nov – Apr', currency: 'USD', rating: 4.9, blurb: 'Overwater villas, glowing lagoons and reef diving.' },
  { id: 'switzerland', name: 'Swiss Alps', country: 'Switzerland', image: img('photo-1530122037265-a5f1f91d3b99'), tags: ['nature', 'adventure', 'luxury'], daily: { budget: 150, mid: 290, luxury: 650 }, flight: 900, best: 'Jun – Sep, Dec – Mar', currency: 'CHF', rating: 4.8, blurb: 'Scenic trains, alpine lakes and storybook villages.' },
  { id: 'goa', name: 'Goa', country: 'India', image: img('photo-1512343879784-a960bf40e7f2'), tags: ['beach', 'culture'], daily: { budget: 25, mid: 55, luxury: 160 }, flight: 120, best: 'Nov – Feb', currency: 'INR', rating: 4.5, blurb: 'Sunny beaches, Portuguese heritage and legendary seafood.' },
  { id: 'jaipur', name: 'Jaipur', country: 'India', image: img('photo-1477587458883-47145ed94245'), tags: ['culture', 'city'], daily: { budget: 22, mid: 50, luxury: 150 }, flight: 90, best: 'Oct – Mar', currency: 'INR', rating: 4.6, blurb: 'The Pink City: forts, palaces and bustling bazaars.' }
];

const RATES = {
  USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 150,
  AED: 3.67, THB: 35.8, IDR: 15600, CHF: 0.88,
  AUD: 1.52, SGD: 1.34
};

const CATEGORIES = [
  'Flights', 'Stay', 'Food', 'Transport', 'Activities', 'Shopping', 'Other'
];

const DEFAULT_PACKING = [
  'Passport & visa',
  'Travel insurance',
  'Phone charger & power bank',
  'Universal adapter',
  'Medicines & first-aid',
  'Sunscreen',
  'Comfortable shoes',
  'Reusable water bottle'
];

/* ---------- JSON data store ---------- */

const uid = () => crypto.randomBytes(5).toString('hex');

const dayOffset = (n) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

function seed() {
  const dest = (id) => DESTINATIONS.find((d) => d.id === id);

  const pack = (done = 0) =>
    DEFAULT_PACKING.map((text, i) => ({
      id: uid(),
      text,
      done: i < done
    }));

  return {
    trips: [
      {
        id: uid(),
        name: 'Bali Reset',
        destId: 'bali',
        destination: 'Bali, Indonesia',
        image: dest('bali').image,
        start: dayOffset(21),
        end: dayOffset(28),
        travelers: 2,
        budget: 3200,
        currency: 'USD',
        itinerary: [
          { id: uid(), day: 1, time: '15:00', title: 'Check in at Ubud villa', note: 'Rice-terrace view room' },
          { id: uid(), day: 2, time: '06:00', title: 'Sunrise at Mount Batur', note: 'Guided trek, bring a jacket' },
          { id: uid(), day: 3, time: '10:00', title: 'Tegalalang rice terraces', note: '' },
          { id: uid(), day: 5, time: '17:30', title: 'Uluwatu temple & Kecak dance', note: '' }
        ],
        expenses: [
          { id: uid(), title: 'Return flights', category: 'Flights', amount: 1300, date: dayOffset(-12) },
          { id: uid(), title: 'Villa deposit', category: 'Stay', amount: 480, date: dayOffset(-8) },
          { id: uid(), title: 'Travel insurance', category: 'Other', amount: 64, date: dayOffset(-5) }
        ],
        packing: pack(3)
      },
      {
        id: uid(),
        name: 'Tokyo Food Trail',
        destId: 'tokyo',
        destination: 'Tokyo, Japan',
        image: dest('tokyo').image,
        start: dayOffset(70),
        end: dayOffset(77),
        travelers: 1,
        budget: 2400,
        currency: 'USD',
        itinerary: [
          { id: uid(), day: 1, time: '09:00', title: 'Tsukiji outer market breakfast', note: '' },
          { id: uid(), day: 2, time: '14:00', title: 'Shibuya & Harajuku', note: '' }
        ],
        expenses: [
          { id: uid(), title: 'Flights', category: 'Flights', amount: 720, date: dayOffset(-3) }
        ],
        packing: pack(1)
      },
      {
        id: uid(),
        name: 'Goa Long Weekend',
        destId: 'goa',
        destination: 'Goa, India',
        image: dest('goa').image,
        start: dayOffset(-40),
        end: dayOffset(-36),
        travelers: 4,
        budget: 60000,
        currency: 'INR',
        itinerary: [
          { id: uid(), day: 1, time: '12:00', title: 'Baga beach & shacks', note: '' }
        ],
        expenses: [
          { id: uid(), title: 'Train tickets', category: 'Transport', amount: 9800, date: dayOffset(-55) },
          { id: uid(), title: 'Beach resort', category: 'Stay', amount: 24000, date: dayOffset(-50) },
          { id: uid(), title: 'Seafood dinners', category: 'Food', amount: 11500, date: dayOffset(-38) },
          { id: uid(), title: 'Scooter rental', category: 'Transport', amount: 3200, date: dayOffset(-38) },
          { id: uid(), title: 'Water sports', category: 'Activities', amount: 6400, date: dayOffset(-37) }
        ],
        packing: pack(8)
      }
    ]
  };
}

function load() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seed(), null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

const save = (db) =>
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const convert = (amt, from, to) =>
  (amt / (RATES[from] || 1)) * (RATES[to] || 1);

const bad = (res, msg, code = 400) =>
  res.status(code).json({ error: msg });

const num = (v) =>
  Number.isFinite(Number(v)) ? Number(v) : NaN;

const str = (v, max = 120) =>
  String(v ?? '').trim().slice(0, max);

function findTrip(db, id) {
  return db.trips.find((t) => t.id === id);
}

/* ---------- Authentication helpers ---------- */

// Sign a short-lived session token using HMAC.
function createSessionToken(email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    expires: Math.floor(Date.now() / 1000) + SESSION_DURATION
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  const expected = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest();

  let supplied;

  try {
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    if (
      typeof data.email !== 'string' ||
      !Number.isFinite(data.expires) ||
      data.expires <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';

  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;

    const key = part.slice(0, index).trim();

    if (key === name) {
      return part.slice(index + 1).trim();
    }
  }

  return null;
}

function getSession(req) {
  return verifySessionToken(getCookie(req, COOKIE_NAME));
}

function isAuthenticated(req) {
  return Boolean(getSession(req));
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        error: 'Please log in to continue.',
        loginRequired: true
      });
    }

    return res.redirect('/login');
  }

  next();
}

function sendLoginPage(res) {
  return res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
}

/* ---------- Login and logout ---------- */

// The login page is public.
app.get('/login', (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect('/app.html');
  }

  return sendLoginPage(res);
});

// Login API.
app.post('/api/login', (req, res) => {
  const email = str(req.body && req.body.email, 160).toLowerCase();
  const password = String((req.body && req.body.password) ?? '');

  const emailBuffer = Buffer.from(email);
  const expectedEmailBuffer = Buffer.from(LOGIN_EMAIL);
  const passwordBuffer = Buffer.from(password);
  const expectedPasswordBuffer = Buffer.from(LOGIN_PASSWORD);

  const emailMatches =
    emailBuffer.length === expectedEmailBuffer.length &&
    crypto.timingSafeEqual(emailBuffer, expectedEmailBuffer);

  const passwordMatches =
    passwordBuffer.length === expectedPasswordBuffer.length &&
    crypto.timingSafeEqual(passwordBuffer, expectedPasswordBuffer);

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  const token = createSessionToken(email);

  res.setHeader('Cache-Control', 'no-store');

  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${SESSION_DURATION}`,
    ...(IS_PRODUCTION ? ['Secure'] : [])
  ].join('; '));

  return res.json({
    success: true,
    message: 'Login successful.',
    redirect: '/app.html'
  });
});

// Check whether the current browser has a valid session.
app.get('/api/auth/status', (req, res) => {
  const session = getSession(req);

  res.setHeader('Cache-Control', 'no-store');

  res.json({
    authenticated: Boolean(session),
    email: session ? session.email : null
  });
});

// Logout.
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
    ...(IS_PRODUCTION ? ['Secure'] : [])
  ].join('; '));

  res.json({
    success: true,
    redirect: '/login'
  });
});

/* ---------- Website access control ---------- */

// Visitors must log in before opening the main website.
app.get('/', (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect('/login');
  }

  return res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

// Protect the main application page even if someone types its URL.
app.get('/app.html', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

// Protect the dashboard alias.
app.get('/dashboard', requireAuth, (req, res) => {
  res.redirect('/app.html');
});

// Block direct access to private HTML files.
app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    req.path.endsWith('.html') &&
    !['/login.html', '/404.html'].includes(req.path)
  ) {
    return requireAuth(req, res, next);
  }

  next();
});

// Every application API below this point requires login.
app.use('/api', requireAuth);

/* ---------- Application API ---------- */

app.get('/api/bootstrap', (req, res) => {
  const db = load();

  res.json({
    trips: db.trips,
    destinations: DESTINATIONS,
    rates: RATES,
    categories: CATEGORIES
  });
});

app.post('/api/trips', (req, res) => {
  const db = load();
  const b = req.body || {};
  const dest = DESTINATIONS.find((d) => d.id === b.destId);
  const name = str(b.name);
  const budget = num(b.budget);

  if (!name) return bad(res, 'Trip name is required');
  if (!b.start || !b.end || b.end < b.start) {
    return bad(res, 'Please choose valid dates');
  }
  if (!(budget >= 0)) return bad(res, 'Budget must be a number');

  const trip = {
    id: uid(),
    name,
    destId: dest ? dest.id : 'custom',
    destination: dest
      ? `${dest.name}, ${dest.country}`
      : str(b.destination) || 'Custom destination',
    image: dest ? dest.image : (str(b.image, 400) || DESTINATIONS[0].image),
    start: b.start,
    end: b.end,
    travelers: Math.max(1, Math.round(num(b.travelers)) || 1),
    budget,
    currency: RATES[b.currency] ? b.currency : 'USD',
    itinerary: [],
    expenses: [],
    packing: DEFAULT_PACKING.map((text) => ({
      id: uid(),
      text,
      done: false
    }))
  };

  db.trips.unshift(trip);
  save(db);

  res.status(201).json(trip);
});

app.put('/api/trips/:id', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  const b = req.body || {};

  if (b.name !== undefined) t.name = str(b.name) || t.name;
  if (b.budget !== undefined && num(b.budget) >= 0) {
    t.budget = num(b.budget);
  }
  if (b.start) t.start = b.start;
  if (b.end) t.end = b.end;
  if (b.travelers) {
    t.travelers = Math.max(1, Math.round(num(b.travelers)) || t.travelers);
  }

  save(db);
  res.json(t);
});

app.delete('/api/trips/:id', (req, res) => {
  const db = load();
  const i = db.trips.findIndex((t) => t.id === req.params.id);

  if (i < 0) return bad(res, 'Trip not found', 404);

  db.trips.splice(i, 1);
  save(db);

  res.json({ ok: true });
});

app.post('/api/trips/:id/expenses', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  const b = req.body || {};
  const amount = num(b.amount);

  if (!str(b.title)) return bad(res, 'Give the expense a title');
  if (!(amount > 0)) return bad(res, 'Amount must be greater than 0');

  const e = {
    id: uid(),
    title: str(b.title),
    category: CATEGORIES.includes(b.category) ? b.category : 'Other',
    amount,
    date: b.date || dayOffset(0)
  };

  t.expenses.unshift(e);
  save(db);

  res.status(201).json(t);
});

app.delete('/api/trips/:id/expenses/:eid', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  t.expenses = t.expenses.filter((e) => e.id !== req.params.eid);

  save(db);
  res.json(t);
});

app.post('/api/trips/:id/itinerary', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  const b = req.body || {};

  if (!str(b.title)) return bad(res, 'Activity title is required');

  t.itinerary.push({
    id: uid(),
    day: Math.max(1, Math.round(num(b.day)) || 1),
    time: str(b.time, 5) || '09:00',
    title: str(b.title),
    note: str(b.note, 240)
  });

  t.itinerary.sort((a, c) =>
    a.day - c.day || a.time.localeCompare(c.time)
  );

  save(db);
  res.status(201).json(t);
});

app.delete('/api/trips/:id/itinerary/:iid', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  t.itinerary = t.itinerary.filter((i) => i.id !== req.params.iid);

  save(db);
  res.json(t);
});

app.post('/api/trips/:id/packing', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);
  if (!str(req.body && req.body.text)) {
    return bad(res, 'Item text is required');
  }

  t.packing.push({
    id: uid(),
    text: str(req.body.text),
    done: false
  });

  save(db);
  res.status(201).json(t);
});

app.patch('/api/trips/:id/packing/:pid', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  const p = t.packing.find((x) => x.id === req.params.pid);

  if (!p) return bad(res, 'Item not found', 404);

  p.done = !!(req.body && req.body.done);

  save(db);
  res.json(t);
});

app.delete('/api/trips/:id/packing/:pid', (req, res) => {
  const db = load();
  const t = findTrip(db, req.params.id);

  if (!t) return bad(res, 'Trip not found', 404);

  t.packing = t.packing.filter((x) => x.id !== req.params.pid);

  save(db);
  res.json(t);
});

/* ---------- Smart budget estimator ---------- */

app.post('/api/estimate', (req, res) => {
  const b = req.body || {};
  const dest = DESTINATIONS.find((d) => d.id === b.destId);

  if (!dest) return bad(res, 'Pick a destination');

  const days = Math.min(60, Math.max(1, Math.round(num(b.days)) || 0));
  const travelers = Math.min(20, Math.max(1, Math.round(num(b.travelers)) || 1));

  const calc = (style) => {
    const daily = dest.daily[style];
    const flightMult = { budget: 0.85, mid: 1, luxury: 2.1 }[style];

    const split = {
      Stay: 0.4,
      Food: 0.25,
      Transport: 0.12,
      Activities: 0.18,
      Other: 0.05
    };

    const breakdown = {
      Flights: Math.round(dest.flight * flightMult * travelers)
    };

    Object.entries(split).forEach(([k, v]) => {
      breakdown[k] = Math.round(daily * v * days * travelers);
    });

    const total = Object.values(breakdown).reduce((a, c) => a + c, 0);

    return {
      breakdown,
      total,
      perPerson: Math.round(total / travelers),
      perDay: Math.round(total / days)
    };
  };

  const style = ['budget', 'mid', 'luxury'].includes(b.style) ? b.style : 'mid';

  const all = {
    budget: calc('budget'),
    mid: calc('mid'),
    luxury: calc('luxury')
  };

  const tips = [];

  if (dest.tags.includes('beach')) {
    tips.push('Book beachfront stays 2–3 months ahead for the best rates.');
  }

  if (days >= 7) {
    tips.push('Weekly stays often unlock 10–20% discounts on rentals.');
  }

  if (travelers >= 3) {
    tips.push('Split costs on villas and private transfers to save per person.');
  }

  tips.push(`Best time to go: ${dest.best}. Shoulder months are usually cheaper.`);
  tips.push('Set aside ~10% of your budget as a buffer for surprises.');

  res.json({
    destination: dest,
    days,
    travelers,
    style,
    currency: 'USD',
    ...all[style],
    compare: {
      budget: all.budget.total,
      mid: all.mid.total,
      luxury: all.luxury.total
    },
    tips
  });
});

/* ---------- Currency converter ---------- */

app.get('/api/convert', (req, res) => {
  const amount = num(req.query.amount);
  const from = String(req.query.from || 'USD').toUpperCase();
  const to = String(req.query.to || 'USD').toUpperCase();

  if (!(amount >= 0) || !RATES[from] || !RATES[to]) {
    return bad(res, 'Invalid conversion request');
  }

  res.json({
    amount,
    from,
    to,
    result: convert(amount, from, to),
    rate: convert(1, from, to)
  });
});

/* ---------- Expense summary ---------- */

app.get('/api/summary', (req, res) => {
  const db = load();
  const cur = RATES[req.query.currency] ? req.query.currency : 'USD';

  let totalBudget = 0;
  let totalSpent = 0;

  const byCat = {};
  const recent = [];

  const trips = db.trips.map((t) => {
    const spent = t.expenses.reduce((a, e) => a + e.amount, 0);
    const b = convert(t.budget, t.currency, cur);
    const s = convert(spent, t.currency, cur);

    totalBudget += b;
    totalSpent += s;

    t.expenses.forEach((e) => {
      const v = convert(e.amount, t.currency, cur);

      byCat[e.category] = (byCat[e.category] || 0) + v;

      recent.push({
        ...e,
        amount: v,
        trip: t.name,
        tripId: t.id
      });
    });

    return {
      id: t.id,
      name: t.name,
      budget: b,
      spent: s
    };
  });

  recent.sort((a, c) => String(c.date).localeCompare(String(a.date)));

  res.json({
    currency: cur,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    tripCount: db.trips.length,
    byCategory: Object.entries(byCat)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, c) => c.amount - a.amount),
    trips,
    recent: recent.slice(0, 6)
  });
});

/* ---------- Public website endpoints ---------- */

// These remain behind login because the application API
// authentication middleware is above this section.

app.get('/api/destinations', (req, res) => {
  res.json(DESTINATIONS);
});

app.get('/api/destinations/:id', (req, res) => {
  const d = DESTINATIONS.find((x) => x.id === req.params.id);

  if (!d) return bad(res, 'Destination not found', 404);

  const related = DESTINATIONS
    .filter((x) => x.id !== d.id && x.tags.some((t) => d.tags.includes(t)))
    .slice(0, 3);

  res.json({ ...d, related });
});

app.post('/api/subscribe', (req, res) => {
  const email = str(req.body && req.body.email, 160).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad(res, 'Please enter a valid email address');
  }

  const db = load();

  db.subscribers = db.subscribers || [];

  if (!db.subscribers.some((s) => s.email === email)) {
    db.subscribers.push({
      email,
      at: new Date().toISOString()
    });
  }

  save(db);

  res.status(201).json({ ok: true });
});

/* ---------- 404 and static files ---------- */

// Only serve the public directory after access-control routes.
// The login page must exist at public/login.html.
app.use(express.static(PUBLIC_DIR, {
  index: false,
  dotfiles: 'deny'
}));

app.use('/api', (req, res) => bad(res, 'Not found', 404));

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('Page not found');
    }
  });
});

/* ---------- Start server ---------- */

app.listen(PORT, () => {
  console.log(`Wanderly running → http://localhost:${PORT}`);
});
