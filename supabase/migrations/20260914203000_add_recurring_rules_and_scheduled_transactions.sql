-- Foundation 06: scheduled recurring income and expenses.

CREATE TABLE public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 140),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
  next_occurrence DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recurring_rules_end_date_check CHECK (end_date IS NULL OR end_date >= next_occurrence)
);

ALTER TABLE public.transactions
  ADD COLUMN recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_recurring_rules_user_next ON public.recurring_rules(user_id, next_occurrence) WHERE active;
CREATE INDEX idx_recurring_rules_category_id ON public.recurring_rules(category_id);
CREATE INDEX idx_recurring_rules_account_id ON public.recurring_rules(account_id);
CREATE INDEX idx_transactions_recurring_rule_id ON public.transactions(recurring_rule_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_rules TO authenticated;
GRANT ALL ON public.recurring_rules TO service_role;

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_rules_select_own" ON public.recurring_rules FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "recurring_rules_insert_own" ON public.recurring_rules FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "recurring_rules_update_own" ON public.recurring_rules FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "recurring_rules_delete_own" ON public.recurring_rules FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.validate_recurring_rule_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_category_type TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Account must belong to the current user';
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT type INTO v_category_type FROM public.categories
      WHERE id = NEW.category_id AND (user_id IS NULL OR user_id = NEW.user_id);
    IF v_category_type IS NULL OR v_category_type <> NEW.type THEN
      RAISE EXCEPTION 'Category must match the rule type and belong to the current user or be global';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_recurring_rule_ownership
BEFORE INSERT OR UPDATE OF user_id, category_id, account_id, type ON public.recurring_rules
FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_rule_ownership();

CREATE TRIGGER recurring_rules_set_updated_at
BEFORE UPDATE ON public.recurring_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.complete_recurring_rule(
  p_rule_id UUID,
  p_expected_occurrence DATE,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.transactions
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rule public.recurring_rules%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_next_occurrence DATE;
BEGIN
  SELECT * INTO v_rule
  FROM public.recurring_rules
  WHERE id = p_rule_id AND user_id = (SELECT auth.uid()) AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled item not found or inactive';
  END IF;
  IF v_rule.next_occurrence <> p_expected_occurrence THEN
    RAISE EXCEPTION 'This scheduled item has changed. Reload and try again.';
  END IF;

  INSERT INTO public.transactions (
    user_id, type, description, amount, category_id, account_id,
    transaction_date, status, notes, recurring_rule_id
  ) VALUES (
    v_rule.user_id, v_rule.type, v_rule.description, v_rule.amount, v_rule.category_id,
    v_rule.account_id, p_transaction_date, 'confirmed', v_rule.notes, v_rule.id
  ) RETURNING * INTO v_transaction;

  v_next_occurrence := CASE v_rule.frequency
    WHEN 'weekly' THEN (v_rule.next_occurrence + INTERVAL '1 week')::date
    WHEN 'biweekly' THEN (v_rule.next_occurrence + INTERVAL '2 weeks')::date
    WHEN 'monthly' THEN (v_rule.next_occurrence + INTERVAL '1 month')::date
    WHEN 'quarterly' THEN (v_rule.next_occurrence + INTERVAL '3 months')::date
    WHEN 'semiannual' THEN (v_rule.next_occurrence + INTERVAL '6 months')::date
    WHEN 'annual' THEN (v_rule.next_occurrence + INTERVAL '1 year')::date
  END;

  UPDATE public.recurring_rules
  SET next_occurrence = v_next_occurrence,
      active = CASE WHEN end_date IS NOT NULL AND v_next_occurrence > end_date THEN false ELSE active END
  WHERE id = v_rule.id;

  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_recurring_rule_ownership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_recurring_rule_ownership() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_recurring_rule(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_recurring_rule(UUID, DATE, DATE) TO authenticated, service_role;
