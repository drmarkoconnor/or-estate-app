-- 003_room_media.sql
-- Room-linked media and indexes

-- Documents: add optional room_id for direct association
alter table documents
  add column if not exists room_id uuid references rooms(id) on delete set null;
create index if not exists idx_documents_room on documents(room_id);

-- Room photos table (separate from asset_photos)
create table if not exists room_photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  storage_path text not null,
  caption text,
  is_hero boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_room_photos_room on room_photos(room_id);

-- Optional: create storage buckets (private by default)
-- insert into storage.buckets (id, name, public) values ('photos','photos', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('docs','docs', false) on conflict do nothing;
