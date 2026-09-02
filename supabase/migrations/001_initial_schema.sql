create extension if not exists pgcrypto;

create type public.app_role as enum ('customer','driver','restaurant','staff','admin');
create type public.account_status as enum ('active','suspended','pending');
create type public.order_status as enum (
  'created','restaurant_pending','restaurant_confirmed','preparing',
  'ready','driver_searching','driver_assigned','picked_up',
  'on_the_way','delivered','cancelled','failed'
);
create type public.payment_method as enum ('cod','online');
create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.driver_transaction_type as enum (
  'delivery_earning','cash_collection','settlement','advance',
  'deposit','deduction','bonus','adjustment','refund'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  status public.account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id),
  name text not null,
  phone text,
  address text,
  latitude double precision,
  longitude double precision,
  is_open boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  is_available boolean not null default false,
  current_latitude double precision,
  current_longitude double precision,
  last_location_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  restaurant_id uuid references public.restaurants(id),
  driver_id uuid references public.drivers(id),
  status public.order_status not null default 'created',
  payment_method public.payment_method not null default 'cod',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  customer_address text,
  customer_latitude double precision,
  customer_longitude double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_ledger (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id),
  order_id uuid references public.orders(id),
  type public.driver_transaction_type not null,
  amount numeric(12,2) not null,
  reference text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.driver_bonuses (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id),
  period_start date not null,
  period_end date not null,
  qualified_orders integer not null default 0,
  bonus_amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(driver_id, period_start, period_end)
);

create table public.driver_locations (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  speed double precision,
  heading double precision,
  recorded_at timestamptz not null default now()
);

create index orders_status_idx on public.orders(status);
create index orders_customer_idx on public.orders(customer_id);
create index orders_driver_idx on public.orders(driver_id);
create index driver_ledger_driver_idx on public.driver_ledger(driver_id);
create index driver_locations_driver_time_idx on public.driver_locations(driver_id, recorded_at desc);

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.restaurants enable row level security;
alter table public.drivers enable row level security;
alter table public.orders enable row level security;
alter table public.driver_ledger enable row level security;
alter table public.driver_bonuses enable row level security;
alter table public.driver_locations enable row level security;

-- Role assignment is intentionally server/admin controlled.
-- New auth users should receive role=customer through the profile creation trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.app_settings(key, value, description)
values
('delivery_pricing', '{"mode":"distance","base_fee":0,"tiers":[]}', 'Delivery pricing controlled by admin'),
('payment_methods', '{"cod":true,"online":false}', 'Enabled payment methods'),
('support', '{"phone":"","whatsapp":"","hours":""}', 'Customer support contacts'),
('bonus_rules', '{"enabled":true,"rules":[]}', 'Driver bonus rules'),
('marketing', '{"push_enabled":true}', 'Marketing notification settings')
on conflict (key) do nothing;
