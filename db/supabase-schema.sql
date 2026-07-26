-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists admin_users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists partners (
  id bigint generated always as identity primary key,
  name text not null,
  tagline text,
  description text,
  applications text,           -- newline-separated, same convention as before
  logo_path text,               -- now a full Supabase Storage public URL
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id bigint generated always as identity primary key,
  partner_id bigint references partners(id) on delete set null,
  name text not null,
  description text,
  image_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security: enable it, and add NO policies for anon/authenticated roles.
-- This means the public anon key gets zero access to these tables, full stop.
-- Your Express backend uses the service_role key, which bypasses RLS entirely by
-- design — that's the only way these tables are ever read or written.
alter table admin_users enable row level security;
alter table partners enable row level security;
alter table products enable row level security;
