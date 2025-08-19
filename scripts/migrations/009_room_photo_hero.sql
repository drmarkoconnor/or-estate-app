-- 009_room_photo_hero.sql
-- Add hero flag to room photos (separate from initial creation)
alter table room_photos add column if not exists is_hero boolean not null default false;
