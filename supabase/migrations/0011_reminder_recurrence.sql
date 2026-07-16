-- Lets a reminder repeat on its own schedule (independent of task
-- recurrence) — every N days/weeks/months. When a recurring reminder
-- fires, the send-due-reminders edge function reschedules this same row
-- rather than creating a new one, so recurrence_rule only ever needs to
-- describe "every N units" relative to whatever remind_at currently is.
alter table reminders add column is_recurring boolean not null default false;
alter table reminders add column recurrence_rule jsonb;
