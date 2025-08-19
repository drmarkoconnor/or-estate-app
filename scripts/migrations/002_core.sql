-- 002_core.sql
-- Core domain tables per PROJECT_REQUIREMENTS.md

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  floor text,
  dimensions text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_rooms_household on rooms(household_id);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  name text not null,
  category text,
  serial_no text,
  purchase_date date,
  purchase_price numeric,
  supplier text,
  warranty_expiry date,
  manual_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_assets_household on assets(household_id);
create index if not exists idx_assets_room on assets(room_id);

create table if not exists asset_photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists idx_asset_photos_asset on asset_photos(asset_id);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  asset_id uuid references assets(id) on delete set null,
  title text not null,
  description text,
  priority text check (priority in ('low','normal','high')) default 'normal',
  due_date date,
  recurrence text,
  status text check (status in ('open','done')) default 'open',
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_tasks_household on tasks(household_id);
create index if not exists idx_tasks_due on tasks(due_date);

create table if not exists garden_areas (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  notes text
);
create index if not exists idx_garden_areas_household on garden_areas(household_id);

create table if not exists plantings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  area_id uuid references garden_areas(id) on delete set null,
  crop text not null,
  variety text,
  action text not null,
  date date not null,
  quantity text,
  success_rating int,
  notes text
);
create index if not exists idx_plantings_household on plantings(household_id);
create index if not exists idx_plantings_area on plantings(area_id);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  notes text
);
create index if not exists idx_contacts_household on contacts(household_id);

create table if not exists service_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  asset_id uuid references assets(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  date date not null,
  cost numeric,
  summary text,
  invoice_storage_path text
);
create index if not exists idx_service_records_asset on service_records(asset_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  doc_type text,
  related_asset uuid references assets(id) on delete set null,
  storage_path text not null,
  expiry_date date,
  notes text,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_documents_household on documents(household_id);
create index if not exists idx_documents_expiry on documents(expiry_date);

-- Optional: create storage buckets (Supabase)
-- insert into storage.buckets (id, name, public) values ('photos','photos', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('docs','docs', false) on conflict do nothing;
