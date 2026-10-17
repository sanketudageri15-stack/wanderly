


require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET;

const LOGIN_EMAIL = IS_PRODUCTION
  ? String(process.env.LOGIN_EMAIL || '').trim().toLowerCase()
  : 'mayur@gmail.com';

const LOGIN_PASSWORD = IS_PRODUCTION
  ? String(process.env.LOGIN_PASSWORD || '')
  : 'mayur@123';

const COOKIE_NAME = 'wanderly_session';
const SESSION_DURATION = 24 * 60 * 60;

if (IS_PRODUCTION && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
  throw new Error('Set SESSION_SECRET to a random secret of at least 32 characters.');
}

if (IS_PRODUCTION && (!LOGIN_EMAIL || !LOGIN_PASSWORD)) {
  throw new Error('Set LOGIN_EMAIL and LOGIN_PASSWORD in the deployment environment.');
}

const SIGNING_SECRET = SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

/* ---------------- HOMEPAGE ---------------- */

const HOME_CANDIDATES = ['index.html', 'home.html', 'site.html'];

function getPublicHomePath() {
  for (const filename of HOME_CANDIDATES) {
    const filePath = path.join(PUBLIC_DIR, filename);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}

function sendPublicHome(res) {
  const homePath = getPublicHomePath();

  res.setHeader('Cache-Control', 'no-store');

  if (homePath) {
    return res.sendFile(homePath);
  }

  return res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Wanderly</title>
      </head>
      <body style="font-family:Arial,sans-serif;padding:40px">
        <h1>Wanderly</h1>
        <p>Your login was successful, but the public homepage HTML file
        was not found.</p>
        <p>Place your public homepage in the public folder as
        index.html, home.html, or site.html.</p>
        <a href="/app.html">Open travel dashboard</a>
      </body>
    </html>
  `);
}

/* ---------------- DESTINATIONS ---------------- */

const image = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

const DESTINATIONS = [
  {
    id: 'bali', name: 'Bali', country: 'Indonesia',
    image: image('photo-1537996194471-e657df975ab4'),
    tags: ['beach', 'culture', 'nature'],
    daily: { budget: 40, mid: 90, luxury: 250 },
    flight: 650, best: 'Apr – Oct', currency: 'IDR', rating: 4.8,
    blurb: 'Rice terraces, surf breaks and temple sunsets.'
  },
  {
    id: 'paris', name: 'Paris', country: 'France',
    image: image('photo-1502602898657-3e91760cbb34'),
    tags: ['city', 'culture', 'luxury'],
    daily: { budget: 110, mid: 220, luxury: 550 },
    flight: 800, best: 'Apr – Jun, Sep – Oct', currency: 'EUR', rating: 4.7,
    blurb: 'Cafés, museums and walks along the Seine.'
  },
  {
    id: 'tokyo', name: 'Tokyo', country: 'Japan',
    image: image('photo-1540959733332-eab4deabeeaf'),
    tags: ['city', 'culture', 'adventure'],
    daily: { budget: 90, mid: 180, luxury: 450 },
    flight: 700, best: 'Mar – May, Oct – Nov', currency: 'JPY', rating: 4.9,
    blurb: 'Neon streets, incredible food and quiet shrines.'
  },
  {
    id: 'santorini', name: 'Santorini', country: 'Greece',
    image: image('photo-1570077188670-e3a8d69ac5ff'),
    tags: ['beach', 'luxury', 'culture'],
    daily: { budget: 100, mid: 210, luxury: 520 },
    flight: 850, best: 'May – Oct', currency: 'EUR', rating: 4.8,
    blurb: 'Whitewashed cliffs and caldera sunsets.'
  },
  {
    id: 'dubai', name: 'Dubai', country: 'UAE',
    image: image('photo-1512453979798-5ea266f8880c'),
    tags: ['city', 'luxury', 'adventure'],
    daily: { budget: 100, mid: 210, luxury: 600 },
    flight: 400, best: 'Nov – Mar', currency: 'AED', rating: 4.6,
    blurb: 'A spectacular skyline and desert adventures.'
  },
  {
    id: 'newyork', name: 'New York', country: 'USA',
    image: image('photo-1496442226666-8d4d0e62e6e9'),
    tags: ['city', 'culture'],
    daily: { budget: 150, mid: 300, luxury: 700 },
    flight: 1000, best: 'Apr – Jun, Sep – Nov', currency: 'USD', rating: 4.6,
    blurb: 'Broadway, Central Park and famous city streets.'
  },
  {
    id: 'maldives', name: 'Maldives', country: 'Maldives',
    image: image('photo-1514282401047-d79a71a590e8'),
    tags: ['beach', 'luxury', 'nature'],
    daily: { budget: 130, mid: 300, luxury: 900 },
    flight: 600, best: 'Nov – Apr', currency: 'USD', rating: 4.9,
    blurb: 'Overwater villas and beautiful lagoons.'
  },
  {
    id: 'switzerland', name: 'Swiss Alps', country: 'Switzerland',
    image: image('photo-1530122037265-a5f1f91d3b99'),
    tags: ['nature', 'adventure', 'luxury'],
    daily: { budget: 150, mid: 290, luxury: 650 },
    flight: 900, best: 'Jun – Sep, Dec – Mar', currency: 'CHF', rating: 4.8,
    blurb: 'Alpine lakes, mountain views and scenic trains.'
  },
  {
    id: 'goa', name: 'Goa', country: 'India',
    image: image('photo-1512343879784-a960bf40e7f2'),
    tags: ['beach', 'culture'],
    daily: { budget: 25, mid: 55, luxury: 160 },
    flight: 120, best: 'Nov – Feb', currency: 'INR', rating: 4.5,
    blurb: 'Sunny beaches and Portuguese heritage.'
  },
  {
    id: 'jaipur', name: 'Jaipur', country: 'India',
    image: image('photo-1477587458883-47145ed94245'),
    tags: ['culture', 'city'],
    daily: { budget: 22, mid: 50, luxury: 150 },
    flight: 90, best: 'Oct – Mar', currency: 'INR', rating: 4.6,
    blurb: 'Historic forts, palaces and bustling bazaars.'
  }
];

const RATES = {
  USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 150,
  AED: 3.67, THB: 35.8, IDR: 15600, CHF: 0.88, AUD: 1.52, SGD: 1.34
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

/* ---------------- DATA STORE ---------------- */

const uid = () => crypto.randomBytes(5).toString('hex');

const dayOffset = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function seed() {
  const destination = (id) => DESTINATIONS.find((item) => item.id === id);

  const packing = (completed = 0) =>
    DEFAULT_PACKING.map((text, index) => ({
      id: uid(),
      text,
      done: index < completed
    }));

  return {
    trips: [
      {
        id: uid(), name: 'Bali Reset', destId: 'bali',
        destination: 'Bali, Indonesia', image: destination('bali').image,
        start: dayOffset(21), end: dayOffset(28), travelers: 2,
        budget: 3200, currency: 'USD',
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
        packing: packing(3)
      },
      {
        id: uid(), name: 'Tokyo Food Trail', destId: 'tokyo',
        destination: 'Tokyo, Japan', image: destination('tokyo').image,
        start: dayOffset(70), end: dayOffset(77), travelers: 1,
        budget: 2400, currency: 'USD',
        itinerary: [
          { id: uid(), day: 1, time: '09:00', title: 'Tsukiji outer market breakfast', note: '' },
          { id: uid(), day: 2, time: '14:00', title: 'Shibuya & Harajuku', note: '' }
        ],
        expenses: [
          { id: uid(), title: 'Flights', category: 'Flights', amount: 720, date: dayOffset(-3) }
        ],
        packing: packing(1)
      },
      {
        id: uid(), name: 'Goa Long Weekend', destId: 'goa',
        destination: 'Goa, India', image: destination('goa').image,
        start: dayOffset(-40), end: dayOffset(-36), travelers: 4,
        budget: 60000, currency: 'INR',
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
        packing: packing(8)
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

function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const convert = (amount, from, to) =>
  (amount / (RATES[from] || 1)) * (RATES[to] || 1);

const bad = (res, message, status = 400) =>
  res.status(status).json({ error: message });

const num = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : NaN;

const str = (value, max = 120) =>
  String(value ?? '').trim().slice(0, max);

const findTrip = (db, id) => db.trips.find((trip) => trip.id === id);

/* ---------------- AUTHENTICATION ---------------- */

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

  const supplied = Buffer.from(signature, 'base64url');

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());

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
  const cookies = String(req.headers.cookie || '').split(';');

  for (const item of cookies) {
    const index = item.indexOf('=');
    if (index < 0) continue;

    if (item.slice(0, index).trim() === name) {
      return item.slice(index + 1).trim();
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
  if (isAuthenticated(req)) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'Please log in to continue.',
      loginRequired: true
    });
  }

  return res.redirect('/login');
}

function sendLoginPage(res) {
  const loginPath = path.join(PUBLIC_DIR, 'login.html');

  res.setHeader('Cache-Control', 'no-store');

  if (!fs.existsSync(loginPath)) {
    return res.status(500).send(
      'Login page not found. Make sure public/login.html exists.'
    );
  }

  return res.sendFile(loginPath);
}

/* ---------------- LOGIN ROUTES ---------------- */

// FIX: Always show the login page, even if a session already exists.
app.get('/login', (req, res) => {
  return sendLoginPage(res);
});

app.post('/api/login', (req, res) => {
  const body = req.body || {};

  const email = String(
    body.email ?? body.username ?? body.login ?? body.userEmail ?? ''
  ).trim().toLowerCase();

  const password = String(
    body.password ??
    body.pass ??
    body.pwd ??
    body.loginPassword ??
    body.userPassword ??
    ''
  );

  if (email !== LOGIN_EMAIL || password !== LOGIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect email or password.'
    });
  }

  const token = createSessionToken(LOGIN_EMAIL);

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
    redirect: '/'
  });
});

app.get('/api/auth/status', (req, res) => {
  const session = getSession(req);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    authenticated: Boolean(session),
    email: session ? session.email : null
  });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
    ...(IS_PRODUCTION ? ['Secure'] : [])
  ].join('; '));

  res.json({ success: true, redirect: '/login' });
});

/* ---------------- PAGE ACCESS ---------------- */

// Visitors must log in before accessing the public homepage.
app.get('/', (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect('/login');
  }

  return sendPublicHome(res);
});

app.get('/app.html', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  return res.redirect('/app.html');
});

/* ---------------- PUBLIC APIs ---------------- */

app.get('/api/destinations', (req, res) => {
  res.json(DESTINATIONS);
});

app.get('/api/destinations/:id', (req, res) => {
  const destination = DESTINATIONS.find((item) => item.id === req.params.id);

  if (!destination) return bad(res, 'Destination not found', 404);

  const related = DESTINATIONS
    .filter((item) =>
      item.id !== destination.id &&
      item.tags.some((tag) => destination.tags.includes(tag))
    )
    .slice(0, 3);

  res.json({ ...destination, related });
});

app.post('/api/subscribe', (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return bad(res, 'Please enter a valid email address.');
  }

  const db = load();
  db.subscribers = db.subscribers || [];

  if (!db.subscribers.some((item) => item.email === email)) {
    db.subscribers.push({ email, at: new Date().toISOString() });
  }

  save(db);
  res.status(201).json({ success: true });
});

/* ---------------- PRIVATE APIs ---------------- */

app.use('/api', requireAuth);

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
  const body = req.body || {};
  const destination = DESTINATIONS.find((item) => item.id === body.destId);
  const name = str(body.name);
  const budget = num(body.budget);

  if (!name) return bad(res, 'Trip name is required.');
  if (!body.start || !body.end || body.end < body.start) {
    return bad(res, 'Please choose valid dates.');
  }
  if (!(budget >= 0)) return bad(res, 'Budget must be a valid number.');

  const trip = {
    id: uid(),
    name,
    destId: destination ? destination.id : 'custom',
    destination: destination
      ? `${destination.name}, ${destination.country}`
      : str(body.destination) || 'Custom destination',
    image: destination
      ? destination.image
      : str(body.image, 400) || DESTINATIONS[0].image,
    start: body.start,
    end: body.end,
    travelers: Math.max(1, Math.round(num(body.travelers)) || 1),
    budget,
    currency: RATES[body.currency] ? body.currency : 'USD',
    itinerary: [],
    expenses: [],
    packing: DEFAULT_PACKING.map((text) => ({
      id: uid(), text, done: false
    }))
  };

  db.trips.unshift(trip);
  save(db);
  res.status(201).json(trip);
});

app.put('/api/trips/:id', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  const body = req.body || {};

  if (body.name !== undefined) trip.name = str(body.name) || trip.name;
  if (body.budget !== undefined && num(body.budget) >= 0) trip.budget = num(body.budget);
  if (body.start) trip.start = body.start;
  if (body.end) trip.end = body.end;

  if (body.travelers !== undefined) {
    trip.travelers = Math.max(1, Math.round(num(body.travelers)) || 1);
  }

  save(db);
  res.json(trip);
});

app.delete('/api/trips/:id', (req, res) => {
  const db = load();
  const index = db.trips.findIndex((trip) => trip.id === req.params.id);

  if (index < 0) return bad(res, 'Trip not found.', 404);

  db.trips.splice(index, 1);
  save(db);
  res.json({ success: true });
});

app.post('/api/trips/:id/expenses', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  const body = req.body || {};
  const amount = num(body.amount);

  if (!str(body.title)) return bad(res, 'Expense title is required.');
  if (!(amount > 0)) return bad(res, 'Amount must be greater than zero.');

  trip.expenses.unshift({
    id: uid(),
    title: str(body.title),
    category: CATEGORIES.includes(body.category) ? body.category : 'Other',
    amount,
    date: body.date || dayOffset(0)
  });

  save(db);
  res.status(201).json(trip);
});

app.delete('/api/trips/:id/expenses/:eid', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  trip.expenses = trip.expenses.filter((item) => item.id !== req.params.eid);
  save(db);
  res.json(trip);
});

app.post('/api/trips/:id/itinerary', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  const body = req.body || {};
  if (!str(body.title)) return bad(res, 'Activity title is required.');

  trip.itinerary.push({
    id: uid(),
    day: Math.max(1, Math.round(num(body.day)) || 1),
    time: str(body.time, 5) || '09:00',
    title: str(body.title),
    note: str(body.note, 240)
  });

  trip.itinerary.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  save(db);
  res.status(201).json(trip);
});

app.delete('/api/trips/:id/itinerary/:iid', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  trip.itinerary = trip.itinerary.filter((item) => item.id !== req.params.iid);
  save(db);
  res.json(trip);
});

app.post('/api/trips/:id/packing', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);
  if (!str(req.body?.text)) return bad(res, 'Packing item text is required.');

  trip.packing.push({
    id: uid(),
    text: str(req.body.text),
    done: false
  });

  save(db);
  res.status(201).json(trip);
});

app.patch('/api/trips/:id/packing/:pid', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  const item = trip.packing.find((entry) => entry.id === req.params.pid);
  if (!item) return bad(res, 'Packing item not found.', 404);

  item.done = Boolean(req.body?.done);
  save(db);
  res.json(trip);
});

app.delete('/api/trips/:id/packing/:pid', (req, res) => {
  const db = load();
  const trip = findTrip(db, req.params.id);

  if (!trip) return bad(res, 'Trip not found.', 404);

  trip.packing = trip.packing.filter((item) => item.id !== req.params.pid);
  save(db);
  res.json(trip);
});

/* ---------------- BUDGET ESTIMATOR ---------------- */

app.post('/api/estimate', (req, res) => {
  const body = req.body || {};
  const destination = DESTINATIONS.find((item) => item.id === body.destId);

  if (!destination) return bad(res, 'Choose a destination.');

  const days = Math.min(60, Math.max(1, Math.round(num(body.days)) || 1));
  const travelers = Math.min(20, Math.max(1, Math.round(num(body.travelers)) || 1));

  const calculate = (style) => {
    const daily = destination.daily[style];
    const flightMultiplier = { budget: 0.85, mid: 1, luxury: 2.1 }[style];

    const split = {
      Stay: 0.4,
      Food: 0.25,
      Transport: 0.12,
      Activities: 0.18,
      Other: 0.05
    };

    const breakdown = {
      Flights: Math.round(destination.flight * flightMultiplier * travelers)
    };

    for (const [category, percentage] of Object.entries(split)) {
      breakdown[category] = Math.round(daily * percentage * days * travelers);
    }

    const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

    return {
      breakdown,
      total,
      perPerson: Math.round(total / travelers),
      perDay: Math.round(total / days)
    };
  };

  const style = ['budget', 'mid', 'luxury'].includes(body.style) ? body.style : 'mid';

  const all = {
    budget: calculate('budget'),
    mid: calculate('mid'),
    luxury: calculate('luxury')
  };

  const tips = [];

  if (destination.tags.includes('beach')) {
    tips.push('Book beachfront stays early for better prices.');
  }

  if (days >= 7) tips.push('Weekly stays may offer discounts.');

  if (travelers >= 3) {
    tips.push('Sharing accommodation and transfers can lower per-person costs.');
  }

  tips.push(`Best time to visit: ${destination.best}.`);
  tips.push('Keep around 10% of your budget for unexpected costs.');

  res.json({
    destination,
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

/* ---------------- CURRENCY CONVERTER ---------------- */

app.get('/api/convert', (req, res) => {
  const amount = num(req.query.amount);
  const from = String(req.query.from || 'USD').toUpperCase();
  const to = String(req.query.to || 'USD').toUpperCase();

  if (!(amount >= 0) || !RATES[from] || !RATES[to]) {
    return bad(res, 'Invalid currency conversion request.');
  }

  res.json({
    amount,
    from,
    to,
    result: convert(amount, from, to),
    rate: convert(1, from, to)
  });
});

/* ---------------- EXPENSE SUMMARY ---------------- */

app.get('/api/summary', (req, res) => {
  const db = load();
  const currency = RATES[req.query.currency] ? req.query.currency : 'USD';

  let totalBudget = 0;
  let totalSpent = 0;

  const byCategory = {};
  const recent = [];

  const trips = db.trips.map((trip) => {
    const spent = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const budgetConverted = convert(trip.budget, trip.currency, currency);
    const spentConverted = convert(spent, trip.currency, currency);

    totalBudget += budgetConverted;
    totalSpent += spentConverted;

    trip.expenses.forEach((expense) => {
      const amount = convert(expense.amount, trip.currency, currency);

      byCategory[expense.category] =
        (byCategory[expense.category] || 0) + amount;

      recent.push({
        ...expense,
        amount,
        trip: trip.name,
        tripId: trip.id
      });
    });

    return {
      id: trip.id,
      name: trip.name,
      budget: budgetConverted,
      spent: spentConverted
    };
  });

  recent.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  res.json({
    currency,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    tripCount: db.trips.length,
    byCategory: Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    trips,
    recent: recent.slice(0, 6)
  });
});

/* ---------------- STATIC FILES AND ERRORS ---------------- */

// Static middleware comes after explicit page routes so it cannot
// override the login and homepage routing.
app.use(express.static(PUBLIC_DIR, {
  index: false,
  dotfiles: 'deny'
}));

app.use('/api', (req, res) => {
  return bad(res, 'API endpoint not found.', 404);
});

app.use((req, res) => {
  const notFoundPath = path.join(PUBLIC_DIR, '404.html');

  if (fs.existsSync(notFoundPath)) {
    return res.status(404).sendFile(notFoundPath);
  }

  return res.status(404).send('Page not found.');
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`Wanderly running → http://localhost:${PORT}`);
  console.log(`Login email configured: ${LOGIN_EMAIL}`);
});
