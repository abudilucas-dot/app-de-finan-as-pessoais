-- Records explicit acceptance of the active legal documents for every new account.
create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('terms', 'privacy')),
  document_version text not null check (char_length(trim(document_version)) between 1 and 32),
  accepted_at timestamptz not null default now(),
  unique (user_id, document_type, document_version)
);

create index legal_acceptances_user_id_idx on public.legal_acceptances(user_id);

alter table public.legal_acceptances enable row level security;

grant select on public.legal_acceptances to authenticated;
grant all on public.legal_acceptances to service_role;

create policy "legal_acceptances_select_own"
on public.legal_acceptances
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> '2026-09-15'
     or coalesce(new.raw_user_meta_data ->> 'privacy_version', '') <> '2026-09-16' then
    raise exception 'É necessário aceitar os documentos legais atuais para criar uma conta';
  end if;

  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.legal_acceptances (user_id, document_type, document_version)
  values
    (new.id, 'terms', '2026-09-15'),
    (new.id, 'privacy', '2026-09-16')
  on conflict (user_id, document_type, document_version) do nothing;

  return new;
end;
$$;
