const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const supabase = require('../db/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const STORAGE_BUCKET = 'uploads';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' }
});

// Files are held in memory only long enough to hand the buffer to Supabase Storage —
// nothing is written to this server's disk.
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new Error('Unsupported image type'));
    cb(null, true);
  }
});

async function uploadToStorage(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomBytes(10).toString('hex')}${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new Error('Storage upload failed: ' + error.message);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function removeFromStorage(url) {
  if (!url) return;
  const filename = url.split('/').pop();
  if (!filename) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([filename]); // best-effort
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
router.post('/api/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error) throw error;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.adminId = user.id;
    req.session.username = user.username;
    res.json({ ok: true, username: user.username });
  } catch (err) { next(err); }
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/api/session', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.json({ authenticated: false });
});

// Everything below requires a logged-in admin.
router.use('/api', requireAuth);

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------
router.get('/api/partners', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('partners').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/api/partners', upload.single('logo'), async (req, res, next) => {
  try {
    const { name, tagline, description, applications } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data: maxRow } = await supabase
      .from('partners').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;

    const logoUrl = await uploadToStorage(req.file);

    const { data, error } = await supabase.from('partners').insert({
      name, tagline: tagline || '', description: description || '',
      applications: applications || '', logo_path: logoUrl, sort_order: nextOrder
    }).select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (err) { next(err); }
});

router.put('/api/partners/:id', upload.single('logo'), async (req, res, next) => {
  try {
    const { name, tagline, description, applications } = req.body;
    const { data: existing, error: fetchErr } = await supabase
      .from('partners').select('*').eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let logoUrl = existing.logo_path;
    if (req.file) {
      await removeFromStorage(existing.logo_path);
      logoUrl = await uploadToStorage(req.file);
    }

    const { error } = await supabase.from('partners').update({
      name: name || existing.name, tagline: tagline || '', description: description || '',
      applications: applications || '', logo_path: logoUrl, updated_at: new Date().toISOString()
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/api/partners/:id', async (req, res, next) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('partners').select('*').eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await removeFromStorage(existing.logo_path);
    const { error } = await supabase.from('partners').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
router.get('/api/products', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/api/products', upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, partner_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data: maxRow } = await supabase
      .from('products').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const nextOrder = maxRow ? maxRow.sort_order + 1 : 0;

    const imageUrl = await uploadToStorage(req.file);

    const { data, error } = await supabase.from('products').insert({
      partner_id: partner_id ? parseInt(partner_id, 10) : null, name, description: description || '',
      image_path: imageUrl, sort_order: nextOrder
    }).select('id').single();
    if (error) throw error;
    res.json({ id: data.id });
  } catch (err) { next(err); }
});

router.put('/api/products/:id', upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, partner_id } = req.body;
    const { data: existing, error: fetchErr } = await supabase
      .from('products').select('*').eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let imageUrl = existing.image_path;
    if (req.file) {
      await removeFromStorage(existing.image_path);
      imageUrl = await uploadToStorage(req.file);
    }

    const { error } = await supabase.from('products').update({
      name: name || existing.name, description: description || '',
      partner_id: partner_id ? parseInt(partner_id, 10) : null, image_path: imageUrl, updated_at: new Date().toISOString()
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/api/products/:id', async (req, res, next) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('products').select('*').eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await removeFromStorage(existing.image_path);
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Error handling — must be the last middleware mounted on this router.
// ---------------------------------------------------------------------------
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image is too large — the limit is 5MB.' });
    }
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  }
  if (err && err.message === 'Unsupported image type') {
    return res.status(400).json({ error: 'Unsupported image type — use JPG, PNG, WEBP or SVG.' });
  }
  console.error('Admin route error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

module.exports = router;
