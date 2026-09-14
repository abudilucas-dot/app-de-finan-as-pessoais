create or replace function public.validate_debit_card_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.accounts
    where id = new.account_id
      and user_id = new.user_id
  ) then
    raise exception 'A conta vinculada deve pertencer ao mesmo usuário do cartão de débito.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_debit_card_account on public.debit_cards;
create trigger validate_debit_card_account
before insert or update of account_id, user_id on public.debit_cards
for each row
execute function public.validate_debit_card_account();

revoke all on function public.validate_debit_card_account() from public, anon;
grant execute on function public.validate_debit_card_account() to authenticated, service_role;
