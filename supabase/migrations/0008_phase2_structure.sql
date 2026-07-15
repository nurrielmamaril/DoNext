-- Phase 2: subtasks, comments, reminders, and push notification subscriptions.

create table subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index subtasks_task_id_idx on subtasks (task_id);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index task_comments_task_id_idx on task_comments (task_id);

create type reminder_method as enum ('browser', 'email');
create type reminder_status as enum ('pending', 'sent', 'dismissed', 'snoozed');

create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  remind_at timestamptz not null,
  method reminder_method not null default 'browser',
  status reminder_status not null default 'pending',
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_task_id_idx on reminders (task_id);
create index reminders_due_idx on reminders (remind_at) where status = 'pending';

-- One row per browser/device the user has enabled push notifications on.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table subtasks enable row level security;
alter table task_comments enable row level security;
alter table reminders enable row level security;
alter table push_subscriptions enable row level security;

create policy "subtasks: full access to own rows" on subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "task_comments: full access to own rows" on task_comments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminders: full access to own rows" on reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "push_subscriptions: full access to own rows" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
