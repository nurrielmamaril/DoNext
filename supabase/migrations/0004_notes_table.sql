-- Replaces the single freeform notes field on lists with a proper notes
-- table, so each category can hold multiple separate notes.
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid not null references lists (id) on delete cascade,
  title text,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_list_id_idx on notes (list_id);
create index notes_user_id_idx on notes (user_id);

create trigger notes_set_updated_at before update on notes
  for each row execute function set_updated_at();

alter table notes enable row level security;

create policy "notes: full access to own rows" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Carry over anything already typed into the old freeform field as a
-- single note per category, so nothing gets lost in the switch.
insert into notes (user_id, list_id, title, content)
select user_id, id, null, notes from lists where notes is not null and notes <> '';

alter table lists drop column notes;
