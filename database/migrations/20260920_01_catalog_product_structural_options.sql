create or replace function public.set_product_structural_option_group(
    p_product_id bigint,
    p_option_group_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_group_code text;
begin
    if p_product_id is null or p_product_id <= 0 then
        raise exception 'Producto inválido.';
    end if;

    if not exists (
        select 1
        from public.products
        where id = p_product_id
    ) then
        raise exception 'Producto no encontrado.';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            'product_structural_option:' || p_product_id::text,
            0
        )
    );

    if p_option_group_id is not null then
        select code
        into v_group_code
        from public.catalog_option_groups
        where id = p_option_group_id
          and is_active = true;

        if v_group_code is null then
            raise exception 'Grupo de opciones inválido o inactivo.';
        end if;

        if v_group_code not in (
            'brownie_variety',
            'mineral_water_type',
            'coffee_type'
        ) then
            raise exception 'El grupo indicado no es una opción estructural administrable.';
        end if;
    end if;

    delete from public.product_option_rules por
    using public.catalog_option_groups cog
    where por.product_id = p_product_id
      and cog.id = por.option_group_id
      and cog.code in (
          'brownie_variety',
          'mineral_water_type',
          'coffee_type'
      )
      and (
          p_option_group_id is null
          or por.option_group_id <> p_option_group_id
      );

    if p_option_group_id is not null then
        insert into public.product_option_rules (
            product_id,
            option_group_id,
            min_quantity,
            max_quantity,
            allow_repeat,
            is_required
        )
        values (
            p_product_id,
            p_option_group_id,
            1,
            1,
            false,
            true
        )
        on conflict (product_id, option_group_id)
        do update set
            min_quantity = excluded.min_quantity,
            max_quantity = excluded.max_quantity,
            allow_repeat = excluded.allow_repeat,
            is_required = excluded.is_required;
    end if;
end;
$$;

revoke all on function public.set_product_structural_option_group(bigint, bigint)
from public;

revoke all on function public.set_product_structural_option_group(bigint, bigint)
from anon;

revoke all on function public.set_product_structural_option_group(bigint, bigint)
from authenticated;

grant execute on function public.set_product_structural_option_group(bigint, bigint)
to service_role;