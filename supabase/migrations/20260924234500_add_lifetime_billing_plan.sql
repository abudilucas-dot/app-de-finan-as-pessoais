-- Valune Vitalício: compra única, sem período de renovação.
-- Esta alteração também foi aplicada no projeto Supabase de produção.

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_plan_code_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_plan_code_check
  check (plan_code in ('pro_monthly', 'pro_annual', 'lifetime'));
