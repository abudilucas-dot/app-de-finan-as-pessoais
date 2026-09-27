-- Fluxo compra primeiro: guarda a compra aprovada até o comprador criar a conta.
create table if not exists public.billing_pending_purchases (
  email text primary key check (email = lower(email)),
  provider text not null default 'kiwify' check (provider = 'kiwify'),
  plan_code text null check (plan_code in ('lifetime', 'pro_monthly', 'pro_annual')),
  status text not null check (status in ('active', 'past_due', 'cancelled')),
  external_subscription_id text null,
  last_provider_event_at timestamptz not null default now(),
  claimed_by_user_id uuid null references auth.users(id) on delete set null,
  claimed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_pending_purchases enable row level security;
revoke all on table public.billing_pending_purchases from public;
revoke all on table public.billing_pending_purchases from anon;
revoke all on table public.billing_pending_purchases from authenticated;

create or replace function public.create_billing_subscription_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  buyer_email text;
  pending_purchase public.billing_pending_purchases%rowtype;
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
    case when found then pending_purchase.provider else 'internal' end,
    case when found then pending_purchase.plan_code else null end,
    case when found then pending_purchase.status else 'expired' end,
    created_at_value,
    created_at_value,
    null,
    case when found then pending_purchase.status = 'cancelled' else false end,
    case when found then pending_purchase.external_subscription_id else null end,
    case when found then pending_purchase.last_provider_event_at else null end
  )
  on conflict (user_id) do nothing;

  if found then
    update public.billing_pending_purchases
    set claimed_by_user_id = new.user_id,
        claimed_at = now(),
        updated_at = now()
    where email = buyer_email;
  end if;

  return new;
end;
$$;

revoke all on function public.create_billing_subscription_for_profile() from public;
revoke all on function public.create_billing_subscription_for_profile() from anon;
revoke all on function public.create_billing_subscription_for_profile() from authenticated;

create or replace function public.has_valune_access()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.billing_subscriptions as subscription
    where subscription.user_id = (select auth.uid())
      and (
        subscription.status in ('beta', 'active')
        or (
          subscription.status = 'trialing'
          and subscription.trial_ends_at > now()
        )
      )
  );
$$;

revoke all on function public.has_valune_access() from public;
revoke all on function public.has_valune_access() from anon;
grant execute on function public.has_valune_access() to authenticated;