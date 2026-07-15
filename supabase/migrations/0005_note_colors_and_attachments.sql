-- Lets notes be color-tagged for quick visual grouping.
alter table notes add column color text;

-- File attachments (images, video, documents, anything) on either a task
-- or a note. Exactly one parent is set per row.
create table attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references tasks (id) on delete cascade,
  note_id uuid references notes (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  created_at timestamptz not null default now(),
  constraint attachments_one_parent check (
    (task_id is not null and note_id is null) or (task_id is null and note_id is not null)
  )
);

create index attachments_task_id_idx on attachments (task_id);
create index attachments_note_id_idx on attachments (note_id);

alter table attachments enable row level security;

create policy "attachments: full access to own rows" on attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for the actual uploaded files.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "attachments bucket: owners can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments bucket: owners can update"
  on storage.objects for update
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments bucket: owners can delete"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
