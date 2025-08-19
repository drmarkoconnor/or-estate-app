-- 008_assets_category_price.sql
-- Ensure assets has category and price columns with expected types
alter table assets
  add column if not exists category text,
  add column if not exists purchase_price numeric;
