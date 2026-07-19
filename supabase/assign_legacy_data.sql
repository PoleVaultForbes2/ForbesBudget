-- Run once after creating the account that should own the app's pre-login data.
-- Replace the UUID below with Authentication > Users > User UID from Supabase.
begin;

do $$
declare
  legacy_owner uuid := 'de65f7e7-eeeb-4ba9-8201-3aab58eb0ea1';
begin
  if not exists (select 1 from auth.users where id = legacy_owner) then
    raise exception 'Replace legacy_owner with a real Auth user UUID before running this script.';
  end if;

  -- Signing up can create an empty starter month before this script is run.
  -- Remove it only if it is untouched; never overwrite real account data.
  if exists (select 1 from public.months where user_id = legacy_owner) then
    if exists (
      select 1 from public.months m
      where m.user_id = legacy_owner
        and (
          m.monthly_income <> 0
          or exists (select 1 from public.transactions t where t.month_id = m.id)
          or exists (select 1 from public.categories c where c.month_id = m.id and coalesce(c.extra_funds, 0) <> 0)
        )
    ) then
      raise exception 'The destination account already has budget data; legacy assignment stopped without changes.';
    end if;
    delete from public.months where user_id = legacy_owner;
  end if;

  update public.months set user_id = legacy_owner where user_id is null;
  update public.categories set user_id = legacy_owner where user_id is null;
  update public.transactions set user_id = legacy_owner where user_id is null;

  -- Convert the single legacy savings tree from "shared" to the owner UUID.
  update public.savings_goals set user_id = legacy_owner where user_id is null;
  update public.savings_transactions set user_id = legacy_owner where user_id is null;

  if exists (select 1 from public.savings_state where id = 'shared' and user_id is null) then
    if exists (select 1 from public.savings_state where id = legacy_owner::text) then
      if exists (
        select 1 from public.savings_state
        where id = legacy_owner::text and (total_savings <> 0 or unallocated <> 0)
      ) or exists (
        select 1 from public.savings_goals where state_id = legacy_owner::text and balance <> 0
      ) or exists (
        select 1 from public.savings_transactions where state_id = legacy_owner::text
      ) then
        raise exception 'The destination account already has savings data; legacy assignment stopped without changes.';
      end if;
      delete from public.savings_state where id = legacy_owner::text;
    end if;

    insert into public.savings_state (id, user_id, total_savings, unallocated, updated_at)
    select legacy_owner::text, legacy_owner, total_savings, unallocated, updated_at
    from public.savings_state where id = 'shared';
    update public.savings_goals set state_id = legacy_owner::text where state_id = 'shared';
    update public.savings_transactions set state_id = legacy_owner::text where state_id = 'shared';
    delete from public.savings_state where id = 'shared';
  end if;
end $$;

commit;
