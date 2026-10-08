const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const env = require("./config/env");
const api = require("./routes");
const { authenticate } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
const publicDir = path.resolve(__dirname, "../../frontend/public");

app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.mercadolibre.com", "https://auth.mercadolivre.com.br"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.use(cors({
  origin: env.nodeEnv === "production" ? env.appUrl : true,
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDir));
app.use("/api", authenticate, api);

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, "0.0.0.0", () => {
  console.log(`DROP LINK V3.1 rodando em ${env.appUrl}`);
});
