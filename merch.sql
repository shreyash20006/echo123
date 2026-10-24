-- ECHO MERCH: run this whole file in Supabase -> SQL Editor (safe to run again).
-- All tables are private: ONLY the server (service role) can read/write them.

create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  buyer_name text not null,
  phone text not null,
  email text not null,
  batch text,
  items jsonb not null,
  qty int not null,
  total int not null,
  amount_due int not null,
  status text not null default 'PENDING',   -- PENDING | PAID | FAILED | CANCELLED | REFUNDED
  cf_payment_id text,
  paid_at timestamptz,
  delivered boolean not null default false,
  admin_note text,
  created_at timestamptz default now()
);
alter table public.merch_orders add column if not exists delivered boolean not null default false;
alter table public.merch_orders add column if not exists admin_note text;
create index if not exists idx_merch_status on public.merch_orders (status);

create table if not exists public.merch_products (
  sku text primary key,
  title text not null,
  edition text default '',
  type text not null default 'tee',          -- tee | hoodie | other
  price int not null,
  color text not null default '#FFFFFF',
  ink text not null default '#004BFE',
  spot text default 'Name on back',
  sizes jsonb not null default '["S","M","L","XL","XXL"]',
  images jsonb not null default '[]',        -- array of photo URLs (first = main)
  description text default '',
  active boolean not null default true,
  soldout boolean not null default false,
  sort int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.merch_settings (
  id int primary key default 1 check (id = 1),
  moq int not null default 50,
  deadline timestamptz not null default '2026-10-31 23:59:59+05:30',
  advance_percent int not null default 100,
  name_max int not null default 14,
  max_qty int not null default 5,
  is_open boolean not null default true,
  announcement text default ''
);
insert into public.merch_settings (id) values (1) on conflict do nothing;

insert into public.merch_products (sku,title,edition,type,price,color,ink,spot,sort) values
 ('council-hoodie','Council Hoodie','Council Edition','hoodie',1050,'#111827','#FFFFFF','Name on sleeve',1),
 ('nss-tee','NSS Tee','NSS Edition','tee',550,'#FFFFFF','#004BFE','Name on back',2),
 ('media-tee','Media Team Tee','Media Team','tee',550,'#FFD60A','#004BFE','Name on back',3),
 ('student-tee','Student Tee','Students','tee',550,'#002DAA','#FFD60A','Name on back',4)
on conflict (sku) do nothing;

alter table public.merch_orders   enable row level security;   -- no policies = no public access
alter table public.merch_products enable row level security;
alter table public.merch_settings enable row level security;

-- Public bucket for product photos (anyone can VIEW, only the server can upload)
insert into storage.buckets (id, name, public) values ('merch', 'merch', true) on conflict (id) do nothing;
