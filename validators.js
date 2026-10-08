function required(value, field) {
  if (value === undefined || value === null || String(value).trim() === "") {
    const err = new Error(`${field} é obrigatório`);
    err.status = 400;
    throw err;
  }
}

function money(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error(`${field} deve ser um número válido`);
    err.status = 400;
    throw err;
  }
  return Number(n.toFixed(2));
}

function integer(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    const err = new Error(`${field} deve ser um inteiro válido`);
    err.status = 400;
    throw err;
  }
  return n;
}

function product(body) {
  required(body.name, "Nome");
  required(body.sku, "SKU");
  return {
    name: String(body.name).trim(),
    sku: String(body.sku).trim(),
    description: String(body.description || ""),
    category: String(body.category || ""),
    brand: String(body.brand || ""),
    cost_price: money(body.cost_price || 0, "Custo"),
    sale_price: money(body.sale_price || 0, "Preço de venda"),
    stock_quantity: integer(body.stock_quantity || 0, "Estoque"),
    stock_min: integer(body.stock_min || 0, "Estoque mínimo"),
    origin_type: ["OWN_STOCK", "DROPSHIPPING", "HYBRID"].includes(body.origin_type)
      ? body.origin_type : "DROPSHIPPING",
    status: ["ACTIVE", "INACTIVE", "DRAFT"].includes(body.status)
      ? body.status : "ACTIVE",
    supplier_id: body.supplier_id || null
  };
}

function supplier(body) {
  required(body.name, "Nome");
  return {
    name: String(body.name).trim(),
    cnpj: String(body.cnpj || ""),
    contact_name: String(body.contact_name || ""),
    phone: String(body.phone || ""),
    email: String(body.email || ""),
    integration_type: ["API", "CSV", "MANUAL"].includes(body.integration_type)
      ? body.integration_type : "MANUAL"
  };
}

function customer(body) {
  required(body.name, "Nome");
  return {
    name: String(body.name).trim(),
    email: String(body.email || ""),
    phone: String(body.phone || ""),
    doc_number: String(body.doc_number || "")
  };
}

function order(body) {
  required(body.customer_id, "Cliente");
  if (!Array.isArray(body.items) || body.items.length === 0) {
    const err = new Error("O pedido precisa ter pelo menos um item");
    err.status = 400;
    throw err;
  }

  const items = body.items.map(item => ({
    product_id: item.product_id,
    name_at_purchase: String(item.name_at_purchase || ""),
    sku: String(item.sku || ""),
    quantity: Number(item.quantity),
    unit_price: money(item.unit_price, "Preço unitário")
  }));

  for (const item of items) {
    if (!item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1) {
      const err = new Error("Item de pedido inválido");
      err.status = 400;
      throw err;
    }
  }

  return {
    customer_id: body.customer_id,
    marketplace_order_id: String(body.marketplace_order_id || ""),
    status: ["NEW","PAID","PROCESSING","AWAITING_SHIPMENT","SHIPPED","DELIVERED","CANCELLED"].includes(body.status)
      ? body.status : "NEW",
    payment_method: String(body.payment_method || ""),
    shipping_address: body.shipping_address || {},
    tracking_code: String(body.tracking_code || ""),
    items,
    total_amount: Number(items.reduce((s, i) => s + i.quantity * i.unit_price, 0).toFixed(2))
  };
}

module.exports = { product, supplier, customer, order };
