-- Part 1b — close the remaining open storage buckets
--
-- The "allow all 1cqvdzs_*" policies let anyone, without logging in, read, upload,
-- overwrite and delete files in isf-documents (Site360) and participant-resources
-- (Participant360). They are replaced by:
--   isf-documents         -> only users of the organisation that owns the site folder
--   participant-resources -> no access (empty, and unused by this codebase)

------------------------------------------------------------------------------
-- ISF documents store a storage path instead of a (non-working) public URL
------------------------------------------------------------------------------

alter table isf_documents add column if not exists file_path text;

update isf_documents
set file_path = substring(file_url from '/isf-documents/(.+)$')
where file_path is null and file_url like '%/isf-documents/%';

------------------------------------------------------------------------------
-- Storage policies
------------------------------------------------------------------------------

-- ISF files live under <site_id>/<file>; Site360 has one site per organisation.
create or replace function can_access_isf_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from sites s
    join user_roles ur on ur.org_id = s.org_id
    where s.id::text = split_part(p_name, '/', 1)
      and ur.user_id = auth.uid()
      and ur.is_active = true
  );
$$;

drop policy if exists "allow all 1cqvdzs_0" on storage.objects;
drop policy if exists "allow all 1cqvdzs_1" on storage.objects;
drop policy if exists "allow all 1cqvdzs_2" on storage.objects;
drop policy if exists "allow all 1cqvdzs_3" on storage.objects;

drop policy if exists "isf bucket read" on storage.objects;
create policy "isf bucket read" on storage.objects
  for select to authenticated
  using (bucket_id = 'isf-documents' and can_access_isf_file(name));

drop policy if exists "isf bucket upload" on storage.objects;
create policy "isf bucket upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'isf-documents' and can_access_isf_file(name));

drop policy if exists "isf bucket overwrite" on storage.objects;
create policy "isf bucket overwrite" on storage.objects
  for update to authenticated
  using (bucket_id = 'isf-documents' and can_access_isf_file(name))
  with check (bucket_id = 'isf-documents' and can_access_isf_file(name));

-- No delete policy: ISF originals are never removed.
