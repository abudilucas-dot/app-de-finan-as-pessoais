-- Historical installments paid before the account's opening balance belong to debt history only.
alter table public.debt_payments
  alter column transaction_id drop not null,
  add column is_historical boolean not null default false,
  add constraint debt_payment_historical_transaction_check
    check ((is_historical and transaction_id is null) or (not is_historical and transaction_id is not null));

-- A payment recorded for an earlier month pays that month's due installment.
create or replace function public.create_historical_debt_payment(
  p_debt_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_notes text default null
)
returns public.debt_payments
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.financial_debts;
  v_payment public.debt_payments;
  v_scheduled_due_date date;
  v_payment_month date;
  v_paid_for_due numeric(14,2);
  v_next_due_date date;
  v_next_month date;
  v_last_day integer;
begin
  if v_user_id is null then
    raise exception 'Sessão não encontrada';
  end if;
  if p_payment_date is null or p_payment_date >= current_date then
    raise exception 'Selecione uma data passada para um pagamento histórico';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Informe um pagamento maior que zero';
  end if;

  select * into v_debt
  from public.financial_debts
  where id = p_debt_id and user_id = v_user_id and status = 'active'
  for update;

  if not found then
    raise exception 'Dívida não encontrada ou indisponível';
  end if;
  if p_amount > v_debt.remaining_amount then
    raise exception 'O pagamento não pode ser maior que o saldo da dívida';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and is_archived = false
  ) then
    raise exception 'Conta de pagamento inválida';
  end if;

  v_scheduled_due_date := v_debt.next_due_date;

  if p_payment_date is not null
    and v_debt.due_day is not null
    and (v_scheduled_due_date is null or p_payment_date < v_scheduled_due_date) then
    v_payment_month := date_trunc('month', p_payment_date)::date;
    v_last_day := extract(day from (v_payment_month + interval '1 month - 1 day'))::integer;
    v_scheduled_due_date := make_date(
      extract(year from v_payment_month)::integer,
      extract(month from v_payment_month)::integer,
      least(v_debt.due_day, v_last_day)
    );
  end if;

  insert into public.debt_payments (
    user_id, debt_id, transaction_id, account_id, amount, payment_date, notes, scheduled_due_date, is_historical
  )
  values (
    v_user_id, v_debt.id, null, p_account_id, p_amount,
    p_payment_date, nullif(trim(coalesce(p_notes, '')), ''), v_scheduled_due_date, true
  )
  returning * into v_payment;

  select coalesce(sum(amount), 0) into v_paid_for_due
  from public.debt_payments
  where debt_id = v_debt.id
    and scheduled_due_date is not distinct from v_scheduled_due_date;

  if v_debt.remaining_amount - p_amount = 0 then
    update public.financial_debts
    set remaining_amount = 0, status = 'paid', next_due_date = null, updated_at = now()
    where id = v_debt.id;
  elsif v_scheduled_due_date is not null
    and v_debt.installment_amount is not null
    and v_paid_for_due >= v_debt.installment_amount then
    v_next_month := (date_trunc('month', v_scheduled_due_date)::date + interval '1 month')::date;
    v_last_day := extract(day from (v_next_month + interval '1 month - 1 day'))::integer;
    v_next_due_date := make_date(
      extract(year from v_next_month)::integer,
      extract(month from v_next_month)::integer,
      least(coalesce(v_debt.due_day, extract(day from v_scheduled_due_date)::integer), v_last_day)
    );

    update public.financial_debts
    set remaining_amount = remaining_amount - p_amount,
        next_due_date = v_next_due_date,
        status = 'active',
        updated_at = now()
    where id = v_debt.id;
  else
    update public.financial_debts
    set remaining_amount = remaining_amount - p_amount,
        status = 'active',
        updated_at = now()
    where id = v_debt.id;
  end if;

  return v_payment;
end;
$$;

create or replace function public.delete_debt_payment(p_payment_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment public.debt_payments;
begin
  if v_user_id is null then
    raise exception 'Sessão não encontrada';
  end if;

  select * into v_payment
  from public.debt_payments
  where id = p_payment_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Pagamento não encontrado';
  end if;

  if v_payment.transaction_id is not null then
    update public.transactions
    set deleted_at = now(), deletion_reason = 'user_deleted', updated_at = now()
    where id = v_payment.transaction_id and user_id = v_user_id;
  end if;

  delete from public.debt_payments where id = v_payment.id;

  update public.financial_debts
  set
    remaining_amount = least(initial_amount, remaining_amount + v_payment.amount),
    status = 'active',
    next_due_date = case
      when v_payment.scheduled_due_date is not null
        and (next_due_date is null or next_due_date > v_payment.scheduled_due_date)
      then v_payment.scheduled_due_date
      else next_due_date
    end,
    updated_at = now()
  where id = v_payment.debt_id and user_id = v_user_id;

  return 1;
end;
$$;


revoke all on function public.create_historical_debt_payment(uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.create_historical_debt_payment(uuid, uuid, numeric, date, text) to authenticated;
