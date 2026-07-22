-- Lets a task or note be sent via email at a chosen future date/time
-- instead of immediately, sent automatically by the send-scheduled-emails
-- cron function. Independent of reminders (which always email the task
-- owner) — this emails an arbitrary recipient and applies to notes too, so
-- it gets its own table rather than overloading reminders.
create table scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('task', 'note')),
  item_id uuid not null,
  recipient_email text not null,
  subject text,
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

create index scheduled_emails_due_idx on scheduled_emails (send_at) where status = 'pending';

alter table scheduled_emails enable row level security;

create policy "scheduled_emails: full access to own rows" on scheduled_emails
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
