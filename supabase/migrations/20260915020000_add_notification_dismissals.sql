create table public.notification_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null check (char_length(notification_key) between 1 and 200),
  dismissed_at timestamptz not null default now(),
  unique (user_id, notification_key)
);

alter table public.notification_dismissals enable row level security;

grant select, insert, delete on table public.notification_dismissals to authenticated;
grant all on table public.notification_dismissals to service_role;

create policy "Users can read their notification dismissals"
on public.notification_dismissals
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can dismiss their own notifications"
on public.notification_dismissals
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can restore their own notifications"
on public.notification_dismissals
for delete to authenticated
using ((select auth.uid()) = user_id);
