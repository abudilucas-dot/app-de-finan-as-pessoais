-- Performance index for budget category foreign-key lookups.
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
