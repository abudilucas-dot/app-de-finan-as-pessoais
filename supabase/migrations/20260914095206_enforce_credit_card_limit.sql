-- Enforce the credit-card limit for every confirmed card expense, including
-- writes made outside the app UI.
CREATE OR REPLACE FUNCTION public.enforce_credit_card_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_limit NUMERIC(14,2);
  v_used_limit NUMERIC(14,2);
BEGIN
  IF NEW.type <> 'expense' OR NEW.credit_card_id IS NULL OR NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Lock the card row so concurrent purchases cannot both consume the same limit.
  SELECT total_limit INTO v_total_limit
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit card not found';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'expense' AND status = 'confirmed' THEN amount
      WHEN type = 'card_payment' AND status = 'confirmed' THEN -amount
      ELSE 0
    END
  ), 0)::NUMERIC(14,2)
  INTO v_used_limit
  FROM public.transactions
  WHERE credit_card_id = NEW.credit_card_id
    AND id IS DISTINCT FROM NEW.id;

  IF v_used_limit + NEW.amount > v_total_limit THEN
    RAISE EXCEPTION 'This purchase exceeds the available card limit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_credit_card_limit ON public.transactions;
CREATE TRIGGER ensure_credit_card_limit
BEFORE INSERT OR UPDATE OF amount, credit_card_id, status, type
ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_credit_card_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_credit_card_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_credit_card_limit() TO authenticated, service_role;
