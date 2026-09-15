-- Permit a user to undo an invoice payment safely before cancelling the linked purchase.

CREATE OR REPLACE FUNCTION public.delete_credit_card_payment(p_transaction_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_payment public.transactions%ROWTYPE;
  v_invoice public.credit_card_invoices%ROWTYPE;
  v_remaining NUMERIC(14,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_payment
  FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND type = 'card_payment'
    AND invoice_id IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice payment not found';
  END IF;

  SELECT * INTO v_invoice
  FROM public.credit_card_invoices
  WHERE id = v_payment.invoice_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  DELETE FROM public.transactions
  WHERE id = v_payment.id
    AND user_id = v_user_id;

  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'expense' AND status = 'confirmed' THEN amount
      WHEN type = 'card_payment' AND status = 'confirmed' THEN -amount
      ELSE 0
    END
  ), 0)::NUMERIC(14,2)
  INTO v_remaining
  FROM public.transactions
  WHERE invoice_id = v_invoice.id
    AND user_id = v_user_id;

  UPDATE public.credit_card_invoices
  SET status = CASE
        WHEN v_remaining <= 0 THEN 'paid'
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'open'
      END,
      paid_at = CASE WHEN v_remaining <= 0 THEN COALESCE(paid_at, now()) ELSE NULL END
  WHERE id = v_invoice.id
    AND user_id = v_user_id;

  RETURN 1;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_credit_card_payment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_credit_card_payment(UUID) TO authenticated, service_role;
