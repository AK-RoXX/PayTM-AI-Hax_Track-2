-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- ─── 1. Core Cases ────────────────────────────────────────────────────────
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_code text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  case_type text not null,
  status text not null check (status in ('intake', 'docs_pending', 'awaiting_hospital_verification', 'submitted', 'closed')),
  patient_relation text,
  hospital_name text,
  language_pref text not null default 'english',
  estimated_bill numeric,
  estimated_coverage numeric,
  estimated_gap numeric check (estimated_gap >= 0),
  readiness_score int check (readiness_score >= 0 and readiness_score <= 100),
  next_action text,
  cognee_dataset text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 2. Documents & Knowledge ──────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  page_count int,
  processing_status text not null check (processing_status in ('uploaded', 'processing', 'done', 'failed')),
  error_message text,
  uploaded_at timestamptz not null default now()
);

-- Notice: we added an "embedding" column of type vector(768) (or 1024, adjust as per Sarvam AI) 
-- because the user explicitly requested storing embeddings in Supabase via pgvector.
create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  chunk_index int not null,
  page_number int,
  clause_label text,
  text text not null,
  embedding vector(1024), -- Assuming 1024 dims for embeddings, change if your model differs
  synced_to_cognee boolean not null default false
);

create table if not exists public.case_facts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  fact_key text not null,
  value_json jsonb not null,
  value_type text not null check (value_type in ('money', 'text', 'bool', 'date', 'number')),
  verification_status text not null check (verification_status in ('extracted', 'verified', 'needs_review', 'conflict')),
  source_page int,
  source_quote text,
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1),
  extracted_at timestamptz not null default now(),
  unique (case_id, document_id, fact_key)
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  fact_id uuid references public.case_facts(id) on delete cascade,
  chunk_id uuid references public.chunks(id) on delete set null,
  claim_text text not null,
  document_name text,
  page_number int,
  quote text not null,
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

-- ─── 3. Activity ──────────────────────────────────────────────────────────
create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  event_type text not null,
  actor text not null check (actor in ('user', 'system', 'n8n', 'insurer')),
  payload_json jsonb,
  occurred_at timestamptz not null default now()
);
create index idx_case_events_case_id on public.case_events(case_id, occurred_at);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  action_type text not null,
  status text not null check (status in ('suggested', 'confirmed', 'done', 'cancelled')),
  requires_user_confirmation boolean not null default false,
  reason text,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  language text,
  abstained boolean not null default false,
  evidence_json jsonb,
  created_at timestamptz not null default now()
);

-- ─── 4. Rules Lookup ──────────────────────────────────────────────────────
create table if not exists public.document_requirements (
  id serial primary key,
  case_type text not null,
  document_type text not null,
  label text not null,
  weight int not null,
  partial_credit int not null default 0,
  unique (case_type, document_type)
);

-- ─── Triggers & Security ──────────────────────────────────────────────────

-- Automatically update updated_at on cases
create or replace function update_cases_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_cases_updated_at
before update on public.cases
for each row execute procedure update_cases_updated_at();

-- Enable RLS (Row Level Security)
-- For the demo we'll enable RLS but create open policies, 
-- or you can lock them down by uncommenting the `auth.uid() = user_id` rules.

alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.case_facts enable row level security;

create policy "Users can view their own cases" on public.cases
  for select using (auth.uid() = user_id);
create policy "Users can create their own cases" on public.cases
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own cases" on public.cases
  for update using (auth.uid() = user_id);

-- documents
create policy "Users can view docs for their cases" on public.documents
  for select using (
    exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
  );
create policy "Users can insert docs for their cases" on public.documents
  for insert with check (
    exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
  );
create policy "Users can update docs for their cases" on public.documents
  for update using (
    exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid())
  );

-- Note: In a production app you would do the same strict RLS for chunks, facts, etc.
-- For local/demo, you might temporarily use: `create policy "all" on table for all using (true);`
