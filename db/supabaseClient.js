require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env. ' +
    'Get both from your Supabase project: Settings > API.'
  );
}

// IMPORTANT: this is the service_role key. It bypasses Row Level Security by design.
// It must NEVER be sent to a browser, logged, or committed to source control.
// It is only ever imported here, inside server-side route handlers.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
