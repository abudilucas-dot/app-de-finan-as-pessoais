-- Evaluate the authenticated user once per statement in RLS policies.
-- This preserves the same ownership rules while avoiding per-row auth lookups.

ALTER POLICY "profiles_select_own" ON public.profiles
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "profiles_insert_own" ON public.profiles
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "profiles_update_own" ON public.profiles
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "profiles_delete_own" ON public.profiles
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "user_settings_select_own" ON public.user_settings
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "user_settings_insert_own" ON public.user_settings
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "user_settings_update_own" ON public.user_settings
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "user_settings_delete_own" ON public.user_settings
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "accounts_select_own" ON public.accounts
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "accounts_insert_own" ON public.accounts
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "accounts_update_own" ON public.accounts
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "accounts_delete_own" ON public.accounts
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "categories_select_own_or_global" ON public.categories
  USING (user_id IS NULL OR (SELECT auth.uid()) = user_id);
ALTER POLICY "categories_insert_own" ON public.categories
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "categories_update_own" ON public.categories
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "categories_delete_own" ON public.categories
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "transactions_select_own" ON public.transactions
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "transactions_insert_own" ON public.transactions
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "transactions_update_own" ON public.transactions
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "transactions_delete_own" ON public.transactions
  USING ((SELECT auth.uid()) = user_id);
