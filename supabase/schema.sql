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
  warranty_source text not null default 'user' check (warranty_source in ('receipt','manufacturer','user')),
  serial_number text,
  claim_issue text,
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
  processing_at timestamptz,
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
alter table public.items add column if not exists warranty_source text not null default 'user';
alter table public.items add column if not exists serial_number text;
alter table public.items add column if not exists claim_issue text;
alter table public.items drop constraint if exists items_warranty_source_check;
alter table public.items add constraint items_warranty_source_check check (warranty_source in ('receipt','manufacturer','user')) not valid;
alter table public.items validate constraint items_warranty_source_check;
alter table public.reminders add column if not exists processing_at timestamptz;

-- Item-level sharing: an owner can invite an existing account as a viewer or editor.
create table if not exists public.item_shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  shared_email text not null default '',
  permission text not null default 'viewer' check (permission in ('viewer','editor')),
  created_at timestamptz not null default now(),
  unique(item_id, shared_with_user_id),
  check(owner_id <> shared_with_user_id)
);
alter table public.item_shares add column if not exists shared_email text not null default '';
create index if not exists item_shares_recipient_idx on public.item_shares(shared_with_user_id, item_id);
alter table public.item_shares enable row level security;
drop policy if exists "Users view their item shares" on public.item_shares;
create policy "Users view their item shares" on public.item_shares for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = shared_with_user_id);
-- Share creation and permission changes go through the authenticated Edge Function
-- with a service role after it verifies the caller owns the item. Clients cannot
-- insert or mutate access rows directly.
drop policy if exists "Owners create item shares" on public.item_shares;
drop policy if exists "Owners update item shares" on public.item_shares;
drop policy if exists "Owners delete item shares" on public.item_shares;
create policy "Owners delete item shares" on public.item_shares for delete to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Shared users read shared items" on public.items;
create policy "Shared users read shared items" on public.items for select to authenticated
  using (exists (select 1 from public.item_shares s where s.item_id = items.id and s.shared_with_user_id = auth.uid()));
drop policy if exists "Editors update shared items" on public.items;
create policy "Editors update shared items" on public.items for update to authenticated
  using (exists (select 1 from public.item_shares s where s.item_id = items.id and s.owner_id = items.user_id and s.shared_with_user_id = auth.uid() and s.permission = 'editor'))
  with check (exists (select 1 from public.item_shares s where s.item_id = items.id and s.owner_id = items.user_id and s.shared_with_user_id = auth.uid() and s.permission = 'editor'));

drop policy if exists "Shared users read shared receipts" on public.receipts;
create policy "Shared users read shared receipts" on public.receipts for select to authenticated
  using (exists (select 1 from public.item_shares s where s.item_id = receipts.item_id and s.shared_with_user_id = auth.uid()));
drop policy if exists "Shared users read shared receipt files" on storage.objects;
create policy "Shared users read shared receipt files" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and exists (
    select 1 from public.item_shares s
    where s.owner_id::text = (storage.foldername(name))[1]
      and s.item_id::text = (storage.foldername(name))[2]
      and s.shared_with_user_id = auth.uid()
  ));

