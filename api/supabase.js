// Load environment variables from parent directory
// require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
require('dotenv').config()

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY in the root .env file');
}

// Regular client for database operations (uses anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for storage operations (uses service role key - bypasses RLS)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client if service key not available

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
