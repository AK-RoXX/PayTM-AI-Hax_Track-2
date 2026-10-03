alter table public.messages enable row level security;

create policy "Users can access messages for their own cases" on public.messages
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

create or replace function public.create_claim_with_intake(
  p_case_code text,
  p_patient_relation text,
  p_hospital_name text,
  p_estimated_bill numeric,
  p_language_pref text,
  p_initial_message text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  new_case_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if nullif(trim(p_initial_message), '') is null then
    raise exception 'Describe the situation before creating a claim.' using errcode = '22023';
  end if;

  if p_estimated_bill is not null and p_estimated_bill < 0 then
    raise exception 'Estimated bill cannot be negative.' using errcode = '22023';
  end if;

  insert into public.cases (
    case_code,
    user_id,
    case_type,
    status,
    patient_relation,
    hospital_name,
    language_pref,
    estimated_bill
  ) values (
    p_case_code,
    auth.uid(),
    'medical_claim',
    'intake',
    nullif(trim(p_patient_relation), ''),
    nullif(trim(p_hospital_name), ''),
    coalesce(nullif(trim(p_language_pref), ''), 'english'),
    p_estimated_bill
  )
  returning id into new_case_id;

  insert into public.messages (case_id, role, content, language)
  values (new_case_id, 'user', trim(p_initial_message), p_language_pref);

  return new_case_id;
end;
$$;

revoke all on function public.create_claim_with_intake(text, text, text, numeric, text, text) from public;
grant execute on function public.create_claim_with_intake(text, text, text, numeric, text, text) to authenticated;