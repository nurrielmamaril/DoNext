-- A desktop notification fires straight off a task's due date, with no
-- reminder row involved. This column is the "already told you" marker: it
-- stops the every-minute cron re-notifying the same task forever, and its age
-- is what paces the repeat nudges.
alter table tasks add column due_notified_at timestamptz;

-- The cron scans for tasks that came due and are still open, so index exactly
-- that shape rather than the whole table.
create index tasks_due_notify_idx on tasks (due_date)
  where status <> 'completed' and deleted_at is null;

-- due_date and due_time are wall-clock values with no zone attached, so the
-- cron cannot know what "9:00 AM" means on its own. The app writes the
-- browser's own zone here on sign-in, which is what makes a due time fire at
-- that time on the machine that set it.
alter table profiles add column timezone text;
