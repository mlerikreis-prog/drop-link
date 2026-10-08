const express = require("express");
const store = require("./store");
const validate = require("./validators");
const env = require("./config/env");
const { supabaseAdmin } = require("./config/supabase");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "drop-link",
    version: "3.1.0",
    database: supabaseAdmin ? "supabase" : "local-development",
    timestamp: new Date().toISOString()
  });
});

router.get("/dashboard", async (req, res) => {
  const [products, suppliers, customers, orders] = await Promise.all([
    store.list("products"), store.list("suppliers"),
    store.list("customers"), store.list("orders")
  ]);
  const validOrders = orders.filter(o => o.status !== "CANCELLED");
  const revenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const lowStock = products.filter(p =>
    Number(p.stock_quantity || 0) <= Number(p.stock_min || 0)
  ).length;

  res.json({
    products: products.length,
    activeProducts: products.filter(p => p.status === "ACTIVE").length,
    suppliers: suppliers.length,
    customers: customers.length,
    orders: orders.length,
    revenue: Number(revenue.toFixed(2)),
    lowStock
  });
});

function crud(resource, validator) {
  router.get(`/${resource}`, async (req, res) => res.json(await store.list(resource)));

  router.get(`/${resource}/:id`, async (req, res) => {
    const item = await store.get(resource, req.params.id);
    if (!item) return res.status(404).json({ error: "Registro não encontrado" });
    res.json(item);
  });

  router.post(`/${resource}`, async (req, res) => {
    const item = await store.create(resource, validator(req.body));
    res.status(201).json(item);
  });

  router.put(`/${resource}/:id`, async (req, res) => {
    const item = await store.update(resource, req.params.id, validator(req.body));
    if (!item) return res.status(404).json({ error: "Registro não encontrado" });
    res.json(item);
  });

  router.delete(`/${resource}/:id`, async (req, res) => {
    const ok = await store.remove(resource, req.params.id);
    if (!ok) return res.status(404).json({ error: "Registro não encontrado" });
    res.status(204).end();
  });
}

crud("products", validate.product);
crud("suppliers", validate.supplier);
crud("customers", validate.customer);

router.get("/orders", async (req, res) => res.json(await store.list("orders")));

router.get("/orders/:id", async (req, res) => {
  const item = await store.get("orders", req.params.id);
  if (!item) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(item);
});

router.post("/orders", async (req, res) => {
  const payload = validate.order(req.body);
  const products = await store.list("products");

  for (const item of payload.items) {
    const product = products.find(p => p.id === item.product_id);
    if (!product) {
      const err = new Error(`Produto não encontrado: ${item.product_id}`);
      err.status = 400;
      throw err;
    }
    item.name_at_purchase = item.name_at_purchase || product.name;
    item.sku = item.sku || product.sku;
  }

  const created = await store.create("orders", payload);
  res.status(201).json(created);
});

router.put("/orders/:id/status", async (req, res) => {
  const allowed = ["NEW","PAID","PROCESSING","AWAITING_SHIPMENT","SHIPPED","DELIVERED","CANCELLED"];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ error: "Status de pedido inválido" });
  }
  const updated = await store.update("orders", req.params.id, { status: req.body.status });
  if (!updated) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(updated);
});

router.get("/marketplace/mercadolivre/status", (req, res) => {
  res.json({
    configured: env.hasMeli,
    connected: false,
    message: env.hasMeli
      ? "Credenciais configuradas. O OAuth está disponível para conexão."
      : "Mercado Livre ainda não configurado."
  });
});

router.get("/marketplace/mercadolivre/authorize", (req, res) => {
  if (!env.hasMeli) {
    return res.status(503).json({ error: "Credenciais do Mercado Livre não configuradas" });
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.meliClientId,
    redirect_uri: env.meliRedirectUri
  });

  res.json({
    url: `https://auth.mercadolivre.com.br/authorization?${params.toString()}`
  });
});

module.exports = router;
