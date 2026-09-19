-- DEV-CAT-01.4B
-- Pricing multicanal de opciones del Catálogo Maestro.
--
-- Reglas:
-- 1. El precio se administra por producto + opción + canal + lista.
-- 2. Los cambios preservan historia temporal.
-- 3. inventory_quantity NO se administra como pricing.
-- 4. Al cambiar un precio existente se conserva inventory_quantity.
-- 5. Al crear el primer precio para un nuevo canal, inventory_quantity
--    se hereda desde otra configuración activa de la misma opción.

create or replace function public.set_product_option_price(
    p_product_id bigint,
    p_option_value_id bigint,
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
    v_inventory_quantity numeric;

    v_new_price_id bigint;
    v_now timestamptz := now();
begin
    if p_product_id is null or p_product_id <= 0 then
        raise exception 'Producto inválido.';
    end if;

    if p_option_value_id is null or p_option_value_id <= 0 then
        raise exception 'Opción inválida.';
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
        from public.catalog_option_values
        where id = p_option_value_id
          and is_active = true
    ) then
        raise exception 'La opción no existe o se encuentra inactiva.';
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
            p_product_id::text
            || ':'
            || p_option_value_id::text
            || ':'
            || v_channel
            || ':'
            || v_price_list,
            0
        )
    );

    select
        pop.id,
        pop.price,
        pop.currency,
        pop.inventory_quantity
    into
        v_current_price_id,
        v_current_price,
        v_current_currency,
        v_inventory_quantity
    from public.product_option_prices pop
    where pop.product_id = p_product_id
      and pop.option_value_id = p_option_value_id
      and pop.channel = v_channel
      and pop.price_list = v_price_list
      and pop.is_active = true
    order by pop.valid_from desc, pop.id desc
    limit 1
    for update;

    if v_current_price_id is not null
       and v_current_price = p_price
       and v_current_currency = v_currency then
        return v_current_price_id;
    end if;

    /*
     * Si todavía no existe precio para este canal, heredamos únicamente
     * la configuración operacional de consumo desde otra fila activa
     * de la misma combinación producto + opción.
     *
     * Local tiene prioridad por ser actualmente la configuración
     * operacional canónica del POS.
     */
    if v_inventory_quantity is null then
        select pop.inventory_quantity
        into v_inventory_quantity
        from public.product_option_prices pop
        where pop.product_id = p_product_id
          and pop.option_value_id = p_option_value_id
          and pop.is_active = true
          and pop.inventory_quantity > 0
        order by
            case when pop.channel = 'local' then 0 else 1 end,
            pop.valid_from desc,
            pop.id desc
        limit 1;
    end if;

    if v_inventory_quantity is null
       or v_inventory_quantity <= 0 then
        raise exception
            'La opción no tiene una configuración válida de consumo de inventario.';
    end if;

    if v_current_price_id is not null then
        update public.product_option_prices
        set
            is_active = false,
            valid_to = v_now
        where id = v_current_price_id;
    end if;

    insert into public.product_option_prices (
        product_id,
        option_value_id,
        channel,
        price_list,
        price,
        currency,
        valid_from,
        valid_to,
        is_active,
        inventory_quantity
    )
    values (
        p_product_id,
        p_option_value_id,
        v_channel,
        v_price_list,
        p_price,
        v_currency,
        v_now,
        null,
        true,
        v_inventory_quantity
    )
    returning id into v_new_price_id;

    return v_new_price_id;
end;
$$;


revoke all
on function public.set_product_option_price(
    bigint,
    bigint,
    text,
    text,
    integer,
    text
)
from public;

revoke all
on function public.set_product_option_price(
    bigint,
    bigint,
    text,
    text,
    integer,
    text
)
from anon;

revoke all
on function public.set_product_option_price(
    bigint,
    bigint,
    text,
    text,
    integer,
    text
)
from authenticated;

grant execute
on function public.set_product_option_price(
    bigint,
    bigint,
    text,
    text,
    integer,
    text
)
to service_role;