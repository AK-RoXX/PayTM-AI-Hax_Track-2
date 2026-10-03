-- Reviewed bill-line drafts and durable, case-scoped policy scenario snapshots.

alter table public.documents
  add column if not exists bill_line_items jsonb not null default '[]'::jsonb,
  add column if not exists bill_items_confirmed boolean not null default false,
  add column if not exists bill_items_confirmed_at timestamptz,
  add column if not exists bill_items_confirmed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_bill_line_items_is_array'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_bill_line_items_is_array
      check (jsonb_typeof(bill_line_items) = 'array');
  end if;
end;
$$;

create table if not exists public.policy_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  policy_document_id uuid not null references public.documents(id) on delete cascade,
  bill_document_id uuid not null references public.documents(id) on delete cascade,
  policy_uin text not null,
  product_id text not null,
  catalog_version text not null,
  status text not null default 'current' check (status in ('current', 'stale')),
  input_json jsonb not null,
  source_snapshot_json jsonb not null,
  result_json jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_policy_assessments_case_created
  on public.policy_assessments(case_id, created_at desc);
create index if not exists idx_policy_assessments_selected_bill
  on public.policy_assessments(case_id, bill_document_id, status);
create unique index if not exists idx_policy_assessments_one_current_per_case
  on public.policy_assessments(case_id) where status = 'current';

alter table public.policy_assessments enable row level security;

drop policy if exists "Users can view policy assessments for their own cases"
  on public.policy_assessments;
create policy "Users can view policy assessments for their own cases"
  on public.policy_assessments
  for select using (
    exists (
      select 1 from public.cases c
      where c.id = policy_assessments.case_id and c.user_id = auth.uid()
    )
  );

-- Writes go through the authenticated FastAPI service, which verifies case
-- ownership before using its private service-role credential.
