const express = require('express');
const supabase = require('../db/supabaseClient');

const router = express.Router();

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

router.get('/partners', async (req, res) => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(serializePartner));
});

router.get('/partners/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
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
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(serializeProduct));
});

module.exports = router;
