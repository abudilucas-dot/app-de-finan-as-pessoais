create policy "No direct access to pending purchases"
on public.billing_pending_purchases
as restrictive
for all
to authenticated
using (false)
with check (false);