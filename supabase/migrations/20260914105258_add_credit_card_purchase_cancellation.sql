-- A card purchase must be cancelled as one unit. For instalments this removes
-- every generated instalment; it never leaves a partial purchase behind.
CREATE OR REPLACE FUNCTION public.delete_credit_card_purchase(
  p_transaction_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_purchase public.transactions;
  v_deleted_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_purchase
  FROM public.transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND type = 'expense'
    AND credit_card_id IS NOT NULL
    AND invoice_id IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit card purchase not found';
  END IF;

  -- Lock the affected invoices before checking for payments, so a payment and
  -- a cancellation cannot race each other.
  PERFORM 1
  FROM public.credit_card_invoices invoice
  JOIN public.transactions transaction ON transaction.invoice_id = invoice.id
  WHERE transaction.user_id = v_user_id
    AND (
      (v_purchase.installment_group_id IS NOT NULL
        AND transaction.installment_group_id = v_purchase.installment_group_id)
      OR transaction.id = v_purchase.id
    )
  FOR UPDATE OF invoice;

  IF EXISTS (
    SELECT 1
    FROM public.transactions payment
    WHERE payment.user_id = v_user_id
      AND payment.type = 'card_payment'
      AND payment.status = 'confirmed'
      AND payment.invoice_id IN (
        SELECT DISTINCT transaction.invoice_id
        FROM public.transactions transaction
        WHERE transaction.user_id = v_user_id
          AND (
            (v_purchase.installment_group_id IS NOT NULL
              AND transaction.installment_group_id = v_purchase.installment_group_id)
            OR transaction.id = v_purchase.id
          )
      )
  ) THEN
    RAISE EXCEPTION 'A purchase cannot be cancelled after one of its invoices has been paid';
  END IF;

  DELETE FROM public.transactions transaction
  WHERE transaction.user_id = v_user_id
    AND transaction.type = 'expense'
    AND transaction.credit_card_id IS NOT NULL
    AND (
      (v_purchase.installment_group_id IS NOT NULL
        AND transaction.installment_group_id = v_purchase.installment_group_id)
      OR transaction.id = v_purchase.id
    );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Invoices shared with another purchase are kept. Empty future invoices are
  -- removed so they no longer appear in the financial calendar.
  DELETE FROM public.credit_card_invoices invoice
  WHERE invoice.user_id = v_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions transaction
      WHERE transaction.invoice_id = invoice.id
    );

  RETURN v_deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_credit_card_purchase(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_credit_card_purchase(UUID) TO authenticated, service_role;
