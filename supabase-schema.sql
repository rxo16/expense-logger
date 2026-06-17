-- ============================================================
-- My Expense Logger — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  avatar_url      text,
  currency        text not null default 'INR',
  financial_year_start integer not null default 4, -- 4 = April
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CATEGORIES ──────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#0F9E76',
  icon        text not null default 'tag',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "Users manage own categories" on public.categories
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_categories_user_id on public.categories(user_id);

-- ─── SUBCATEGORIES ───────────────────────────────────────────
create table if not exists public.subcategories (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid not null references public.categories(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.subcategories enable row level security;
create policy "Users manage own subcategories" on public.subcategories
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_subcategories_category_id on public.subcategories(category_id);
create index if not exists idx_subcategories_user_id on public.subcategories(user_id);

-- ─── EXPENSES ────────────────────────────────────────────────
create table if not exists public.expenses (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  category_id      uuid not null references public.categories(id) on delete restrict,
  subcategory_id   uuid references public.subcategories(id) on delete set null,
  amount           numeric(12, 2) not null check (amount > 0),
  description      text not null,
  notes            text,
  payment_mode     text not null default 'upi'
                   check (payment_mode in ('upi', 'card', 'cash', 'bank_transfer', 'other')),
  incurred_for     text not null default 'self',  -- e.g. self, family, spouse, friends, siblings, or custom name
  expense_date     date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "Users manage own expenses" on public.expenses
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for common dashboard queries
create index if not exists idx_expenses_user_id      on public.expenses(user_id);
create index if not exists idx_expenses_date         on public.expenses(expense_date desc);
create index if not exists idx_expenses_user_date    on public.expenses(user_id, expense_date desc);
create index if not exists idx_expenses_category     on public.expenses(user_id, category_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
