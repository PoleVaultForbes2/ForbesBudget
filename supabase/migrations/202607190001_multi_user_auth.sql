-- Multi-user authentication and strict per-user data isolation.
-- Apply this once in the Supabase SQL editor before deploying the matching frontend.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(btrim(username)) between 2 and 40),
  partner_name text not null default 'Partner' check (char_length(btrim(partner_name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  requested_username text;
begin
  requested_username := btrim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'User'));
  if char_length(requested_username) < 2 then
    requested_username := 'User';
  end if;

  insert into public.profiles (user_id, username, partner_name)
  values (new.id, left(requested_username, 40), 'Partner')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.months add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.categories add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.savings_state add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.savings_goals add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.savings_transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- month_key used to be globally unique. It is now unique only inside an account.
alter table public.months drop constraint if exists months_month_key_key;
create unique index if not exists months_user_month_key_idx
  on public.months(user_id, month_key) where user_id is not null;

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists savings_state_user_id_idx on public.savings_state(user_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals(user_id);
create index if not exists savings_transactions_user_id_idx on public.savings_transactions(user_id);

-- A savings state id is now the authenticated user's UUID as text, not the old literal "shared".
alter table public.savings_state drop constraint if exists savings_state_id_check;

alter table public.profiles enable row level security;
alter table public.months enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_state enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_transactions enable row level security;

-- RLS is the primary boundary; privileges also prevent anonymous table access entirely.
revoke all on table public.profiles, public.months, public.categories, public.transactions,
  public.savings_state, public.savings_goals, public.savings_transactions from anon;
grant select, insert, update, delete on table public.profiles, public.months, public.categories,
  public.transactions, public.savings_state, public.savings_goals, public.savings_transactions
  to authenticated;

-- Remove the original anonymous-access policies.
drop policy if exists "Allow all access to months" on public.months;
drop policy if exists "Allow all access to categories" on public.categories;
drop policy if exists "Allow all access to transactions" on public.transactions;
drop policy if exists "Allow all access to savings_state" on public.savings_state;
drop policy if exists "Allow all access to savings_goals" on public.savings_goals;
drop policy if exists "Allow all access to savings_transactions" on public.savings_transactions;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own months" on public.months;
create policy "Users manage their own months" on public.months
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own categories" on public.categories;
create policy "Users manage their own categories" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.months
      where months.id = categories.month_id
        and months.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own transactions" on public.transactions;
create policy "Users manage their own transactions" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.months
      where months.id = transactions.month_id
        and months.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own savings state" on public.savings_state;
create policy "Users manage their own savings state" on public.savings_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and id = (select auth.uid())::text);

drop policy if exists "Users manage their own savings goals" on public.savings_goals;
create policy "Users manage their own savings goals" on public.savings_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and state_id = (select auth.uid())::text
    and exists (
      select 1 from public.savings_state
      where savings_state.id = savings_goals.state_id
        and savings_state.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own savings transactions" on public.savings_transactions;
create policy "Users manage their own savings transactions" on public.savings_transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and state_id = (select auth.uid())::text
    and exists (
      select 1 from public.savings_state
      where savings_state.id = savings_transactions.state_id
        and savings_state.user_id = (select auth.uid())
    )
  );

-- Existing rows deliberately remain unowned and become invisible after this migration.
-- After creating the original owner's Auth account, preserve their existing data by running
-- supabase/assign_legacy_data.sql with that account's UUID.
