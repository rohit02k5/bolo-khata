-- Bolo Khata reference schema (Supabase/Postgres equivalent of app/db.py).
-- SQLite is used for the P0/P1 demo build; this file documents the target
-- relational model + RLS policies for the deploy step and for review.

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null default 'kirana',
  vpa text,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table users_profile (
  id uuid primary key references auth.users(id),
  shop_id uuid references shops(id),
  role text not null check (role in ('owner','assistant')),
  name text
);

create table products (
  id bigint generated always as identity primary key,
  shop_id uuid references shops(id) not null,
  name text not null,
  aliases jsonb not null default '[]',      -- ["cheeni","chini","చక్కెర"]
  unit text not null default 'piece',      -- piece|kg|g|l|ml|packet
  pack_size real,                          -- e.g. 0.5 = 500g pack
  price_paise bigint not null,
  stock_qty real not null default 0,
  low_stock real default 0,
  active boolean default true
);

create table customers (
  id bigint generated always as identity primary key,
  shop_id uuid references shops(id) not null,
  name text not null,
  phone text,
  join_code uuid default gen_random_uuid() -- fixed QR join link
);

create table transactions (                -- APPEND-ONLY; reversals are rows
  id bigint generated always as identity primary key,
  shop_id uuid references shops(id) not null,
  customer_id bigint references customers(id),
  kind text not null check (kind in
    ('bill','payment','stock_in','stock_out','reversal')),
  amount_paise bigint,
  payment_method text,                     -- cash|upi|khata
  confirm_state text default 'na' check
    (confirm_state in ('na','pending','confirmed','disputed')),
  confirm_token uuid default gen_random_uuid(),
  reverses bigint references transactions(id),
  idempotency_key text unique,
  actor_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table transaction_items (
  id bigint generated always as identity primary key,
  txn_id bigint references transactions(id) not null,
  product_id bigint references products(id),
  name text, qty real, unit text,
  price_paise bigint, total_paise bigint
);

create table reminders (
  id bigint generated always as identity primary key,
  shop_id uuid references shops(id) not null,
  kind text check (kind in ('restock','voice_note','time')),
  payload jsonb,
  audio_path text,
  due_at timestamptz,
  done boolean default false
);

create table audit_log (
  id bigint generated always as identity primary key,
  shop_id uuid references shops(id) not null,
  actor_id uuid,
  action text, detail jsonb,
  created_at timestamptz default now()
);

-- RLS: every row scoped by shop membership
alter table products enable row level security;
alter table customers enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table reminders enable row level security;
alter table audit_log enable row level security;

create policy "own shop" on products
  using (shop_id = (select shop_id from users_profile where id = auth.uid()))
  with check (shop_id = (select shop_id from users_profile where id = auth.uid()));
-- (identical policy shape for customers, transactions, transaction_items,
--  reminders, audit_log)

-- Customer confirm links: public endpoint validated by confirm_token only;
-- exposes that single transaction row (no join to other customers).
