-- Replaces a purchase in one database transaction. If the replacement fails
-- validation or exceeds a limit, the original purchase remains untouched.
CREATE OR REPLACE FUNCTION public.replace_credit_card_purchase(
  p_transaction_id UUID,
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
BEGIN
  PERFORM public.delete_credit_card_purchase(p_transaction_id);

  RETURN QUERY
  SELECT *
  FROM public.create_card_installment_expense(
    p_credit_card_id,
    p_description,
    p_amount,
    p_category_id,
    p_transaction_date,
    p_total_installments,
    p_notes
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replace_credit_card_purchase(UUID, UUID, TEXT, NUMERIC, UUID, DATE, SMALLINT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_credit_card_purchase(UUID, UUID, TEXT, NUMERIC, UUID, DATE, SMALLINT, TEXT)
  TO authenticated, service_role;
