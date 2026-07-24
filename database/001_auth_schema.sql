create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'teacher', 'parent');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('verified', 'not_verified');
  end if;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role user_role not null,
  verification_status verification_status not null default 'not_verified',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on users(role);

-- Demo password for all users is: Password@123
-- These bcrypt hashes are safe for development only.
insert into users (full_name, email, password_hash, role, verification_status)
values
  ('School Admin', 'admin@edunexus.test', '$2b$10$zRKqafkjHMJArP/xu5TSR.6ZSDMB/RNHSiE1pC5n38AByirTmefvO', 'admin', 'verified'),
  ('Anita Teacher', 'teacher@edunexus.test', '$2b$10$zRKqafkjHMJArP/xu5TSR.6ZSDMB/RNHSiE1pC5n38AByirTmefvO', 'teacher', 'verified'),
  ('Rahul Parent', 'parent@edunexus.test', '$2b$10$zRKqafkjHMJArP/xu5TSR.6ZSDMB/RNHSiE1pC5n38AByirTmefvO', 'parent', 'not_verified')
on conflict (email) do nothing;
