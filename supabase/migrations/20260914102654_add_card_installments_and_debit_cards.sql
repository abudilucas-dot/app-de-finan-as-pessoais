-- Foundation 03.1: installments reserve the whole credit-card limit and debit
-- cards are presentation/payment-method records tied to one bank account.

CREATE TABLE public.debit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  institution TEXT,
  brand TEXT,
  color TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debit_cards_user_id ON public.debit_cards(user_id);
CREATE INDEX idx_debit_cards_account_id ON public.debit_cards(account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debit_cards TO authenticated;
GRANT ALL ON public.debit_cards TO service_role;
ALTER TABLE public.debit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debit_cards_select_own" ON public.debit_cards FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "debit_cards_insert_own" ON public.debit_cards FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "debit_cards_update_own" ON public.debit_cards FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "debit_cards_delete_own" ON public.debit_cards FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE TRIGGER debit_cards_set_updated_at BEFORE UPDATE ON public.debit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transactions
  ADD COLUMN debit_card_id UUID REFERENCES public.debit_cards(id) ON DELETE RESTRICT,
  ADD COLUMN installment_group_id UUID,
  ADD COLUMN installment_number SMALLINT,
  ADD COLUMN total_installments SMALLINT;

ALTER TABLE public.transactions DROP CONSTRAINT transactions_shape_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_shape_check CHECK (
    (
      type = 'income'
      AND category_id IS NOT NULL
      AND account_id IS NOT NULL
      AND destination_account_id IS NULL
      AND credit_card_id IS NULL
      AND debit_card_id IS NULL
      AND invoice_id IS NULL
    )
    OR
    (
      type = 'expense'
      AND category_id IS NOT NULL
      AND destination_account_id IS NULL
      AND (
        (account_id IS NOT NULL AND credit_card_id IS NULL AND invoice_id IS NULL)
        OR
        (account_id IS NULL AND credit_card_id IS NOT NULL AND invoice_id IS NOT NULL AND debit_card_id IS NULL)
      )
    )
    OR
    (
      type = 'transfer'
      AND category_id IS NULL
      AND account_id IS NOT NULL
      AND destination_account_id IS NOT NULL
      AND destination_account_id <> account_id
      AND credit_card_id IS NULL
      AND debit_card_id IS NULL
      AND invoice_id IS NULL
    )
    OR
    (
      type = 'card_payment'
      AND category_id IS NULL
      AND account_id IS NOT NULL
      AND destination_account_id IS NULL
      AND credit_card_id IS NOT NULL
      AND debit_card_id IS NULL
      AND invoice_id IS NOT NULL
    )
  ),
  ADD CONSTRAINT transactions_installment_shape_check CHECK (
    (
      installment_group_id IS NULL
      AND installment_number IS NULL
      AND total_installments IS NULL
    )
    OR
    (
      type = 'expense'
      AND credit_card_id IS NOT NULL
      AND invoice_id IS NOT NULL
      AND debit_card_id IS NULL
      AND installment_group_id IS NOT NULL
      AND total_installments BETWEEN 1 AND 60
      AND installment_number BETWEEN 1 AND total_installments
    )
  );

CREATE INDEX idx_transactions_debit_card_id
  ON public.transactions(debit_card_id)
  WHERE debit_card_id IS NOT NULL;
CREATE INDEX idx_transactions_installment_group_id
  ON public.transactions(installment_group_id)
  WHERE installment_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_transaction_relations()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  category_kind TEXT;
  invoice_card_id UUID;
  debit_account_id UUID;
BEGIN
  IF NEW.account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = NEW.account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'The source account does not belong to this user';
  END IF;

  IF NEW.destination_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = NEW.destination_account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'The destination account does not belong to this user';
  END IF;

  IF NEW.credit_card_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.credit_cards
    WHERE id = NEW.credit_card_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'The credit card does not belong to this user';
  END IF;

  IF NEW.debit_card_id IS NOT NULL THEN
    SELECT account_id INTO debit_account_id
    FROM public.debit_cards
    WHERE id = NEW.debit_card_id AND user_id = NEW.user_id AND is_archived = false;

    IF debit_account_id IS NULL OR debit_account_id <> NEW.account_id THEN
      RAISE EXCEPTION 'The debit card must belong to the selected account';
    END IF;
  END IF;

  IF NEW.invoice_id IS NOT NULL THEN
    SELECT credit_card_id INTO invoice_card_id
    FROM public.credit_card_invoices
    WHERE id = NEW.invoice_id AND user_id = NEW.user_id;

    IF invoice_card_id IS NULL OR invoice_card_id <> NEW.credit_card_id THEN
      RAISE EXCEPTION 'The invoice is invalid for this credit card';
    END IF;
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT type INTO category_kind
    FROM public.categories
    WHERE id = NEW.category_id
      AND (user_id IS NULL OR user_id = NEW.user_id);

    IF category_kind IS NULL OR category_kind <> NEW.type THEN
      RAISE EXCEPTION 'The category is invalid for this transaction';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Creates all installments up front. Each installment stays associated with the
-- correct future invoice, while the original purchase date preserves reporting
-- and budget attribution at the moment of purchase.
CREATE OR REPLACE FUNCTION public.create_card_installment_expense(
  p_credit_card_id UUID,
  p_description TEXT,
  p_amount NUMERIC,
  p_category_id UUID,
  p_transaction_date DATE,
  p_total_installments SMALLINT DEFAULT 1,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_card public.credit_cards;
  v_invoice_id UUID;
  v_transaction public.transactions;
  v_group_id UUID := gen_random_uuid();
  v_cycle_end DATE;
  v_cycle_start DATE;
  v_due_date DATE;
  v_month_start DATE;
  v_previous_month_start DATE;
  v_due_month_start DATE;
  v_installment_date DATE;
  v_last_day INTEGER;
  v_installment_number SMALLINT;
  v_base_amount NUMERIC(14,2);
  v_installment_amount NUMERIC(14,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_description IS NULL OR char_length(trim(p_description)) = 0 THEN
    RAISE EXCEPTION 'A description is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'The amount must be greater than zero';
  END IF;
  IF p_transaction_date IS NULL THEN
    RAISE EXCEPTION 'A purchase date is required';
  END IF;
  IF p_total_installments IS NULL OR p_total_installments NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'The number of installments must be between 1 and 60';
  END IF;

  SELECT * INTO v_card
  FROM public.credit_cards
  WHERE id = p_credit_card_id AND user_id = v_user_id AND is_archived = false
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit card not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = p_category_id
      AND type = 'expense'
      AND (user_id IS NULL OR user_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'The category is invalid for this expense';
  END IF;

  v_base_amount := trunc(p_amount / p_total_installments, 2);

  FOR v_installment_number IN 1..p_total_installments LOOP
    v_installment_date := (p_transaction_date + make_interval(months => v_installment_number - 1))::date;
    v_installment_amount := CASE
      WHEN v_installment_number = p_total_installments
        THEN p_amount - (v_base_amount * (p_total_installments - 1))
      ELSE v_base_amount
    END;

    v_month_start := date_trunc('month', v_installment_date)::date;
    v_last_day := EXTRACT(day FROM (v_month_start + INTERVAL '1 month - 1 day'))::integer;
    IF EXTRACT(day FROM v_installment_date)::integer <= LEAST(v_card.closing_day, v_last_day) THEN
      v_cycle_end := make_date(
        EXTRACT(year FROM v_month_start)::integer,
        EXTRACT(month FROM v_month_start)::integer,
        LEAST(v_card.closing_day, v_last_day)
      );
    ELSE
      v_month_start := (v_month_start + INTERVAL '1 month')::date;
      v_last_day := EXTRACT(day FROM (v_month_start + INTERVAL '1 month - 1 day'))::integer;
      v_cycle_end := make_date(
        EXTRACT(year FROM v_month_start)::integer,
        EXTRACT(month FROM v_month_start)::integer,
        LEAST(v_card.closing_day, v_last_day)
      );
    END IF;

    v_previous_month_start := (date_trunc('month', v_cycle_end)::date - INTERVAL '1 month')::date;
    v_last_day := EXTRACT(day FROM (v_previous_month_start + INTERVAL '1 month - 1 day'))::integer;
    v_cycle_start := make_date(
      EXTRACT(year FROM v_previous_month_start)::integer,
      EXTRACT(month FROM v_previous_month_start)::integer,
      LEAST(v_card.closing_day, v_last_day)
    ) + 1;

    v_due_month_start := date_trunc('month', v_cycle_end)::date;
    v_last_day := EXTRACT(day FROM (v_due_month_start + INTERVAL '1 month - 1 day'))::integer;
    v_due_date := make_date(
      EXTRACT(year FROM v_due_month_start)::integer,
      EXTRACT(month FROM v_due_month_start)::integer,
      LEAST(v_card.due_day, v_last_day)
    );
    IF v_due_date <= v_cycle_end THEN
      v_due_month_start := (v_due_month_start + INTERVAL '1 month')::date;
      v_last_day := EXTRACT(day FROM (v_due_month_start + INTERVAL '1 month - 1 day'))::integer;
      v_due_date := make_date(
        EXTRACT(year FROM v_due_month_start)::integer,
        EXTRACT(month FROM v_due_month_start)::integer,
        LEAST(v_card.due_day, v_last_day)
      );
    END IF;

    INSERT INTO public.credit_card_invoices (
      user_id, credit_card_id, cycle_start, cycle_end, due_date
    ) VALUES (
      v_user_id, v_card.id, v_cycle_start, v_cycle_end, v_due_date
    )
    ON CONFLICT (credit_card_id, cycle_start) DO UPDATE
      SET updated_at = now()
    RETURNING id INTO v_invoice_id;

    INSERT INTO public.transactions (
      user_id, type, description, amount, category_id, account_id,
      credit_card_id, invoice_id, transaction_date, status, notes,
      installment_group_id, installment_number, total_installments
    ) VALUES (
      v_user_id, 'expense', format('%s (%s/%s)', trim(p_description), v_installment_number, p_total_installments),
      v_installment_amount, p_category_id, NULL, v_card.id, v_invoice_id,
      p_transaction_date, 'confirmed', nullif(trim(p_notes), ''),
      v_group_id, v_installment_number, p_total_installments
    )
    RETURNING * INTO v_transaction;

    RETURN NEXT v_transaction;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_card_installment_expense(UUID, TEXT, NUMERIC, UUID, DATE, SMALLINT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_card_installment_expense(UUID, TEXT, NUMERIC, UUID, DATE, SMALLINT, TEXT)
  TO authenticated, service_role;
