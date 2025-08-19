-- 006_shopping_description.sql
-- Add optional description to shopping_lists
alter table shopping_lists
  add column if not exists description text;
