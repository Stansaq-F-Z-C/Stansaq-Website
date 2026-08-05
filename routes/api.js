const express = require('express');
const supabase = require('../db/supabaseClient');

const router = express.Router();

// Never echo raw Supabase/Postgres error details to an anonymous visitor —
// that can leak schema names, query structure, or internal state. Log the
// real error server-side and return a generic message to the client.
function handleDbError(res, err) {
  console.error('Public API error:', err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again shortly.' });
}

function serializePartner(row) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    applications: (row.applications || '').split('\n').map(s => s.trim()).filter(Boolean),
    logoPath: row.logo_path || null // already a full Supabase Storage URL
  };
}

function serializeProduct(row) {
  return {
    id: row.id,
    partnerId: row.partner_id,
    name: row.name,
    description: row.description,
    imagePath: row.image_path || null
  };
}

function serializeInsight(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    excerpt: row.excerpt,
    imagePath: row.image_path || null,
    publishedDate: row.published_date
  };
}

router.get('/partners', async (req, res) => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return handleDbError(res, error);
  res.json(data.map(serializePartner));
});

router.get('/partners/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return handleDbError(res, error);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(serializePartner(data));
});

router.get('/products', async (req, res) => {
  let query = supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (req.query.partner_id) query = query.eq('partner_id', req.query.partner_id);
  const { data, error } = await query;
  if (error) return handleDbError(res, error);
  res.json(data.map(serializeProduct));
});

router.get('/insights', async (req, res) => {
  let query = supabase
    .from('insights')
    .select('*')
    .order('published_date', { ascending: false })
    .order('id', { ascending: false });
  const limit = parseInt(req.query.limit, 10);
  if (!isNaN(limit) && limit > 0) query = query.limit(limit);
  const { data, error } = await query;
  if (error) return handleDbError(res, error);
  res.json(data.map(serializeInsight));
});

module.exports = router;
