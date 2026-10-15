-- Shree Balaji Decor Party Discount Manager
-- Run this whole file in Supabase > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  discount numeric(5,2) not null default 0 check (discount >= 0 and discount <= 100),
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parties_name_lower_idx on public.parties (lower(name));
create index if not exists parties_city_lower_idx on public.parties (lower(city));
create index if not exists parties_discount_idx on public.parties (discount);

alter table public.parties enable row level security;

-- This starter app is intended for one trusted business owner account.
-- Only authenticated users can access party records. Do not share your account.
drop policy if exists "Authenticated users can read parties" on public.parties;
create policy "Authenticated users can read parties"
  on public.parties for select to authenticated using (true);

drop policy if exists "Authenticated users can add parties" on public.parties;
create policy "Authenticated users can add parties"
  on public.parties for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update parties" on public.parties;
create policy "Authenticated users can update parties"
  on public.parties for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete parties" on public.parties;
create policy "Authenticated users can delete parties"
  on public.parties for delete to authenticated using (true);

-- Optional: prevent public self-signups after creating your own account.
-- In Supabase Dashboard > Authentication > Settings, turn off "Allow new users to sign up"
-- after you have successfully created your owner account.
