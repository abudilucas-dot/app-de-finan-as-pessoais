-- Preserve beta access for accounts created before Valune Pro was introduced.
alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_status_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_status_check
  check (status in ('beta', 'trialing', 'active', 'past_due', 'cancelled', 'expired'));

update public.billing_subscriptions
set status = 'beta',
    updated_at = now()
where status = 'expired'
  and provider = 'internal'
  and plan_code is null;