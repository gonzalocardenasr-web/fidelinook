-- DEV-CAT-01.4
-- Pricing multicanal del Catálogo Maestro.
--
-- Invariantes:
-- 1. Sólo puede existir un precio base activo por
--    producto + canal + lista de precios.
-- 2. Un cambio de precio preserva historia:
--    cierra el precio vigente y crea uno nuevo.
-- 3. La operación completa ocurre dentro de una transacción PostgreSQL.
-- 4. Sólo se permiten canales existentes y activos.
-- 5. Cambios concurrentes para una misma combinación comercial
--    se serializan dentro de la transacción.

create unique index if not exists product_prices_active_unique
    on public.product_prices (
        product_id,
        channel,
        price_list
    )
    where is_active = true;


create or replace function public.set_product_price(
    p_product_id bigint,
    p_channel text,
    p_price_list text,
    p_price integer,
    p_currency text default 'CLP'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_channel text := lower(trim(p_channel));
    v_price_list text := lower(trim(p_price_list));
    v_currency text := upper(trim(p_currency));
    v_current_price_id bigint;
    v_current_price integer;
    v_current_currency text;
    v_new_price_id bigint;
    v_now timestamptz := now();
begin
    if p_product_id is null or p_product_id <= 0 then
        raise exception 'Producto inválido.';
    end if;

    if v_channel is null or v_channel = '' then
        raise exception 'Canal inválido.';
    end if;

    if v_price_list is null or v_price_list = '' then
        raise exception 'Lista de precios inválida.';
    end if;

    if p_price is null or p_price < 0 then
        raise exception 'Precio inválido.';
    end if;

    if v_currency is null or v_currency = '' then
        raise exception 'Moneda inválida.';
    end if;

    if not exists (
        select 1
        from public.products
        where id = p_product_id
    ) then
        raise exception 'El producto no existe.';
    end if;

    if not exists (
        select 1
        from public.sales_channels
        where code = v_channel
          and is_active = true
    ) then
        raise exception 'El canal no existe o se encuentra inactivo.';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            p_product_id::text || ':' || v_channel || ':' || v_price_list,
            0
        )
    );

    select
        id,
        price,
        currency
    into
        v_current_price_id,
        v_current_price,
        v_current_currency
    from public.product_prices
    where product_id = p_product_id
      and channel = v_channel
      and price_list = v_price_list
      and is_active = true
    order by valid_from desc, id desc
    limit 1
    for update;

    if v_current_price_id is not null
       and v_current_price = p_price
       and v_current_currency = v_currency then
        return v_current_price_id;
    end if;

    if v_current_price_id is not null then
        update public.product_prices
        set
            is_active = false,
            valid_to = v_now
        where id = v_current_price_id;
    end if;

    insert into public.product_prices (
        product_id,
        channel,
        price_list,
        price,
        currency,
        valid_from,
        valid_to,
        is_active
    )
    values (
        p_product_id,
        v_channel,
        v_price_list,
        p_price,
        v_currency,
        v_now,
        null,
        true
    )
    returning id into v_new_price_id;

    return v_new_price_id;
end;
$$;


revoke all
on function public.set_product_price(bigint, text, text, integer, text)
from public;

revoke all
on function public.set_product_price(bigint, text, text, integer, text)
from anon;

revoke all
on function public.set_product_price(bigint, text, text, integer, text)
from authenticated;

grant execute
on function public.set_product_price(bigint, text, text, integer, text)
to service_role;