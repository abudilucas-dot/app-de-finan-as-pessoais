-- Safely cancel only the unpaid portion of a credit-card purchase.
-- Paid invoice history remains immutable, while open installments are soft-deleted.
create or replace function public.delete_credit_card_purchase(p_transaction_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_purchase public.transactions%rowtype;
  v_invoice_ids uuid[];
  v_invoice_id uuid;
  v_deleted_count integer := 0;
  v_remaining numeric(14,2);
  v_has_payment boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select * into v_purchase
  from public.transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and type = 'expense'
    and credit_card_id is not null
    and invoice_id is not null
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Credit card purchase not found';
  end if;

  perform 1
  from public.transactions purchase
  where purchase.user_id = v_user_id
    and purchase.deleted_at is null
    and purchase.type = 'expense'
    and purchase.credit_card_id is not null
    and (
      (v_purchase.installment_group_id is not null and purchase.installment_group_id = v_purchase.installment_group_id)
      or purchase.id = v_purchase.id
    )
  for update;

  select array_agg(distinct purchase.invoice_id)
  into v_invoice_ids
  from public.transactions purchase
  where purchase.user_id = v_user_id
    and purchase.deleted_at is null
    and purchase.type = 'expense'
    and purchase.credit_card_id is not null
    and (
      (v_purchase.installment_group_id is not null and purchase.installment_group_id = v_purchase.installment_group_id)
      or purchase.id = v_purchase.id
    );

  perform 1
  from public.credit_card_invoices invoice
  where invoice.id = any(v_invoice_ids)
    and invoice.user_id = v_user_id
  for update;

  update public.transactions purchase
  set deleted_at = now(),
      deletion_reason = 'user_deleted'
  where purchase.user_id = v_user_id
    and purchase.deleted_at is null
    and purchase.type = 'expense'
    and purchase.credit_card_id is not null
    and (
      (v_purchase.installment_group_id is not null and purchase.installment_group_id = v_purchase.installment_group_id)
      or purchase.id = v_purchase.id
    )
    and not exists (
      select 1
      from public.transactions payment
      where payment.user_id = v_user_id
        and payment.type = 'card_payment'
        and payment.status = 'confirmed'
        and payment.deleted_at is null
        and payment.invoice_id = purchase.invoice_id
    );

  get diagnostics v_deleted_count = row_count;

  foreach v_invoice_id in array coalesce(v_invoice_ids, '{}'::uuid[]) loop
    select exists (
      select 1
      from public.transactions payment
      where payment.user_id = v_user_id
        and payment.type = 'card_payment'
        and payment.status = 'confirmed'
        and payment.deleted_at is null
        and payment.invoice_id = v_invoice_id
    )
    into v_has_payment;

    select coalesce(sum(
      case
        when transaction.type = 'expense' and transaction.status = 'confirmed' then transaction.amount
        when transaction.type = 'card_payment' and transaction.status = 'confirmed' then -transaction.amount
        else 0
      end
    ), 0)::numeric(14,2)
    into v_remaining
    from public.transactions transaction
    where transaction.user_id = v_user_id
      and transaction.invoice_id = v_invoice_id
      and transaction.deleted_at is null;

    update public.credit_card_invoices invoice
    set status = case
          when v_has_payment and v_remaining <= 0 then 'paid'
          when v_remaining > 0 and invoice.due_date < current_date then 'overdue'
          else 'open'
        end,
        paid_at = case
          when v_has_payment and v_remaining <= 0 then coalesce(invoice.paid_at, now())
          else null
        end
    where invoice.id = v_invoice_id
      and invoice.user_id = v_user_id;
  end loop;

  return v_deleted_count;
end;
$$;

-- Deleted purchases must no longer consume available credit on future purchases.
create or replace function public.enforce_credit_card_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_total_limit numeric(14,2);
  v_used_limit numeric(14,2);
begin
  if new.type <> 'expense' or new.credit_card_id is null or new.status <> 'confirmed' then
    return new;
  end if;

  select total_limit into v_total_limit
  from public.credit_cards
  where id = new.credit_card_id
  for update;

  if not found then
    raise exception 'Credit card not found';
  end if;

  select coalesce(sum(
    case
      when type = 'expense' and status = 'confirmed' then amount
      when type = 'card_payment' and status = 'confirmed' then -amount
      else 0
    end
  ), 0)::numeric(14,2)
  into v_used_limit
  from public.transactions
  where credit_card_id = new.credit_card_id
    and id is distinct from new.id
    and deleted_at is null;

  if v_used_limit + new.amount > v_total_limit then
    raise exception 'This purchase exceeds the available card limit';
  end if;

  return new;
end;
$$;