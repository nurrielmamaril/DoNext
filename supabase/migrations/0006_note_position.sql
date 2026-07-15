-- Lets notes be manually reordered via drag-and-drop, same as lists and tasks.
alter table notes add column position integer not null default 0;

-- Give existing notes a sensible starting order (most recently updated first,
-- matching the old default sort) so nothing appears to jump around.
with ordered as (
  select id, row_number() over (partition by list_id order by updated_at desc) - 1 as rn
  from notes
)
update notes set position = ordered.rn from ordered where notes.id = ordered.id;
