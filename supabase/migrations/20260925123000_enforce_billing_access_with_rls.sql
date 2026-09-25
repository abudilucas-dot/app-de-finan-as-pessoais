-- Impede acesso direto aos dados financeiros após o fim do teste grátis.
-- A assinatura é atualizada exclusivamente pelo webhook validado da Kiwify.

create or replace function public.has_valune_access()
returns boolean
language sql
stable
security definer
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
grant execute on function public.has_valune_access() to authenticated;

do $$
declare
  financial_table text;
begin
  foreach financial_table in array array[
    'accounts',
    'budgets',
    'categories',
    'credit_card_invoices',
    'credit_cards',
    'debit_cards',
    'debt_payments',
    'financial_debts',
    'financial_goals',
    'goal_contributions',
    'notification_dismissals',
    'recurring_rules',
    'transactions'
  ]
  loop
    execute format('drop policy if exists valune_access_required on public.%I', financial_table);
    execute format(
      'create policy valune_access_required on public.%I as restrictive for all to authenticated using ((select public.has_valune_access())) with check ((select public.has_valune_access()))',
      financial_table
    );
  end loop;
end $$;
