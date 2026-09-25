-- A função é usada nas políticas RLS e só precisa enxergar a assinatura do próprio usuário.
-- SECURITY INVOKER evita elevação de privilégio e mantém a política sob o contexto autenticado.

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
revoke all on function public.has_valune_access() from authenticated;
grant execute on function public.has_valune_access() to authenticated;
