create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'kiwify' check (provider = 'kiwify'),
  event_key text not null unique,
  provider_event_id text,
  event_type text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  failure_reason text,
  user_id uuid references auth.users(id) on delete set null,
  external_subscription_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists billing_webhook_events_user_id_idx
  on public.billing_webhook_events (user_id, received_at desc);

create index if not exists billing_webhook_events_external_subscription_idx
  on public.billing_webhook_events (external_subscription_id)
  where external_subscription_id is not null;

alter table public.billing_webhook_events enable row level security;

revoke all on table public.billing_webhook_events from anon, authenticated;

comment on table public.billing_webhook_events is
  'Auditoria idempotente de eventos da Kiwify. O payload original não é armazenado para minimizar dados pessoais.';
