-- Debt payments are expenses and must satisfy transactions_shape_check.
insert into public.categories (name, type, icon, color, is_default)
select 'Dívidas', 'expense', 'Landmark', '#d97706', true
where not exists (
  select 1
  from public.categories
  where user_id is null
    and type = 'expense'
    and lower(name) = lower('Dívidas')
);

create or replace function public.create_debt_payment(
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
  v_transaction_id uuid;
  v_category_id uuid;
  v_scheduled_due_date date;
  v_paid_for_due numeric(14,2);
  v_next_due_date date;
  v_next_month date;
  v_last_day integer;
begin
  if v_user_id is null then
    raise exception 'Sessão não encontrada';
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

  select id
    into v_category_id
    from public.categories
   where user_id is null
     and type = 'expense'
     and is_default = true
     and lower(name) = lower('Dívidas')
   limit 1;

  if v_category_id is null then
    raise exception 'Categoria padrão de dívidas não encontrada';
  end if;

  v_scheduled_due_date := v_debt.next_due_date;

  insert into public.transactions (
    user_id, type, description, amount, category_id, account_id, transaction_date, status, notes, debt_id
  )
  values (
    v_user_id, 'expense', 'Pagamento: ' || v_debt.name, p_amount, v_category_id, p_account_id,
    coalesce(p_payment_date, current_date), 'confirmed', nullif(trim(coalesce(p_notes, '')), ''), v_debt.id
  )
  returning id into v_transaction_id;

  insert into public.debt_payments (
    user_id, debt_id, transaction_id, account_id, amount, payment_date, notes, scheduled_due_date
  )
  values (
    v_user_id, v_debt.id, v_transaction_id, p_account_id, p_amount,
    coalesce(p_payment_date, current_date), nullif(trim(coalesce(p_notes, '')), ''), v_scheduled_due_date
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
