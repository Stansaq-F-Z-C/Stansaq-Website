require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_LIVE = process.env.TRUST_PROXY_HTTPS === 'true';

// Trust exactly one hop of reverse proxy (nginx on a VPS, or the platform's
// edge proxy on Render/Railway/etc). Without this, req.ip resolves to the
// proxy's own address for every request — which breaks the per-IP login
// rate limiter by collapsing all visitors into a single shared bucket.
app.set('trust proxy', 1);

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set in .env — using an insecure default. Set it before deploying.');
}

// ---------------------------------------------------------------------------
// Security headers.
// script-src is intentionally strict ('self' only, no unsafe-inline) — every
// page's JS lives in an external file for exactly this reason. style-src
// allows 'unsafe-inline' because the site uses inline style="" attributes
// extensively; that's a real, deliberate trade-off, not an oversight — inline
// CSS can't exfiltrate data or run arbitrary code the way inline JS can, so
// the risk this leaves open is much smaller than a blanket unsafe-inline on
// scripts would be.
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*.supabase.co'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  // Only tell browsers to force HTTPS once HTTPS is actually live — enabling
  // this before then can lock you out of the site during initial setup.
  hsts: HTTPS_LIVE ? undefined : false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // 'strict' rather than 'lax': nothing in this app needs the session
    // cookie sent on cross-site navigation, so there's no reason to accept
    // that risk. This alone blocks most CSRF vectors in modern browsers.
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' && HTTPS_LIVE,
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
}));

// Defense-in-depth CSRF check, on top of SameSite=strict: reject
// state-changing admin requests whose Origin doesn't match this host.
// SameSite=strict already blocks the common case; this catches
// misconfigurations and older browsers that don't enforce it.
app.use('/admin/api', (req, res, next) => {
  const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!stateChanging) return next();
  const origin = req.get('origin') || req.get('referer');
  if (!origin) return next(); // some legitimate same-origin requests omit both; rely on SameSite here
  try {
    const originHost = new URL(origin).host;
    if (originHost !== req.get('host')) {
      return res.status(403).json({ error: 'Cross-origin request blocked.' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid origin.' });
  }
  next();
});

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
