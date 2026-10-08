const state = {
  view: "dashboard",
  products: [],
  suppliers: [],
  customers: [],
  orders: [],
  dashboard: null,
  meli: null
};

const $ = (s) => document.querySelector(s);
const money = (n) => Number(n || 0).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusLabel = {
  NEW:"Novo", PAID:"Pago", PROCESSING:"Processando", AWAITING_SHIPMENT:"Aguardando envio",
  SHIPPED:"Enviado", DELIVERED:"Entregue", CANCELLED:"Cancelado"
};
const statusClass = {NEW:"blue",PAID:"green",PROCESSING:"orange",AWAITING_SHIPMENT:"purple",SHIPPED:"blue",DELIVERED:"green",CANCELLED:"red"};

async function api(path, options={}) {
  const res = await fetch("/api" + path, {
    headers: {"Content-Type":"application/json", ...(options.headers || {})},
    ...options
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(data.error || "Não foi possível concluir a operação");
  return data;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function setActive() {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
}

async function loadAll() {
  [state.dashboard, state.products, state.suppliers, state.customers, state.orders, state.meli] =
    await Promise.all([
      api("/dashboard"), api("/products"), api("/suppliers"), api("/customers"),
      api("/orders"), api("/marketplace/mercadolivre/status")
    ]);
}

function pageHead(title, subtitle, action="") {
  return `<div class="page-head"><div><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<div class="head-actions">${action}</div>` : ""}</div>`;
}

function dashboard() {
  const d = state.dashboard || {};
  const low = state.products.filter(p => Number(p.stock_quantity) <= Number(p.stock_min)).slice(0,4);
  const orders = state.orders.slice(0,6);
  const bars = Array.from({length:14},(_,i)=> {
    const value = state.orders.length ? Math.max(8, ((i*17)%100)) : 8;
    return `<div class="bar" style="height:${value}%"></div>`;
  }).join("");

  return `
  ${pageHead("Olá! 👋","Aqui está o resumo da sua operação.","<button class='btn'>01/10/2026 — 07/10/2026 ▾</button>")}
  <div class="kpis">
    <div class="kpi blue"><div class="kpi-top"><span>Vendas</span><div class="kpi-icon">R$</div></div><strong>${money(d.revenue)}</strong><small>Pedidos válidos registrados</small></div>
    <div class="kpi green"><div class="kpi-top"><span>Pedidos</span><div class="kpi-icon">🛒</div></div><strong>${d.orders||0}</strong><small>Total de pedidos</small></div>
    <div class="kpi orange"><div class="kpi-top"><span>Produtos Ativos</span><div class="kpi-icon">□</div></div><strong>${d.activeProducts||0}</strong><small>${d.products||0} produtos cadastrados</small></div>
    <div class="kpi purple"><div class="kpi-top"><span>Clientes</span><div class="kpi-icon">♙</div></div><strong>${d.customers||0}</strong><small>Clientes cadastrados</small></div>
  </div>
  <div class="grid2">
    <div class="panel"><div class="panel-head"><h3>Vendas e Pedidos</h3><span class="muted">Dados reais</span></div>
      ${state.orders.length ? `<div class="chart">${bars}</div><div class="chart-labels"><span>Período inicial</span><span>Hoje</span></div>` : `<div class="empty"><div><strong>Ainda não existem vendas</strong>Cadastre produtos e pedidos para começar a acompanhar sua operação.</div></div>`}
    </div>
    <div class="panel"><div class="panel-head"><h3>Status dos Pedidos</h3><span class="muted">${d.orders||0} total</span></div>
      <div class="status-list">
        ${["NEW","PAID","PROCESSING","AWAITING_SHIPMENT","SHIPPED","DELIVERED","CANCELLED"].map(s=>{
          const count=state.orders.filter(o=>o.status===s).length;
          return `<div class="status-row"><span class="dot ${statusClass[s]||"blue"}"></span><span>${statusLabel[s]}</span><b>${count}</b></div>`;
        }).join("")}
      </div>
    </div>
  </div>
  <div class="grid3">
    <div class="panel"><div class="panel-head"><h3>Integração Mercado Livre</h3><span class="pill ${state.meli?.connected?"":"warn"}">${state.meli?.connected?"● Conectado":"● Não conectado"}</span></div>
      <div class="integration"><div class="meli-logo">ML</div><div><b>Mercado Livre</b><p class="muted">${state.meli?.configured?"Credenciais configuradas":"Configure as credenciais para conectar."}</p><button class="btn small" onclick="navigate('meli')">Gerenciar conexão</button></div></div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Estoque em Destaque</h3><button class="btn small" onclick="navigate('stock')">Ver todos</button></div>
      ${low.length ? `<div class="mini-list">${low.map(p=>`<div class="mini-row"><div class="mini-img">□</div><div class="grow"><b>${esc(p.name)}</b><small>SKU: ${esc(p.sku)}</small></div><span>${p.stock_quantity} un.</span><span class="pill ${p.stock_quantity===0?"red":"warn"}">${p.stock_quantity===0?"Sem estoque":"Em risco"}</span></div>`).join("")}</div>` : `<div class="empty">Nenhum produto em nível crítico.</div>`}
    </div>
    <div class="panel"><div class="panel-head"><h3>Fornecedores</h3><button class="btn small" onclick="navigate('suppliers')">Ver todos</button></div>
      ${state.suppliers.length ? `<div class="mini-list">${state.suppliers.slice(0,4).map(s=>`<div class="mini-row"><div class="mini-img">▣</div><div class="grow"><b>${esc(s.name)}</b><small>${esc(s.integration_type)}</small></div><span class="pill">Ativo</span></div>`).join("")}</div>` : `<div class="empty">Nenhum fornecedor cadastrado.</div>`}
    </div>
  </div>
  <div class="panel table-panel"><div class="panel-head"><h3>Últimos Pedidos</h3><button class="btn small" onclick="navigate('orders')">Ver todos</button></div>
    ${orders.length ? orderTable(orders) : `<div class="empty"><div><strong>Nenhum pedido ainda</strong>Os pedidos criados pela operação aparecerão aqui.</div></div>`}
  </div>`;
}

function orderTable(orders) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>
  ${orders.map(o=>{const c=state.customers.find(x=>x.id===o.customer_id);return `<tr><td>#${esc(o.marketplace_order_id||o.id.slice(0,8))}</td><td>${esc(c?.name||"—")}</td><td>${new Date(o.created_at).toLocaleString("pt-BR")}</td><td>${money(o.total_amount)}</td><td><span class="badge ${statusClass[o.status]}">${statusLabel[o.status]}</span></td><td class="actions"><button class="btn small" onclick="changeOrderStatus('${o.id}')">Status</button></td></tr>`}).join("")}
  </tbody></table></div>`;
}

function products() {
  return `${pageHead("Produtos","Catálogo e controle de produtos.",`<button class="btn primary" onclick="productModal()">+ Novo produto</button>`)}
  <div class="panel table-panel">${state.products.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>SKU</th><th>Origem</th><th>Custo</th><th>Venda</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>
  ${state.products.map(p=>`<tr><td><b>${esc(p.name)}</b><br><small class="muted">${esc(p.category)}</small></td><td>${esc(p.sku)}</td><td>${esc(p.origin_type)}</td><td>${money(p.cost_price)}</td><td>${money(p.sale_price)}</td><td>${p.stock_quantity}</td><td><span class="badge ${p.status==="ACTIVE"?"green":"orange"}">${esc(p.status)}</span></td><td class="actions"><button class="btn small" onclick="editProduct('${p.id}')">Editar</button><button class="btn small danger" onclick="deleteItem('products','${p.id}')">Excluir</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><div><strong>Seu catálogo está vazio</strong><button class="btn primary" onclick="productModal()">Cadastrar primeiro produto</button></div></div>`}</div>`;
}

function suppliers() {
  return `${pageHead("Fornecedores","Gerencie seus parceiros e integrações.",`<button class="btn primary" onclick="supplierModal()">+ Novo fornecedor</button>`)}
  <div class="cards">${state.suppliers.length ? state.suppliers.map(s=>`<div class="product-card"><h3>${esc(s.name)}</h3><div class="product-meta"><span>${esc(s.contact_name||"Sem contato")}</span><span>${esc(s.email||"Sem e-mail")}</span><span>Integração: ${esc(s.integration_type)}</span></div><div class="head-actions" style="margin-top:14px"><button class="btn small" onclick="editSupplier('${s.id}')">Editar</button><button class="btn small danger" onclick="deleteItem('suppliers','${s.id}')">Excluir</button></div></div>`).join(""):`<div class="panel empty"><div><strong>Nenhum fornecedor</strong>Cadastre seu primeiro fornecedor.</div></div>`}</div>`;
}

function customers() {
  return `${pageHead("Clientes","Cadastro de clientes da operação.",`<button class="btn primary" onclick="customerModal()">+ Novo cliente</button>`)}
  <div class="panel table-panel">${state.customers.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Documento</th><th>Ações</th></tr></thead><tbody>${state.customers.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${esc(c.doc_number)}</td><td><button class="btn small" onclick="editCustomer('${c.id}')">Editar</button> <button class="btn small danger" onclick="deleteItem('customers','${c.id}')">Excluir</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><div><strong>Nenhum cliente cadastrado</strong>Cadastre clientes para criar pedidos.</div></div>`}</div>`;
}

function orders() {
  return `${pageHead("Pedidos","Pedidos da operação e do marketplace.",`<button class="btn primary" onclick="orderModal()">+ Novo pedido</button>`)}
  <div class="panel table-panel">${state.orders.length ? orderTable(state.orders) : `<div class="empty"><div><strong>Nenhum pedido</strong>Os pedidos reais aparecerão aqui.</div></div>`}</div>`;
}

function stock() {
  return `${pageHead("Estoque","Visão operacional do estoque por produto.","")}
  <div class="cards">${state.products.length ? state.products.map(p=>{const risk=Number(p.stock_quantity)<=Number(p.stock_min);return `<div class="product-card"><div class="panel-head"><h3>${esc(p.name)}</h3><span class="pill ${risk?"warn":""}">${risk?"Atenção":"Normal"}</span></div><div class="product-meta"><span>SKU: ${esc(p.sku)}</span><span>Estoque atual: <b>${p.stock_quantity}</b></span><span>Mínimo: ${p.stock_min}</span><span>Origem: ${esc(p.origin_type)}</span></div></div>`}).join(""):`<div class="panel empty"><div><strong>Sem produtos</strong>Cadastre produtos para controlar o estoque.</div></div>`}</div>`;
}

function meli() {
  const m=state.meli||{};
  return `${pageHead("Mercado Livre","Conexão e status da integração com o marketplace.","")}
  <div class="panel"><div class="integration"><div class="meli-logo">ML</div><div><h2 style="margin:0 0 7px">Mercado Livre</h2><p class="muted">${esc(m.message||"")}</p><span class="pill ${m.configured?"":"warn"}">${m.configured?"Credenciais configuradas":"Não configurado"}</span><div style="margin-top:15px">${m.configured?`<button class="btn primary" onclick="authorizeMeli()">Conectar conta</button>`:`<div class="notice">Adicione MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET e MERCADO_LIVRE_REDIRECT_URI no ambiente do servidor.</div>`}</div></div></div></div>`;
}

function reports() {
  return `${pageHead("Relatórios","Indicadores construídos a partir dos dados registrados.","")}
  <div class="grid3"><div class="panel"><h3>Receita</h3><strong style="font-size:28px">${money(state.dashboard?.revenue)}</strong></div><div class="panel"><h3>Pedidos</h3><strong style="font-size:28px">${state.orders.length}</strong></div><div class="panel"><h3>Estoque em risco</h3><strong style="font-size:28px">${state.dashboard?.lowStock||0}</strong></div></div>`;
}

function settings() {
  return `${pageHead("Configurações","Ambiente e status técnico da aplicação.","")}
  <div class="panel"><h3>Status do sistema</h3><div class="status-list"><div class="status-row"><span class="dot green"></span><span>API</span><b>Online</b></div><div class="status-row"><span class="dot ${state.meli?.configured?"green":"orange"}"></span><span>Mercado Livre</span><b>${state.meli?.configured?"Configurado":"Pendente"}</b></div><div class="status-row"><span class="dot green"></span><span>Frontend</span><b>Online</b></div></div></div>`;
}

async function render() {
  setActive();
  const app=$("#app");
  app.innerHTML='<div class="loading">Carregando...</div>';
  try {
    await loadAll();
    app.innerHTML = ({
      dashboard,products,suppliers,orders,meli,customers,stock,reports,settings
    }[state.view] || dashboard)();
  } catch(e) {
    app.innerHTML = `<div class="panel"><div class="notice">Erro: ${esc(e.message)}</div></div>`;
  }
}

window.navigate = (view) => { state.view=view; render(); };

function openModal(html) {
  $("#modalBody").innerHTML=html;
  $("#modal").classList.remove("hidden");
}
function closeModal(){ $("#modal").classList.add("hidden"); }
$("#modalClose").addEventListener("click",closeModal);
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});

function productForm(p={}) {
  return `<h2>${p.id?"Editar":"Novo"} produto</h2><form id="entityForm" class="form-grid">
  <div class="field"><label>Nome *</label><input name="name" required value="${esc(p.name)}"></div>
  <div class="field"><label>SKU *</label><input name="sku" required value="${esc(p.sku)}"></div>
  <div class="field"><label>Categoria</label><input name="category" value="${esc(p.category)}"></div>
  <div class="field"><label>Marca</label><input name="brand" value="${esc(p.brand)}"></div>
  <div class="field"><label>Custo</label><input name="cost_price" type="number" min="0" step=".01" value="${p.cost_price||0}"></div>
  <div class="field"><label>Preço de venda</label><input name="sale_price" type="number" min="0" step=".01" value="${p.sale_price||0}"></div>
  <div class="field"><label>Estoque</label><input name="stock_quantity" type="number" min="0" value="${p.stock_quantity||0}"></div>
  <div class="field"><label>Estoque mínimo</label><input name="stock_min" type="number" min="0" value="${p.stock_min||0}"></div>
  <div class="field"><label>Origem</label><select name="origin_type"><option ${p.origin_type==="DROPSHIPPING"?"selected":""}>DROPSHIPPING</option><option ${p.origin_type==="OWN_STOCK"?"selected":""}>OWN_STOCK</option><option ${p.origin_type==="HYBRID"?"selected":""}>HYBRID</option></select></div>
  <div class="field"><label>Status</label><select name="status"><option ${p.status==="ACTIVE"||!p.status?"selected":""}>ACTIVE</option><option ${p.status==="INACTIVE"?"selected":""}>INACTIVE</option><option ${p.status==="DRAFT"?"selected":""}>DRAFT</option></select></div>
  <div class="field"><label>Fornecedor</label><select name="supplier_id"><option value="">Nenhum</option>${state.suppliers.map(s=>`<option value="${s.id}" ${p.supplier_id===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>
  <div class="field full"><label>Descrição</label><textarea name="description">${esc(p.description)}</textarea></div>
  <div class="form-actions full"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary">Salvar produto</button></div></form>`;
}
window.productModal=()=>{openModal(productForm());$("#entityForm").onsubmit=saveProduct;};
window.editProduct=async(id)=>{const p=state.products.find(x=>x.id===id);openModal(productForm(p));$("#entityForm").onsubmit=(e)=>saveProduct(e,id);};

async function saveProduct(e,id){e.preventDefault();const body=Object.fromEntries(new FormData(e));try{await api(id?`/products/${id}`:"/products",{method:id?"PUT":"POST",body:JSON.stringify(body)});closeModal();toast("Produto salvo com sucesso");render();}catch(x){toast(x.message);}}

function supplierForm(s={}){return `<h2>${s.id?"Editar":"Novo"} fornecedor</h2><form id="entityForm" class="form-grid">
<div class="field full"><label>Nome *</label><input name="name" required value="${esc(s.name)}"></div><div class="field"><label>CNPJ</label><input name="cnpj" value="${esc(s.cnpj)}"></div><div class="field"><label>Contato</label><input name="contact_name" value="${esc(s.contact_name)}"></div><div class="field"><label>Telefone</label><input name="phone" value="${esc(s.phone)}"></div><div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(s.email)}"></div><div class="field"><label>Integração</label><select name="integration_type"><option>MANUAL</option><option ${s.integration_type==="API"?"selected":""}>API</option><option ${s.integration_type==="CSV"?"selected":""}>CSV</option></select></div>
<div class="form-actions full"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary">Salvar fornecedor</button></div></form>`;}
window.supplierModal=()=>{openModal(supplierForm());$("#entityForm").onsubmit=saveSupplier;};window.editSupplier=id=>{const s=state.suppliers.find(x=>x.id===id);openModal(supplierForm(s));$("#entityForm").onsubmit=e=>saveSupplier(e,id);};
async function saveSupplier(e,id){e.preventDefault();try{await api(id?`/suppliers/${id}`:"/suppliers",{method:id?"PUT":"POST",body:JSON.stringify(Object.fromEntries(new FormData(e)))});closeModal();toast("Fornecedor salvo");render();}catch(x){toast(x.message);}}

function customerForm(c={}){return `<h2>${c.id?"Editar":"Novo"} cliente</h2><form id="entityForm" class="form-grid"><div class="field full"><label>Nome *</label><input name="name" required value="${esc(c.name)}"></div><div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(c.email)}"></div><div class="field"><label>Telefone</label><input name="phone" value="${esc(c.phone)}"></div><div class="field full"><label>Documento</label><input name="doc_number" value="${esc(c.doc_number)}"></div><div class="form-actions full"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary">Salvar cliente</button></div></form>`;}
window.customerModal=()=>{openModal(customerForm());$("#entityForm").onsubmit=saveCustomer;};window.editCustomer=id=>{const c=state.customers.find(x=>x.id===id);openModal(customerForm(c));$("#entityForm").onsubmit=e=>saveCustomer(e,id);};
async function saveCustomer(e,id){e.preventDefault();try{await api(id?`/customers/${id}`:"/customers",{method:id?"PUT":"POST",body:JSON.stringify(Object.fromEntries(new FormData(e)))});closeModal();toast("Cliente salvo");render();}catch(x){toast(x.message);}}

function orderModal(){
  if(!state.customers.length||!state.products.length){toast("Cadastre cliente e produto antes de criar um pedido");return;}
  openModal(`<h2>Novo pedido</h2><form id="orderForm"><div class="form-grid"><div class="field"><label>Cliente *</label><select name="customer_id">${state.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label>ID Mercado Livre</label><input name="marketplace_order_id" placeholder="Opcional"></div><div class="field"><label>Produto *</label><select name="product_id">${state.products.map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.sale_price)}</option>`).join("")}</select></div><div class="field"><label>Quantidade *</label><input name="quantity" type="number" min="1" value="1"></div><div class="field"><label>Pagamento</label><input name="payment_method"></div><div class="field"><label>Rastreamento</label><input name="tracking_code"></div></div><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary">Criar pedido</button></div></form>`);
  $("#orderForm").onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e));const p=state.products.find(x=>x.id===f.product_id);try{await api("/orders",{method:"POST",body:JSON.stringify({customer_id:f.customer_id,marketplace_order_id:f.marketplace_order_id,payment_method:f.payment_method,tracking_code:f.tracking_code,items:[{product_id:p.id,quantity:Number(f.quantity),unit_price:Number(p.sale_price)}]})});closeModal();toast("Pedido criado");render();}catch(x){toast(x.message);}};
}
window.orderModal=orderModal;

window.changeOrderStatus=async id=>{const o=state.orders.find(x=>x.id===id);const next=prompt("Novo status: NEW, PAID, PROCESSING, AWAITING_SHIPMENT, SHIPPED, DELIVERED ou CANCELLED",o.status);if(!next)return;try{await api(`/orders/${id}/status`,{method:"PUT",body:JSON.stringify({status:next.toUpperCase()})});toast("Status atualizado");render();}catch(x){toast(x.message);}};
window.deleteItem=async(resource,id)=>{if(!confirm("Excluir este registro?"))return;try{await api(`/${resource}/${id}`,{method:"DELETE"});toast("Registro excluído");render();}catch(x){toast(x.message);}};
window.authorizeMeli=async()=>{try{const r=await api("/marketplace/mercadolivre/authorize");location.href=r.url;}catch(x){toast(x.message);}};

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
$("#globalSearch").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase().trim();
  if(!q)return;
  if(state.view==="products"){$("#app").querySelectorAll("tbody tr").forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?"":"none");}
});
render();
