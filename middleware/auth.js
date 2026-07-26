function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.redirect('/admin/login.html');
}

module.exports = { requireAuth };
