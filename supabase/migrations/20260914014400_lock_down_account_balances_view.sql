-- Balances are calculated from the ledger and must remain read-only.
REVOKE INSERT, UPDATE, DELETE ON public.account_balances FROM anon, authenticated;
