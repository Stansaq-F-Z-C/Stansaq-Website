require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust exactly one hop of reverse proxy (nginx on a VPS, or the platform's
// edge proxy on Render/Railway/etc). Without this, req.ip resolves to the
// proxy's own address for every request — which breaks the per-IP login
// rate limiter by collapsing all visitors into a single shared bucket.
app.set('trust proxy', 1);

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set in .env — using an insecure default. Set it before deploying.');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY_HTTPS === 'true',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
}));

// Health check for platforms (Render, Railway, etc.) that poll this before
// routing traffic to a new deploy. Deliberately does not touch Supabase —
// this should answer instantly even if the database is briefly unreachable.
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

// Public, read-only API used by the static frontend pages.
app.use('/api', apiRoutes);

// Admin login/session/CRUD API (auth enforced inside routes/admin.js for /admin/api/*).
app.use('/admin', adminRoutes);

// Gate the dashboard page itself — must come before the static admin folder is served.
app.get('/admin/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Public site + uploaded images.
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

app.listen(PORT, () => {
  console.log(`Stansaq site running on http://localhost:${PORT}`);
});
