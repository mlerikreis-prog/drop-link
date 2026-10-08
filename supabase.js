const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

const supabaseAdmin = env.hasSupabase
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

module.exports = { supabaseAdmin };
