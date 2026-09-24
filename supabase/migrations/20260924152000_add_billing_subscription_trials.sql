-- Valune Pro: teste grátis e estado de assinatura.
-- Aplicada no projeto Supabase em 2026-09-24.

create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'internal' check (provider in ('internal', 'kiwify')),
  plan_code text null check (plan_code in ('pro_monthly', 'pro_annual')),
  status text not null default 'trialing'
    check (status in ('beta', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  current_period_ends_at timestamptz null,
  cancel_at_period_end boolean not null default false,
  external_subscription_id text unique null,
  last_provider_event_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_trial_range check (trial_ends_at >= trial_started_at)
);

alter table public.billing_subscriptions enable row level security;
grant select on public.billing_subscriptions to authenticated;

create policy "Users can read their own billing subscription"
on public.billing_subscriptions
for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists billing_subscriptions_status_period_idx
on public.billing_subscriptions (status, current_period_ends_at);

create or replace function public.create_billing_subscription_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.billing_subscriptions (user_id, trial_started_at, trial_ends_at)
  values (new.user_id, coalesce(new.created_at, now()), coalesce(new.created_at, now()) + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_billing_subscription
after insert on public.profiles
for each row execute function public.create_billing_subscription_for_profile();
