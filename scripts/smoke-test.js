require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const apiRoutes = require('../routes/api');
const adminRoutes = require('../routes/admin');
const { requireAuth } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.get('/admin/dashboard.html', requireAuth, (req, res) => res.send('DASHBOARD_OK'));
app.use(express.static(path.join(__dirname, '..', 'public')));

async function main() {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  let cookie = '';

  function log(label, val) { console.log('---', label, '---\n', val); }

  // 1. Public API before login
  let r = await fetch(`${base}/api/partners`);
  let partners = await r.json();
  log('1. public partners count', partners.length);

  // 2. Dashboard blocked when logged out
  r = await fetch(`${base}/admin/dashboard.html`, { redirect: 'manual' });
  log('2. dashboard status when logged out', r.status);

  // 3. Wrong password
  r = await fetch(`${base}/admin/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrong' })
  });
  log('3. wrong password status', r.status);

  // 4. Correct login
  r = await fetch(`${base}/admin/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })
  });
  cookie = r.headers.get('set-cookie').split(';')[0];
  log('4. correct login status', r.status);

  // 5. Session check
  r = await fetch(`${base}/admin/api/session`, { headers: { Cookie: cookie } });
  log('5. session', await r.json());

  // 6. Dashboard now accessible
  r = await fetch(`${base}/admin/dashboard.html`, { headers: { Cookie: cookie } });
  log('6. dashboard status when logged in', r.status);

  // 7. Create a partner via multipart form (no file)
  const fd = new FormData();
  fd.append('name', 'Test Polymer Co');
  fd.append('tagline', 'Smoke test entry');
  fd.append('description', 'Created via smoke test.');
  fd.append('applications', 'Line one\nLine two');
  r = await fetch(`${base}/admin/api/partners`, { method: 'POST', headers: { Cookie: cookie }, body: fd });
  const created = await r.json();
  log('7. create partner', created);

  // 8. Public API reflects new partner immediately
  r = await fetch(`${base}/api/partners`);
  partners = await r.json();
  log('8. public partners after create', partners.map(p => p.name));

  // 9. Create a product linked to that partner
  const fd2 = new FormData();
  fd2.append('name', 'Test Product');
  fd2.append('description', 'A product for the smoke test.');
  fd2.append('partner_id', String(created.id));
  r = await fetch(`${base}/admin/api/products`, { method: 'POST', headers: { Cookie: cookie }, body: fd2 });
  const createdProduct = await r.json();
  log('9. create product', createdProduct);

  r = await fetch(`${base}/api/products?partner_id=${created.id}`);
  log('10. products for that partner', await r.json());

  // 11. Delete the test partner and product to leave the DB clean
  await fetch(`${base}/admin/api/products/${createdProduct.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
  await fetch(`${base}/admin/api/partners/${created.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
  r = await fetch(`${base}/api/partners`);
  log('12. partners after cleanup', (await r.json()).map(p => p.name));

  // 13. Logout, confirm dashboard blocked again
  r = await fetch(`${base}/admin/api/logout`, { method: 'POST', headers: { Cookie: cookie } });
  log('13. logout status', r.status);
  r = await fetch(`${base}/admin/dashboard.html`, { headers: { Cookie: cookie }, redirect: 'manual' });
  log('14. dashboard status after logout', r.status);

  server.close();
  console.log('\nSMOKE TEST COMPLETE');
}

main().catch((err) => { console.error('SMOKE TEST FAILED', err); process.exitCode = 1; });
