drop policy if exists "Art gallery public can view gallery images" on storage.objects;
drop policy if exists "Art gallery public can view gallery previews" on storage.objects;

create policy "Art gallery public can view gallery previews"
on storage.objects
for select
using (
  bucket_id = 'art-submissions'
  and (storage.foldername(name))[2] = 'preview'
);
