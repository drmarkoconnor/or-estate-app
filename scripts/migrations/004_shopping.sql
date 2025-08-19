-- 004_shopping.sql
-- Shopping lists and items

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null default 'Shopping List',
  created_at timestamptz not null default now()
);
create index if not exists idx_shopping_lists_household on shopping_lists(household_id);

create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  item_key text not null, -- stable id from shopping.json
  name text not null,
  source text,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_shopping_list_items_list on shopping_list_items(list_id);
