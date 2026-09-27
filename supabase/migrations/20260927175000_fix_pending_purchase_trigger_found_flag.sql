-- Keep the purchase-first trigger deterministic when no pending purchase exists.
create or replace function public.create_billing_subscription_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  buyer_email text;
  pending_purchase public.billing_pending_purchases%rowtype;
  has_pending boolean := false;
  created_at_value timestamptz := coalesce(new.created_at, now());
begin
  select lower(email)
    into buyer_email
    from auth.users
   where id = new.user_id;

  select *
    into pending_purchase
    from public.billing_pending_purchases
   where email = buyer_email;

  has_pending := found;

  insert into public.billing_subscriptions (
    user_id,
    provider,
    plan_code,
    status,
    trial_started_at,
    trial_ends_at,
    current_period_ends_at,
    cancel_at_period_end,
    external_subscription_id,
    last_provider_event_at
  )
  values (
    new.user_id,
    case when has_pending then pending_purchase.provider else 'internal' end,
    case when has_pending then pending_purchase.plan_code else null end,
    case when has_pending then pending_purchase.status else 'expired' end,
    created_at_value,
    created_at_value,
    null,
    case when has_pending then pending_purchase.status = 'cancelled' else false end,
    case when has_pending then pending_purchase.external_subscription_id else null end,
    case when has_pending then pending_purchase.last_provider_event_at else null end
  )
  on conflict (user_id) do nothing;

  if has_pending then
    update public.billing_pending_purchases
       set claimed_by_user_id = new.user_id,
           claimed_at = now(),
           updated_at = now()
     where email = buyer_email;
  end if;

  return new;
end;
$$;

revoke all on function public.create_billing_subscription_for_profile() from public, anon, authenticated;
