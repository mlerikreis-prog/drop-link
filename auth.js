const { supabaseAdmin } = require("../config/supabase");

async function authenticate(req, res, next) {
  if (!supabaseAdmin) {
    req.user = { id: "local-development-user", role: "owner" };
    return next();
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação ausente" });
  }

  const token = header.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Sessão inválida ou expirada" });
  }

  req.user = data.user;
  next();
}

module.exports = { authenticate };
