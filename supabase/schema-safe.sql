-- ArchFlow Database Schema (safe to re-run)

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default '',
  email text[] default '{}',
  phone text[] default '{}',
  notes text default '',
  contacts jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default '',
  email text[] default '{}',
  phone text[] default '{}',
  notes text default '',
  contacts jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default '',
  email text[] default '{}',
  phone text[] default '{}',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references clients(id) on delete set null,
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '30 days'),
  status text not null default 'planning'
    check (status in ('planning','active','review','done','delayed')),
  pct integer not null default 0 check (pct >= 0 and pct <= 100),
  notes text default '',
  sqm integer,
  uses text default '',
  floors integer,
  worker_ids uuid[] default '{}',
  contractor_ids uuid[] default '{}',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '14 days'),
  status text not null default 'planning'
    check (status in ('planning','active','review','done','delayed')),
  pct integer not null default 0 check (pct >= 0 and pct <= 100),
  notes text default '',
  worker_ids uuid[] default '{}',
  contractor_ids uuid[] default '{}',
  created_at timestamptz default now()
);
