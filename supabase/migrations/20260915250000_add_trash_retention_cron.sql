-- Keep user-deleted transactions recoverable for 30 days.
-- The hourly job also preserves debt-payment history by removing only its obsolete transaction reference.
create extension if not exists pg_cron;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'purge_trashed_transactions_hourly'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'purge_trashed_transactions_hourly',
    '17 * * * *',
    $job$
      update public.debt_payments
      set transaction_id = null
      where transaction_id in (
        select id
        from public.transactions
        where deleted_at is not null
          and deletion_reason = 'user_deleted'
          and deleted_at <= now() - interval '30 days'
      );

      delete from public.transactions
      where deleted_at is not null
        and deletion_reason = 'user_deleted'
        and deleted_at <= now() - interval '30 days';
    $job$
  );
end;
$$;
