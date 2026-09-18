-- DEV-CAT-01.0
-- Maestro de canales de venta y disponibilidad de productos por canal.
--
-- Objetivos:
-- 1. Formalizar los canales de venta canónicos de Plataforma Nook.
-- 2. Separar disponibilidad comercial por canal del pricing por canal.
-- 3. Mantener products como catálogo maestro independiente del canal.
-- 4. Preservar sales.channel como snapshot histórico de cada venta.
-- 5. Inicializar únicamente el canal local para los productos existentes.
--
-- Esta migración NO modifica el comportamiento actual del POS ni de ventas.

begin;

-- ============================================================
-- 1. Maestro de canales de venta
-- ============================================================

create table if not exists public.sales_channels (
    code text primary key,
    name text not null,
    channel_type text not null,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint sales_channels_code_not_blank
        check (btrim(code) <> ''),

    constraint sales_channels_name_not_blank
        check (btrim(name) <> ''),

    constraint sales_channels_channel_type_check
        check (channel_type in ('local', 'digital'))
);

-- ============================================================
-- 2. Relación Producto <-> Canal
-- ============================================================

create table if not exists public.product_channels (
    product_id bigint not null
        references public.products(id)
        on update cascade
        on delete restrict,

    channel_code text not null
        references public.sales_channels(code)
        on update cascade
        on delete restrict,

    is_enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (product_id, channel_code)
);

create index if not exists idx_product_channels_channel_enabled
    on public.product_channels(channel_code, is_enabled);

-- ============================================================
-- 3. Canales canónicos actuales
-- ============================================================

insert into public.sales_channels (
    code,
    name,
    channel_type,
    is_active,
    sort_order
)
values
    ('local', 'Local', 'local', true, 10),
    ('shopify', 'Shopify', 'digital', true, 20),
    ('rappi', 'Rappi', 'digital', true, 30),
    ('uber_eats', 'Uber Eats', 'digital', true, 40)
on conflict (code) do nothing;

-- ============================================================
-- 4. Estado inicial Producto <-> Canal
-- ============================================================
--
-- El catálogo actual opera con pricing local y todos los productos
-- existentes pertenecen al catálogo operacional local.
--
-- NO se infiere disponibilidad digital desde ventas históricas.
-- Shopify, Rappi y Uber Eats serán configurados explícitamente
-- mediante el Catálogo Maestro.

insert into public.product_channels (
    product_id,
    channel_code,
    is_enabled
)
select
    p.id,
    'local',
    true
from public.products p
on conflict (product_id, channel_code) do nothing;

-- ============================================================
-- 5. RLS
-- ============================================================
--
-- Estas tablas forman parte de la configuración operacional.
-- No deben quedar expuestas directamente a clientes anon/authenticated.
-- La aplicación operacional accede actualmente mediante backend
-- privilegiado (service role).

alter table public.sales_channels enable row level security;
alter table public.product_channels enable row level security;

revoke all on table public.sales_channels from anon, authenticated;
revoke all on table public.product_channels from anon, authenticated;

grant all on table public.sales_channels to service_role;
grant all on table public.product_channels to service_role;

commit;