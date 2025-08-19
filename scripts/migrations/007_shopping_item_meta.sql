-- 007_shopping_item_meta.sql
-- Per-household metadata for curated shopping catalog items
create table if not exists shopping_item_meta (
  household_id uuid not null references households(id) on delete cascade,
  item_key text not null,
  favorite boolean not null default false,
  last_bought date,
  primary key (household_id, item_key)
);
create index if not exists idx_shopping_item_meta_fav on shopping_item_meta(household_id, favorite);
create index if not exists idx_shopping_item_meta_date on shopping_item_meta(household_id, last_bought);
