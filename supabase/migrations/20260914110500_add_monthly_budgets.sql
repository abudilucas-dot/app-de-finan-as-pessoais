-- Foundation 04: monthly category budgets calculated from real confirmed expenses.

CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  amount_limit NUMERIC(14,2) NOT NULL CHECK (amount_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budgets_month_start_check CHECK (period_start = date_trunc('month', period_start)::date),
  CONSTRAINT budgets_user_category_month_unique UNIQUE (user_id, category_id, period_start)
);
CREATE INDEX idx_budgets_user_period_start ON public.budgets(user_id, period_start DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_select_own" ON public.budgets FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "budgets_insert_own" ON public.budgets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "budgets_update_own" ON public.budgets FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "budgets_delete_own" ON public.budgets FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE OR REPLACE FUNCTION public.validate_budget_category()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_category_type TEXT;
BEGIN
  SELECT type INTO v_category_type
  FROM public.categories
  WHERE id = NEW.category_id AND (user_id IS NULL OR user_id = NEW.user_id);
  IF v_category_type IS NULL OR v_category_type <> 'expense' THEN
    RAISE EXCEPTION 'A budget must use an expense category owned by this user or a global category';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_budget_category BEFORE INSERT OR UPDATE OF user_id, category_id ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.validate_budget_category();
CREATE TRIGGER budgets_set_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
REVOKE ALL ON FUNCTION public.validate_budget_category() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_budget_category() TO authenticated, service_role;
CREATE OR REPLACE VIEW public.budget_summaries WITH (security_invoker = true) AS
SELECT budget.id, budget.user_id, budget.category_id, budget.period_start, budget.amount_limit,
  COALESCE(SUM(transaction.amount) FILTER (
    WHERE transaction.type = 'expense' AND transaction.status = 'confirmed'
      AND transaction.transaction_date >= budget.period_start
      AND transaction.transaction_date < (budget.period_start + INTERVAL '1 month')::date
  ), 0)::NUMERIC(14,2) AS spent_amount
FROM public.budgets budget
LEFT JOIN public.transactions transaction
  ON transaction.user_id = budget.user_id AND transaction.category_id = budget.category_id
GROUP BY budget.id, budget.user_id, budget.category_id, budget.period_start, budget.amount_limit;
GRANT SELECT ON public.budget_summaries TO authenticated, service_role;
