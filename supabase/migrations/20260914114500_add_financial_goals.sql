-- Foundation 05: financial goals and contribution history.

CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  target_date DATE,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_goals_user_id ON public.financial_goals(user_id);
CREATE INDEX idx_goal_contributions_goal_date ON public.goal_contributions(goal_id, contribution_date DESC);
CREATE INDEX idx_goal_contributions_user_id ON public.goal_contributions(user_id);
CREATE INDEX idx_goal_contributions_account_id ON public.goal_contributions(account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_contributions TO authenticated;
GRANT ALL ON public.financial_goals, public.goal_contributions TO service_role;

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_goals_select_own" ON public.financial_goals FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "financial_goals_insert_own" ON public.financial_goals FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "financial_goals_update_own" ON public.financial_goals FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "financial_goals_delete_own" ON public.financial_goals FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "goal_contributions_select_own" ON public.goal_contributions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "goal_contributions_insert_own" ON public.goal_contributions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "goal_contributions_update_own" ON public.goal_contributions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "goal_contributions_delete_own" ON public.goal_contributions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.validate_goal_contribution_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.financial_goals WHERE id = NEW.goal_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Goal must belong to the current user';
  END IF;
  IF NEW.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Account must belong to the current user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_goal_contribution_ownership
BEFORE INSERT OR UPDATE OF user_id, goal_id, account_id ON public.goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.validate_goal_contribution_ownership();

CREATE TRIGGER financial_goals_set_updated_at
BEFORE UPDATE ON public.financial_goals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON FUNCTION public.validate_goal_contribution_ownership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_goal_contribution_ownership() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.financial_goal_summaries
WITH (security_invoker = true)
AS
SELECT
  goal.id, goal.user_id, goal.name, goal.target_amount, goal.target_date, goal.color,
  goal.status, goal.created_at,
  COALESCE(SUM(contribution.amount), 0)::NUMERIC(14,2) AS current_amount,
  COUNT(contribution.id)::INTEGER AS contribution_count
FROM public.financial_goals goal
LEFT JOIN public.goal_contributions contribution ON contribution.goal_id = goal.id
GROUP BY goal.id, goal.user_id, goal.name, goal.target_amount, goal.target_date, goal.color, goal.status, goal.created_at;

GRANT SELECT ON public.financial_goal_summaries TO authenticated, service_role;
