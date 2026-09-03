create table if not exists public.email_dispatch_settings (
  id integer primary key default 1,
  provider_daily_limit integer not null default 100,
  crm_daily_limit integer not null default 80,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint email_dispatch_settings_singleton
    check (id = 1),

  constraint email_dispatch_settings_provider_daily_limit_positive
    check (provider_daily_limit > 0),

  constraint email_dispatch_settings_crm_daily_limit_nonnegative
    check (crm_daily_limit >= 0),

  constraint email_dispatch_settings_crm_within_provider_limit
    check (crm_daily_limit <= provider_daily_limit)
);

insert into public.email_dispatch_settings (
  id,
  provider_daily_limit,
  crm_daily_limit
)
values (
  1,
  100,
  80
)
on conflict (id) do nothing;

alter table public.email_dispatch_settings enable row level security;

revoke all on public.email_dispatch_settings from public;
grant select on public.email_dispatch_settings to service_role;

create or replace function public.set_email_dispatch_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_dispatch_settings_updated_at
  on public.email_dispatch_settings;

create trigger trg_email_dispatch_settings_updated_at
before update on public.email_dispatch_settings
for each row
execute function public.set_email_dispatch_settings_updated_at();