alter table public.recurring_rules
  add column is_subscription boolean not null default false;

alter table public.recurring_rules
  add constraint recurring_rules_subscription_expense_check
  check (is_subscription = false or type = 'expense');

create index recurring_rules_user_subscription_idx
  on public.recurring_rules(user_id, is_subscription, active, next_occurrence);
