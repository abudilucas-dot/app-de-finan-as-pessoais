create or replace function public.replace_credit_card_purchase(
  p_transaction_id uuid,
  p_credit_card_id uuid,
  p_description text,
  p_amount numeric,
  p_category_id uuid,
  p_transaction_date date,
  p_total_installments smallint default 1,
  p_notes text default null
)
returns setof public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select installment_group_id into v_group_id
  from public.transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  perform public.delete_credit_card_purchase(p_transaction_id);

  update public.transactions
  set deletion_reason = 'replaced'
  where user_id = v_user_id
    and deleted_at is not null
    and deletion_reason = 'user_deleted'
    and (id = p_transaction_id or (v_group_id is not null and installment_group_id = v_group_id));

  return query
  select *
  from public.create_card_installment_expense(
    p_credit_card_id, p_description, p_amount, p_category_id,
    p_transaction_date, p_total_installments, p_notes
  );
end;
$$;

revoke execute on function public.replace_credit_card_purchase(uuid, uuid, text, numeric, uuid, date, smallint, text) from public, anon;
grant execute on function public.replace_credit_card_purchase(uuid, uuid, text, numeric, uuid, date, smallint, text) to authenticated, service_role;
