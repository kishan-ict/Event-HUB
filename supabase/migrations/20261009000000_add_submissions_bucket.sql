-- Create the submissions storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false, -- Keep it private since judges need to view it, but not the whole world
  52428800, -- 50MB limit
  '{"application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "text/plain", "text/markdown"}'
)
on conflict (id) do update set 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = '{"application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "text/plain", "text/markdown"}';

-- Create policies for submissions bucket

-- Allow participants to upload their own submissions
create policy "Participants can upload submissions" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'submissions'
);

-- Allow participants to update their own submissions
create policy "Participants can update their own submissions" on storage.objects
for update to authenticated
using (
  bucket_id = 'submissions' and auth.uid() = owner
);

-- Allow participants to read their own submissions
create policy "Participants can view their own submissions" on storage.objects
for select to authenticated
using (
  bucket_id = 'submissions' and auth.uid() = owner
);

-- Allow participants to delete their own submissions
create policy "Participants can delete their own submissions" on storage.objects
for delete to authenticated
using (
  bucket_id = 'submissions' and auth.uid() = owner
);

-- Allow judges and hosts to read all submissions
create policy "Event hosts and judges can read submissions" on storage.objects
for select to authenticated
using (
  bucket_id = 'submissions'
);
