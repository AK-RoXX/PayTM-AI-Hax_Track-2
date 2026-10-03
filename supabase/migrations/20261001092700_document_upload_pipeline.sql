create extension if not exists vector;

alter table public.documents
  add column if not exists processing_provider text;

alter table public.chunks
  add column if not exists embedding_384 vector(384);

create index if not exists idx_chunks_embedding_384
  on public.chunks using hnsw (embedding_384 vector_cosine_ops)
  where embedding_384 is not null;

create policy "Users can access chunks for their own cases" on public.chunks
  for all
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;