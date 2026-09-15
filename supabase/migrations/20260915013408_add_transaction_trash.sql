alter table public.transactions
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_reason text
    check (deletion_reason is null or deletion_reason in ('user_deleted', 'replaced'));

create index if not exists idx_transactions_active_user_date
  on public.transactions (user_id, transaction_date desc, created_at desc)
  where deleted_at is null;

create index if not exists idx_transactions_trashed_user_date
  on public.transactions (user_id, deleted_at desc)
  where deleted_at is not null;

revoke delete on table public.transactions from authenticated;

create or replace view public.account_balances
with (security_invoker = true)
as
 SELECT account.id AS account_id,
    account.user_id,
    account.initial_balance + COALESCE(sum(
        CASE
            WHEN tx.status <> 'confirmed'::text THEN 0::numeric
            WHEN tx.type = 'income'::text AND tx.account_id = account.id THEN tx.amount
            WHEN tx.type = 'expense'::text AND tx.account_id = account.id THEN - tx.amount
            WHEN tx.type = 'transfer'::text AND tx.account_id = account.id THEN - tx.amount
            WHEN tx.type = 'transfer'::text AND tx.destination_account_id = account.id THEN tx.amount
            ELSE 0::numeric
        END), 0::numeric) AS current_balance
   FROM accounts account
     LEFT JOIN transactions tx ON (tx.account_id = account.id OR tx.destination_account_id = account.id) AND tx.deleted_at IS NULL
  GROUP BY account.id, account.user_id, account.initial_balance;;

create or replace view public.budget_summaries
with (security_invoker = true)
as
 SELECT budget.id,
    budget.user_id,
    budget.category_id,
    budget.period_start,
    budget.amount_limit,
    COALESCE(sum(transaction.amount) FILTER (WHERE transaction.type = 'expense'::text AND transaction.status = 'confirmed'::text AND transaction.transaction_date >= budget.period_start AND transaction.transaction_date < (budget.period_start + '1 mon'::interval)::date), 0::numeric)::numeric(14,2) AS spent_amount
   FROM budgets budget
     LEFT JOIN transactions transaction ON transaction.user_id = budget.user_id AND transaction.category_id = budget.category_id AND transaction.deleted_at IS NULL
  GROUP BY budget.id, budget.user_id, budget.category_id, budget.period_start, budget.amount_limit;;

create or replace view public.credit_card_summaries
with (security_invoker = true)
as
 SELECT card.id AS credit_card_id,
    card.user_id,
    card.total_limit,
    COALESCE(sum(
        CASE
            WHEN tx.type = 'expense'::text AND tx.status = 'confirmed'::text THEN tx.amount
            WHEN tx.type = 'card_payment'::text AND tx.status = 'confirmed'::text THEN - tx.amount
            ELSE 0::numeric
        END), 0::numeric)::numeric(14,2) AS outstanding_balance,
    (card.total_limit - COALESCE(sum(
        CASE
            WHEN tx.type = 'expense'::text AND tx.status = 'confirmed'::text THEN tx.amount
            WHEN tx.type = 'card_payment'::text AND tx.status = 'confirmed'::text THEN - tx.amount
            ELSE 0::numeric
        END), 0::numeric))::numeric(14,2) AS available_limit
   FROM credit_cards card
     LEFT JOIN transactions tx ON tx.credit_card_id = card.id AND tx.deleted_at IS NULL
  GROUP BY card.id, card.user_id, card.total_limit;;

