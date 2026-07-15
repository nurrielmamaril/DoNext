-- Phase 1: profiles, lists, tasks
-- Every table carries user_id directly (denormalized) so RLS policies stay
-- a simple "user_id = auth.uid()" check, even for child tables added later.

create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('not_started', 'in_progress', 'waiting', 'completed');

-- One row per authenticated user, created automatically on signup.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid references lists (id) on delete set null,
  title text not null,
  description text,
  priority task_priority not null default 'medium',
  status task_status not null default 'not_started',
  due_date date,
  due_time time,
  position integer not null default 0,
  is_recurring boolean not null default false,
  recurrence_rule jsonb,
  recurrence_parent_id uuid references tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on tasks (user_id);
create index tasks_list_id_idx on tasks (list_id);
create index tasks_due_date_idx on tasks (due_date);
create index lists_user_id_idx on lists (user_id);

-- Keep updated_at current on every row change.
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lists_set_updated_at before update on lists
  for each row execute function set_updated_at();

create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security: every user can only ever see and modify their own rows.
alter table profiles enable row level security;
alter table lists enable row level security;
alter table tasks enable row level security;

create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

create policy "lists: full access to own rows" on lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks: full access to own rows" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
