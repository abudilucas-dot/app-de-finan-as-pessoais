create table public.financial_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  institution text,
  initial_amount numeric(14,2) not null check (initial_amount > 0),
  remaining_amount numeric(14,2) not null check (remaining_amount >= 0 and remaining_amount <= initial_amount),
  interest_rate numeric(7,4) check (interest_rate is null or interest_rate >= 0),
  installment_amount numeric(14,2) check (installment_amount is null or installment_amount > 0),
  total_installments smallint check (total_installments is null or total_installments > 0),
  due_day smallint check (due_day is null or due_day between 1 and 31),
  next_due_date date,
  notes text check (notes is null or char_length(notes) <= 1000),
  color text,
  status text not null default 'active' check (status in ('active', 'paid', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index financial_debts_user_id_idx on public.financial_debts(user_id);
create index financial_debts_user_status_idx on public.financial_debts(user_id, status);

alter table public.transactions
  add column debt_id uuid references public.financial_debts(id) on delete set null;
create index transactions_debt_id_idx on public.transactions(debt_id);

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.financial_debts(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index debt_payments_user_id_idx on public.debt_payments(user_id);
create index debt_payments_debt_id_idx on public.debt_payments(debt_id);

alter table public.financial_debts enable row level security;
alter table public.debt_payments enable row level security;

create policy "Users manage own financial debts"
on public.financial_debts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own debt payments"
on public.debt_payments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.financial_debts to authenticated;
grant select, insert, update, delete on public.debt_payments to authenticated;

create or replace view public.financial_debt_summaries
with (security_invoker = true)
as
select
  d.*,
  coalesce((select count(*) from public.debt_payments p where p.debt_id = d.id), 0)::integer as payment_count
from public.financial_debts d;

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

  insert into public.transactions (
    user_id, type, description, amount, account_id, transaction_date, status, notes, debt_id
  )
  values (
    v_user_id, 'expense', 'Pagamento: ' || v_debt.name, p_amount, p_account_id,
    coalesce(p_payment_date, current_date), 'confirmed', nullif(trim(coalesce(p_notes, '')), ''), v_debt.id
  )
  returning id into v_transaction_id;

  insert into public.debt_payments (
    user_id, debt_id, transaction_id, account_id, amount, payment_date, notes
  )
  values (
    v_user_id, v_debt.id, v_transaction_id, p_account_id, p_amount,
    coalesce(p_payment_date, current_date), nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_payment;

  update public.financial_debts
  set
    remaining_amount = remaining_amount - p_amount,
    status = case when remaining_amount - p_amount = 0 then 'paid' else 'active' end,
    updated_at = now()
  where id = v_debt.id;

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

  update public.transactions
  set deleted_at = now(), deletion_reason = 'user_deleted', updated_at = now()
  where id = v_payment.transaction_id and user_id = v_user_id;

  delete from public.debt_payments where id = v_payment.id;

  update public.financial_debts
  set
    remaining_amount = least(initial_amount, remaining_amount + v_payment.amount),
    status = 'active',
    updated_at = now()
  where id = v_payment.debt_id and user_id = v_user_id;

  return 1;
end;
$$;

revoke all on function public.create_debt_payment(uuid, uuid, numeric, date, text) from public;
grant execute on function public.create_debt_payment(uuid, uuid, numeric, date, text) to authenticated;
revoke all on function public.delete_debt_payment(uuid) from public;
grant execute on function public.delete_debt_payment(uuid) to authenticated;
