-- 001_init.sql
-- Create base tables for households and users (idempotent)

create extension if not exists pgcrypto;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  role text default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists user_households (
  user_id uuid references app_users(id) on delete cascade,
  household_id uuid references households(id) on delete cascade,
  primary key (user_id, household_id)
);

-- seed default household row if not exists by slug
insert into households (slug, name)
select '${HOUSEHOLD_SLUG}', 'Old Rectory'
where not exists (
  select 1 from households where slug = '${HOUSEHOLD_SLUG}'
);
