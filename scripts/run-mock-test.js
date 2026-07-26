const Module = require('module');
const path = require('path');
require('dotenv').config();

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === '@supabase/supabase-js') {
    return path.join(__dirname, 'mock-supabase.js');
  }
  return originalResolve.call(this, request, ...args);
};

const bcrypt = require('bcryptjs');
const { __mock } = require('./mock-supabase');
__mock.tables.admin_users.push({
  id: 1,
  username: process.env.ADMIN_USERNAME,
  password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 4),
  created_at: new Date().toISOString()
});

require('./smoke-test.js');
