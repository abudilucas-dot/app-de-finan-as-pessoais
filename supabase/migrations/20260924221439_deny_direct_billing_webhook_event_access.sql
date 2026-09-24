create policy "deny direct access to billing webhook events"
on public.billing_webhook_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
