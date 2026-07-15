-- Adds a freeform notes scratchpad to each list/category.
alter table lists add column notes text not null default '';
