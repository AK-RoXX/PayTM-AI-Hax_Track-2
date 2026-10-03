-- Row level security for the claim workflow tables.
--
-- case_facts had RLS enabled but no policies, so the signed-in user could not
-- read their own extracted facts. evidence_items, case_events and actions had
-- RLS disabled entirely, which left them readable with the public anon key by
-- anyone. Every one of these tables is scoped through public.cases, so a user
-- can only ever see rows belonging to a claim they own.

alter table public.case_facts enable row level security;
alter table public.evidence_items enable row level security;
alter table public.case_events enable row level security;
alter table public.actions enable row level security;

drop policy if exists "Users can view facts for their own cases" on public.case_facts;
create policy "Users can view facts for their own cases" on public.case_facts
  for select using (
    exists (
      select 1 from public.cases c
      where c.id = case_facts.case_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can access evidence for their own cases" on public.evidence_items;
create policy "Users can access evidence for their own cases" on public.evidence_items
  for all
  using (
    exists (
      select 1 from public.cases c
      where c.id = evidence_items.case_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cases c
      where c.id = evidence_items.case_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view events for their own cases" on public.case_events;
create policy "Users can view events for their own cases" on public.case_events
  for select using (
    exists (
      select 1 from public.cases c
      where c.id = case_events.case_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can access actions for their own cases" on public.actions;
create policy "Users can access actions for their own cases" on public.actions
  for all
  using (
    exists (
      select 1 from public.cases c
      where c.id = actions.case_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cases c
      where c.id = actions.case_id and c.user_id = auth.uid()
    )
  );