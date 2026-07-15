-- Simplifies priority from four tiers (low/medium/high/urgent) to three
-- (low/high/urgent). Existing "medium" tasks become "low".
update tasks set priority = 'low' where priority = 'medium';

alter type task_priority rename to task_priority_old;
create type task_priority as enum ('low', 'high', 'urgent');

alter table tasks alter column priority drop default;
alter table tasks alter column priority type task_priority using priority::text::task_priority;
alter table tasks alter column priority set default 'low';

drop type task_priority_old;
