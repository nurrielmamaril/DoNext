-- Lets each category have an uploaded logo/photo.
alter table lists add column logo_url text;

-- Storage bucket for uploaded logos. Public so images can be displayed
-- without an auth header; write access is still restricted by the
-- policies below to each user's own folder (named by their user id).
insert into storage.buckets (id, name, public)
values ('category-logos', 'category-logos', true)
on conflict (id) do nothing;

create policy "category-logos: owners can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'category-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "category-logos: owners can update"
  on storage.objects for update
  using (
    bucket_id = 'category-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "category-logos: owners can delete"
  on storage.objects for delete
  using (
    bucket_id = 'category-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
