CREATE INDEX IF NOT EXISTS idx_credit_cards_default_payment_account_id
  ON public.credit_cards (default_payment_account_id);
