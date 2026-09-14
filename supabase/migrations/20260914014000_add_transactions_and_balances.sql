-- Foundation 02: transactions, transfers and calculated account balances.

CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 160),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'pending', 'overdue', 'cancelled')),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transactions_shape_check CHECK (
    (
      type = 'transfer'
      AND category_id IS NULL
      AND destination_account_id IS NOT NULL
      AND destination_account_id <> account_id
    )
    OR
    (
      type IN ('income', 'expense')
      AND category_id IS NOT NULL
      AND destination_account_id IS NULL
    )
  )
);

CREATE INDEX idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC, created_at DESC);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_destination_account_id
  ON public.transactions(destination_account_id)
  WHERE destination_account_id IS NOT NULL;
CREATE INDEX idx_transactions_category_id
  ON public.transactions(category_id)
  WHERE category_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevents a transaction from referencing another user's account/category.
CREATE OR REPLACE FUNCTION public.validate_transaction_relations()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  category_kind TEXT;
BEGIN
  IF NOT EXISTS (
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

CREATE TRIGGER transactions_validate_relations
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_relations();

-- The balance is derived from the ledger; it is never duplicated in accounts.
CREATE VIEW public.account_balances
WITH (security_invoker = true)
AS
SELECT
  account.id AS account_id,
  account.user_id,
  account.initial_balance + COALESCE(
    SUM(
      CASE
        WHEN tx.status <> 'confirmed' THEN 0
        WHEN tx.type = 'income' AND tx.account_id = account.id
          THEN tx.amount
        WHEN tx.type = 'expense' AND tx.account_id = account.id
          THEN -tx.amount
        WHEN tx.type = 'transfer' AND tx.account_id = account.id
          THEN -tx.amount
        WHEN tx.type = 'transfer'
          AND tx.destination_account_id = account.id
          THEN tx.amount
        ELSE 0
      END
    ),
    0
  )::NUMERIC(14,2) AS current_balance
FROM public.accounts AS account
LEFT JOIN public.transactions AS tx
  ON tx.account_id = account.id
  OR tx.destination_account_id = account.id
GROUP BY account.id, account.user_id, account.initial_balance;

GRANT SELECT ON public.account_balances TO authenticated;
GRANT SELECT ON public.account_balances TO service_role;
