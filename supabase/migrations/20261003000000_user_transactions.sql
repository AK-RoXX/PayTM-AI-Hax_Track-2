-- User-owned transaction records and reusable transaction categories.
-- Seeded categories are global (user_id IS NULL); users may add their own.

create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  transaction_kind text not null check (transaction_kind in ('expense', 'income', 'transfer')),
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  constraint transaction_categories_system_owner_check
    check (not is_system or user_id is null)
);

create unique index if not exists idx_transaction_categories_global_slug
  on public.transaction_categories (slug) where user_id is null;
create unique index if not exists idx_transaction_categories_user_slug
  on public.transaction_categories (user_id, slug) where user_id is not null;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  category_id uuid references public.transaction_categories(id) on delete set null,
  description text not null check (length(trim(description)) between 1 and 500),
  merchant text check (merchant is null or length(merchant) <= 200),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  direction text not null check (direction in ('debit', 'credit', 'transfer')),
  status text not null default 'posted' check (status in ('pending', 'posted', 'reversed')),
  transaction_at timestamptz not null,
  payment_method text check (payment_method is null or payment_method in ('upi', 'card', 'bank_transfer', 'wallet', 'cash', 'other')),
  source text not null default 'manual' check (source in ('manual', 'paytm', 'bank', 'upi', 'import', 'other')),
  external_reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, transaction_at desc);
create index if not exists idx_transactions_user_category_date
  on public.transactions (user_id, category_id, transaction_at desc);
create index if not exists idx_transactions_case
  on public.transactions (case_id) where case_id is not null;
create unique index if not exists idx_transactions_source_reference
  on public.transactions (user_id, source, external_reference)
  where external_reference is not null;

create or replace function public.set_transaction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_transaction_updated_at();

alter table public.transaction_categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Users can read global and own transaction categories" on public.transaction_categories;
create policy "Users can read global and own transaction categories"
  on public.transaction_categories for select
  using (user_id is null or user_id = (select auth.uid()));

drop policy if exists "Users can create their own transaction categories" on public.transaction_categories;
create policy "Users can create their own transaction categories"
  on public.transaction_categories for insert
  with check (user_id = (select auth.uid()) and not is_system);

drop policy if exists "Users can update their own transaction categories" on public.transaction_categories;
create policy "Users can update their own transaction categories"
  on public.transaction_categories for update
  using (user_id = (select auth.uid()) and not is_system)
  with check (user_id = (select auth.uid()) and not is_system);

drop policy if exists "Users can delete their own transaction categories" on public.transaction_categories;
create policy "Users can delete their own transaction categories"
  on public.transaction_categories for delete
  using (user_id = (select auth.uid()) and not is_system);

drop policy if exists "Users can read their own transactions" on public.transactions;
create policy "Users can read their own transactions"
  on public.transactions for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can create their own transactions" on public.transactions;
create policy "Users can create their own transactions"
  on public.transactions for insert
  with check (
    user_id = (select auth.uid())
    and (
      case_id is null
      or exists (
        select 1 from public.cases c
        where c.id = case_id and c.user_id = (select auth.uid())
      )
    )
    and (
      category_id is null
      or exists (
        select 1 from public.transaction_categories tc
        where tc.id = category_id
          and (tc.user_id is null or tc.user_id = (select auth.uid()))
          and tc.transaction_kind = case direction
            when 'debit' then 'expense'
            when 'credit' then 'income'
            else 'transfer'
          end
      )
    )
  );

drop policy if exists "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions"
  on public.transactions for update
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      case_id is null
      or exists (
        select 1 from public.cases c
        where c.id = case_id and c.user_id = (select auth.uid())
      )
    )
    and (
      category_id is null
      or exists (
        select 1 from public.transaction_categories tc
        where tc.id = category_id
          and (tc.user_id is null or tc.user_id = (select auth.uid()))
          and tc.transaction_kind = case direction
            when 'debit' then 'expense'
            when 'credit' then 'income'
            else 'transfer'
          end
      )
    )
  );

drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (user_id = (select auth.uid()));

insert into public.transaction_categories (name, slug, transaction_kind, color, icon, is_system)
values
  ('Medical', 'medical', 'expense', '#e11d48', 'heart-pulse', true),
  ('Bills & Utilities', 'bills-utilities', 'expense', '#0284c7', 'receipt', true),
  ('Groceries', 'groceries', 'expense', '#16a34a', 'shopping-basket', true),
  ('Transport', 'transport', 'expense', '#7c3aed', 'bus', true),
  ('Shopping', 'shopping', 'expense', '#db2777', 'shopping-bag', true),
  ('Food & Dining', 'food-dining', 'expense', '#ea580c', 'utensils', true),
  ('Education', 'education', 'expense', '#4f46e5', 'book-open', true),
  ('Entertainment', 'entertainment', 'expense', '#9333ea', 'clapperboard', true),
  ('Income', 'income', 'income', '#059669', 'banknote', true),
  ('Transfer', 'transfer', 'transfer', '#64748b', 'arrow-left-right', true),
  ('Other', 'other', 'expense', '#64748b', 'circle-ellipsis', true)
on conflict do nothing;