CREATE OR REPLACE FUNCTION public.delete_credit_card_purchase(p_transaction_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_purchase public.transactions%rowtype;
  v_invoice_ids uuid[];
  v_deleted_count integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  select * into v_purchase from public.transactions
  where id = p_transaction_id and user_id = v_user_id and type = 'expense'
    and credit_card_id is not null and invoice_id is not null and deleted_at is null
  for update;
  if not found then raise exception 'Credit card purchase not found'; end if;

  select array_agg(distinct transaction.invoice_id) into v_invoice_ids
  from public.transactions transaction
  where transaction.user_id = v_user_id and transaction.deleted_at is null
    and ((v_purchase.installment_group_id is not null and transaction.installment_group_id = v_purchase.installment_group_id)
      or transaction.id = v_purchase.id);

  perform 1 from public.credit_card_invoices invoice
  where invoice.id = any(v_invoice_ids) and invoice.user_id = v_user_id for update;

  if exists (
    select 1 from public.transactions payment
    where payment.user_id = v_user_id and payment.type = 'card_payment'
      and payment.status = 'confirmed' and payment.deleted_at is null
      and payment.invoice_id = any(v_invoice_ids)
  ) then raise exception 'A purchase cannot be cancelled after one of its invoices has been paid'; end if;

  update public.transactions transaction set deleted_at = now(), deletion_reason = 'user_deleted'
  where transaction.user_id = v_user_id and transaction.deleted_at is null
    and transaction.type = 'expense' and transaction.credit_card_id is not null
    and ((v_purchase.installment_group_id is not null and transaction.installment_group_id = v_purchase.installment_group_id)
      or transaction.id = v_purchase.id);
  get diagnostics v_deleted_count = row_count;

  update public.credit_card_invoices invoice set status = 'open', paid_at = null
  where invoice.id = any(v_invoice_ids) and invoice.user_id = v_user_id;
  return v_deleted_count;
end;
$function$


CREATE OR REPLACE FUNCTION public.delete_credit_card_payment(p_transaction_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_payment public.transactions%rowtype;
  v_invoice public.credit_card_invoices%rowtype;
  v_remaining numeric(14,2);
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  select * into v_payment from public.transactions
  where id = p_transaction_id and user_id = v_user_id and type = 'card_payment'
    and invoice_id is not null and deleted_at is null for update;
  if not found then raise exception 'Invoice payment not found'; end if;
  select * into v_invoice from public.credit_card_invoices
  where id = v_payment.invoice_id and user_id = v_user_id for update;
  if not found then raise exception 'Invoice not found'; end if;

  update public.transactions set deleted_at = now(), deletion_reason = 'user_deleted'
  where id = v_payment.id and user_id = v_user_id and deleted_at is null;

  select coalesce(sum(case
      when type = 'expense' and status = 'confirmed' then amount
      when type = 'card_payment' and status = 'confirmed' then -amount
      else 0 end), 0)::numeric(14,2)
  into v_remaining from public.transactions
  where invoice_id = v_invoice.id and user_id = v_user_id and deleted_at is null;

  update public.credit_card_invoices
  set status = case when v_remaining <= 0 then 'paid' when due_date < current_date then 'overdue' else 'open' end,
      paid_at = case when v_remaining <= 0 then coalesce(paid_at, now()) else null end
  where id = v_invoice.id and user_id = v_user_id;
  return 1;
end;
$function$


CREATE OR REPLACE FUNCTION public.trash_transaction(p_transaction_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction public.transactions%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  select * into v_transaction from public.transactions
  where id = p_transaction_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_transaction.type = 'expense' and v_transaction.credit_card_id is not null and v_transaction.invoice_id is not null then
    return public.delete_credit_card_purchase(p_transaction_id);
  end if;
  if v_transaction.type = 'card_payment' and v_transaction.invoice_id is not null then
    return public.delete_credit_card_payment(p_transaction_id);
  end if;
  update public.transactions set deleted_at = now(), deletion_reason = 'user_deleted'
  where id = v_transaction.id and user_id = v_user_id and deleted_at is null;
  return 1;
end;
$function$


CREATE OR REPLACE FUNCTION public.restore_transaction(p_transaction_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction public.transactions%rowtype;
  v_invoice_ids uuid[];
  v_restored_count integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  select * into v_transaction from public.transactions
  where id = p_transaction_id and user_id = v_user_id and deleted_at is not null
    and deletion_reason = 'user_deleted' for update;
  if not found then raise exception 'Transaction not found in trash'; end if;

  if v_transaction.type = 'expense' and v_transaction.credit_card_id is not null and v_transaction.installment_group_id is not null then
    select array_agg(distinct invoice_id) into v_invoice_ids from public.transactions
    where user_id = v_user_id and installment_group_id = v_transaction.installment_group_id;
    update public.transactions set deleted_at = null, deletion_reason = null
    where user_id = v_user_id and installment_group_id = v_transaction.installment_group_id
      and deleted_at is not null and deletion_reason = 'user_deleted';
  else
    if v_transaction.invoice_id is not null then v_invoice_ids := array[v_transaction.invoice_id]; end if;
    update public.transactions set deleted_at = null, deletion_reason = null
    where id = v_transaction.id and user_id = v_user_id and deleted_at is not null
      and deletion_reason = 'user_deleted';
  end if;
  get diagnostics v_restored_count = row_count;

  if v_invoice_ids is not null then
    update public.credit_card_invoices invoice
    set status = case
        when coalesce((select sum(case
          when transaction.type = 'expense' and transaction.status = 'confirmed' then transaction.amount
          when transaction.type = 'card_payment' and transaction.status = 'confirmed' then -transaction.amount
          else 0 end)
          from public.transactions transaction
          where transaction.invoice_id = invoice.id and transaction.user_id = v_user_id
            and transaction.deleted_at is null), 0) <= 0 then 'paid'
        when invoice.due_date < current_date then 'overdue' else 'open' end,
      paid_at = case
        when coalesce((select sum(case
          when transaction.type = 'expense' and transaction.status = 'confirmed' then transaction.amount
          when transaction.type = 'card_payment' and transaction.status = 'confirmed' then -transaction.amount
          else 0 end)
          from public.transactions transaction
          where transaction.invoice_id = invoice.id and transaction.user_id = v_user_id
            and transaction.deleted_at is null), 0) <= 0 then coalesce(invoice.paid_at, now())
        else null end
    where invoice.id = any(v_invoice_ids) and invoice.user_id = v_user_id;
  end if;
  return v_restored_count;
end;
$function$


CREATE OR REPLACE FUNCTION public.pay_credit_card_invoice(p_invoice_id uuid, p_account_id uuid, p_payment_date date DEFAULT CURRENT_DATE)
 RETURNS transactions
 LANGUAGE plpgsql
SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_invoice public.credit_card_invoices%rowtype;
  v_remaining numeric(14,2);
  v_transaction public.transactions%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  select * into v_invoice from public.credit_card_invoices
  where id = p_invoice_id and user_id = v_user_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.status = 'paid' then raise exception 'This invoice has already been paid'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and is_archived = false) then
    raise exception 'Payment account not found';
  end if;
  select coalesce(sum(case
      when type = 'expense' and status = 'confirmed' then amount
      when type = 'card_payment' and status = 'confirmed' then -amount
      else 0 end), 0)::numeric(14,2)
  into v_remaining from public.transactions
  where invoice_id = v_invoice.id and user_id = v_user_id and deleted_at is null;
  if v_remaining <= 0 then raise exception 'There is no outstanding balance on this invoice'; end if;
  insert into public.transactions (user_id, type, description, amount, account_id, credit_card_id, invoice_id, transaction_date, status)
  values (v_user_id, 'card_payment', 'Pagamento da fatura', v_remaining, p_account_id, v_invoice.credit_card_id, v_invoice.id, coalesce(p_payment_date, current_date), 'confirmed')
  returning * into v_transaction;
  update public.credit_card_invoices set status = 'paid', paid_at = now() where id = v_invoice.id;
  return v_transaction;
end;
$function$


revoke execute on function public.delete_credit_card_purchase(uuid) from public, anon;
revoke execute on function public.delete_credit_card_payment(uuid) from public, anon;
revoke execute on function public.trash_transaction(uuid) from public, anon;
revoke execute on function public.restore_transaction(uuid) from public, anon;
revoke execute on function public.pay_credit_card_invoice(uuid, uuid, date) from public, anon;

grant execute on function public.delete_credit_card_purchase(uuid) to authenticated, service_role;
grant execute on function public.delete_credit_card_payment(uuid) to authenticated, service_role;
grant execute on function public.trash_transaction(uuid) to authenticated, service_role;
grant execute on function public.restore_transaction(uuid) to authenticated, service_role;
grant execute on function public.pay_credit_card_invoice(uuid, uuid, date) to authenticated, service_role;
