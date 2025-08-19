-- 005_shopping_share.sql
-- Add share token to shopping_lists for public viewing
do $$
begin
  -- Only proceed if 004_shopping.sql has created the table
  if to_regclass('public.shopping_lists') is not null then
    alter table shopping_lists
      add column if not exists share_token uuid default gen_random_uuid();
    create unique index if not exists uq_shopping_lists_share_token on shopping_lists(share_token);
  end if;
end $$;
