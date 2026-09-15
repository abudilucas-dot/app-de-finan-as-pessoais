REVOKE ALL ON FUNCTION public.delete_credit_card_payment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_credit_card_payment(UUID) TO authenticated, service_role;
