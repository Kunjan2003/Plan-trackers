-- WarrantyVault MVP schema. Run in Supabase SQL Editor before setting env vars.
create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  store text,
  price numeric(12,2) not null default 0,
  purchase_date date,
  warranty_end date not null,
  warranty_duration_months integer,
  category text not null default 'Other' check (category in ('Electronics','Appliances','Furniture','Vehicles','Other')),
  notes text,
  support_email text,
  support_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_user_expiry_idx on public.items(user_id, warranty_end);
alter table public.items enable row level security;
drop policy if exists "Users manage their own items" on public.items;
create policy "Users manage their own items" on public.items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  file_url text not null,
  file_name text,
  created_at timestamptz not null default now()
);
create index if not exists receipts_item_idx on public.receipts(item_id);
alter table public.receipts enable row level security;
drop policy if exists "Users manage their own receipts" on public.receipts;
create policy "Users manage their own receipts" on public.receipts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  reminder_date date not null,
  days_before smallint not null check (days_before in (30,7,1)),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  created_at timestamptz not null default now(),
  unique(item_id, days_before)
);
create index if not exists reminders_due_idx on public.reminders(reminder_date, status);
alter table public.reminders enable row level security;
alter table public.reminders drop constraint if exists reminders_status_check;
alter table public.reminders add constraint reminders_status_check check (status in ('pending','processing','sent','failed','cancelled'));
drop policy if exists "Users read and manage their own reminders" on public.reminders;
create policy "Users read and manage their own reminders" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  browser_alerts boolean not null default true,
  email_alerts boolean not null default false,
  notification_email text,
  currency text not null default 'INR' check (currency in ('INR','USD','EUR','GBP')),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "Users manage their own settings" on public.user_settings;
create policy "Users manage their own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a private bucket named `receipts` in Storage. These policies scope
-- uploaded files to a folder named with the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
drop policy if exists "Users manage files in their receipt folder" on storage.objects;
create policy "Users manage files in their receipt folder" on storage.objects
  for all using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Rerunnable extension for existing deployments that applied an earlier MVP schema.
alter table public.items add column if not exists warranty_duration_months integer;
alter table public.items add column if not exists support_url text;

