-- Foundation 03: credit cards and invoices.
-- Card purchases are expenses at purchase time. Paying an invoice is a separate
-- settlement movement, so monthly expenses are never counted twice.

CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  institution TEXT,
  brand TEXT,
  total_limit NUMERIC(14,2) NOT NULL CHECK (total_limit > 0),
  closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  default_payment_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  color TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_cards_user_id ON public.credit_cards(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_cards TO authenticated;
GRANT ALL ON public.credit_cards TO service_role;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_cards_select_own" ON public.credit_cards FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "credit_cards_insert_own" ON public.credit_cards FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "credit_cards_update_own" ON public.credit_cards FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "credit_cards_delete_own" ON public.credit_cards FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE TRIGGER credit_cards_set_updated_at BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.credit_card_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE RESTRICT,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_card_invoices_cycle_check CHECK (cycle_start <= cycle_end AND due_date > cycle_end),
  CONSTRAINT credit_card_invoices_card_cycle_unique UNIQUE (credit_card_id, cycle_start)
);

CREATE INDEX idx_credit_card_invoices_user_due_date
  ON public.credit_card_invoices(user_id, due_date);
CREATE INDEX idx_credit_card_invoices_card_cycle
  ON public.credit_card_invoices(credit_card_id, cycle_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_invoices TO authenticated;
GRANT ALL ON public.credit_card_invoices TO service_role;
ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_card_invoices_select_own" ON public.credit_card_invoices FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "credit_card_invoices_insert_own" ON public.credit_card_invoices FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "credit_card_invoices_update_own" ON public.credit_card_invoices FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "credit_card_invoices_delete_own" ON public.credit_card_invoices FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE TRIGGER credit_card_invoices_set_updated_at BEFORE UPDATE ON public.credit_card_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- An expense paid directly from an account has account_id. A card purchase has
-- a card and invoice instead. Invoice settlements only affect the bank account.
ALTER TABLE public.transactions
  ALTER COLUMN account_id DROP NOT NULL,
  ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE RESTRICT,
  ADD COLUMN invoice_id UUID REFERENCES public.credit_card_invoices(id) ON DELETE RESTRICT;

ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE public.transactions DROP CONSTRAINT transactions_shape_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income', 'expense', 'transfer', 'card_payment')),
  ADD CONSTRAINT transactions_shape_check CHECK (
    (
      type = 'income'
      AND category_id IS NOT NULL
      AND account_id IS NOT NULL
      AND destination_account_id IS NULL
      AND credit_card_id IS NULL
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
        (account_id IS NULL AND credit_card_id IS NOT NULL AND invoice_id IS NOT NULL)
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
      AND invoice_id IS NULL
    )
    OR
    (
      type = 'card_payment'
      AND category_id IS NULL
      AND account_id IS NOT NULL
      AND destination_account_id IS NULL
      AND credit_card_id IS NOT NULL
      AND invoice_id IS NOT NULL
    )
  );

CREATE INDEX idx_transactions_credit_card_id
  ON public.transactions(credit_card_id)
  WHERE credit_card_id IS NOT NULL;
CREATE INDEX idx_transactions_invoice_id
  ON public.transactions(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Replaces the relation validator with card and invoice ownership checks.
CREATE OR REPLACE FUNCTION public.validate_transaction_relations()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  category_kind TEXT;
  invoice_card_id UUID;
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

-- Creates the correct invoice for the purchase date and records the expense.
CREATE OR REPLACE FUNCTION public.create_card_expense(
  p_credit_card_id UUID,
  p_description TEXT,
  p_amount NUMERIC,
  p_category_id UUID,
  p_transaction_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_card public.credit_cards;
  v_invoice_id UUID;
  v_transaction public.transactions;
  v_cycle_end DATE;
  v_cycle_start DATE;
  v_due_date DATE;
  v_month_start DATE;
  v_previous_month_start DATE;
  v_due_month_start DATE;
  v_last_day INTEGER;
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

  SELECT * INTO v_card
  FROM public.credit_cards
  WHERE id = p_credit_card_id AND user_id = v_user_id AND is_archived = false;
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

  v_month_start := date_trunc('month', p_transaction_date)::date;
  v_last_day := EXTRACT(day FROM (v_month_start + INTERVAL '1 month - 1 day'))::integer;
  IF EXTRACT(day FROM p_transaction_date)::integer <= LEAST(v_card.closing_day, v_last_day) THEN
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
    credit_card_id, invoice_id, transaction_date, status, notes
  ) VALUES (
    v_user_id, 'expense', trim(p_description), p_amount, p_category_id, NULL,
    v_card.id, v_invoice_id, p_transaction_date, 'confirmed', nullif(trim(p_notes), '')
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

-- Pays exactly the remaining balance. This settlement does not create another expense.
CREATE OR REPLACE FUNCTION public.pay_credit_card_invoice(
  p_invoice_id UUID,
  p_account_id UUID,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invoice public.credit_card_invoices;
  v_remaining NUMERIC(14,2);
  v_transaction public.transactions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_invoice
  FROM public.credit_card_invoices
  WHERE id = p_invoice_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'This invoice has already been paid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND user_id = v_user_id AND is_archived = false
  ) THEN
    RAISE EXCEPTION 'Payment account not found';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'expense' AND status = 'confirmed' THEN amount
      WHEN type = 'card_payment' AND status = 'confirmed' THEN -amount
      ELSE 0
    END
  ), 0)::NUMERIC(14,2)
  INTO v_remaining
  FROM public.transactions
  WHERE invoice_id = v_invoice.id;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'There is no outstanding balance on this invoice';
  END IF;

  INSERT INTO public.transactions (
    user_id, type, description, amount, account_id, credit_card_id,
    invoice_id, transaction_date, status
  ) VALUES (
    v_user_id, 'card_payment', 'Pagamento da fatura', v_remaining, p_account_id,
    v_invoice.credit_card_id, v_invoice.id, COALESCE(p_payment_date, CURRENT_DATE), 'confirmed'
  )
  RETURNING * INTO v_transaction;

  UPDATE public.credit_card_invoices
  SET status = 'paid', paid_at = now()
  WHERE id = v_invoice.id;

  RETURN v_transaction;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_card_expense(UUID, TEXT, NUMERIC, UUID, DATE, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_card_expense(UUID, TEXT, NUMERIC, UUID, DATE, TEXT)
  TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.pay_credit_card_invoice(UUID, UUID, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_credit_card_invoice(UUID, UUID, DATE)
  TO authenticated, service_role;

CREATE VIEW public.credit_card_summaries
WITH (security_invoker = true)
AS
SELECT
  card.id AS credit_card_id,
  card.user_id,
  card.total_limit,
  COALESCE(SUM(
    CASE
      WHEN tx.type = 'expense' AND tx.status = 'confirmed' THEN tx.amount
      WHEN tx.type = 'card_payment' AND tx.status = 'confirmed' THEN -tx.amount
      ELSE 0
    END
  ), 0)::NUMERIC(14,2) AS outstanding_balance,
  (card.total_limit - COALESCE(SUM(
    CASE
      WHEN tx.type = 'expense' AND tx.status = 'confirmed' THEN tx.amount
      WHEN tx.type = 'card_payment' AND tx.status = 'confirmed' THEN -tx.amount
      ELSE 0
    END
  ), 0))::NUMERIC(14,2) AS available_limit
FROM public.credit_cards AS card
LEFT JOIN public.transactions AS tx ON tx.credit_card_id = card.id
GROUP BY card.id, card.user_id, card.total_limit;

GRANT SELECT ON public.credit_card_summaries TO authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON public.credit_card_summaries FROM anon, authenticated;
