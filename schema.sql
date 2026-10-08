create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  role text not null default 'operator' check(role in ('owner','admin','manager','operator','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  cnpj text, contact_name text, phone text, email text,
  integration_type text not null default 'MANUAL' check(integration_type in ('API','CSV','MANUAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  sku text not null, name text not null, description text, category text, brand text,
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock_quantity integer not null default 0,
  stock_reserved integer not null default 0,
  stock_min integer not null default 0,
  origin_type text not null default 'DROPSHIPPING' check(origin_type in ('OWN_STOCK','DROPSHIPPING','HYBRID')),
  status text not null default 'ACTIVE' check(status in ('ACTIVE','INACTIVE','DRAFT')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_company_sku_idx on public.products(company_id, sku);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null, email text, phone text, doc_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  marketplace_order_id text,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'NEW'
    check(status in ('NEW','PAID','PROCESSING','AWAITING_SHIPMENT','SHIPPED','DELIVERED','CANCELLED')),
  total_amount numeric(12,2) not null default 0,
  payment_method text,
  shipping_address jsonb not null default '{}'::jsonb,
  tracking_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name_at_purchase text not null, sku text,
  quantity integer not null check(quantity > 0),
  unit_price numeric(12,2) not null default 0,
  subtotal numeric(12,2) generated always as(quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  marketplace text not null default 'MERCADO_LIVRE',
  user_id_meli text, nickname text,
  access_token text, refresh_token text, expires_at timestamptz,
  status text not null default 'DISCONNECTED' check(status in ('CONNECTED','DISCONNECTED','ERROR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.marketplace_accounts enable row level security;

create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path=public as $$
  select company_id from public.profiles where id=auth.uid()
$$;

create policy "company members read company" on public.companies for select using(id=public.my_company_id());

create policy "members suppliers" on public.suppliers for all
using(company_id=public.my_company_id()) with check(company_id=public.my_company_id());

create policy "members products" on public.products for all
using(company_id=public.my_company_id()) with check(company_id=public.my_company_id());

create policy "members customers" on public.customers for all
using(company_id=public.my_company_id()) with check(company_id=public.my_company_id());

create policy "members orders" on public.orders for all
using(company_id=public.my_company_id()) with check(company_id=public.my_company_id());

create policy "members order items" on public.order_items for all
using(exists(select 1 from public.orders o where o.id=order_items.order_id and o.company_id=public.my_company_id()))
with check(exists(select 1 from public.orders o where o.id=order_items.order_id and o.company_id=public.my_company_id()));

create policy "members marketplace accounts" on public.marketplace_accounts for all
using(company_id=public.my_company_id()) with check(company_id=public.my_company_id());

create index if not exists products_company_idx on public.products(company_id);
create index if not exists suppliers_company_idx on public.suppliers(company_id);
create index if not exists customers_company_idx on public.customers(company_id);
create index if not exists orders_company_idx on public.orders(company_id);
