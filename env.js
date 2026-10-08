const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 10000),
  appUrl: process.env.APP_URL || "http://localhost:10000",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  meliClientId: process.env.MERCADO_LIVRE_CLIENT_ID || "",
  meliClientSecret: process.env.MERCADO_LIVRE_CLIENT_SECRET || "",
  meliRedirectUri: process.env.MERCADO_LIVRE_REDIRECT_URI || ""
};

env.hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
env.hasMeli = Boolean(env.meliClientId && env.meliClientSecret && env.meliRedirectUri);

module.exports = env;
