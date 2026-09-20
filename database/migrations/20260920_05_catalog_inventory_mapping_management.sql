-- ============================================================
-- DEV-CAT-01.6D
-- Administración segura de componentes de inventario.
--
-- Un mapping activo hace que el producto consuma sus componentes
-- configurados en product_inventory_mappings.
-- ============================================================

begin;

create or replace function public.set_product_inventory_mapping(
  p_product_id bigint,
  p_inventory_item_id bigint,
  p_quantity numeric,
  p_is_active boolean
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mapping_id bigint;
  v_component_product_id bigint;
  v_component_source text;
  v_component_option_value_id bigint;
  v_component_is_active boolean;
begin
  -- Serializa cambios de configuración de inventario del producto.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'product_inventory_mapping:' || p_product_id::text,
      0
    )
  );

  if p_product_id is null then
    raise exception 'Producto inválido.';
  end if;

  if p_inventory_item_id is null then
    raise exception 'Ítem de inventario inválido.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
  ) then
    raise exception 'Producto no encontrado.';
  end if;

  select
    ii.product_id,
    ii.inventory_source,
    ii.option_value_id,
    ii.is_active
  into
    v_component_product_id,
    v_component_source,
    v_component_option_value_id,
    v_component_is_active
  from public.inventory_items ii
  where ii.id = p_inventory_item_id;

  if not found then
    raise exception 'Ítem de inventario no encontrado.';
  end if;

  if p_is_active then
    if not v_component_is_active then
      raise exception 'El ítem de inventario está inactivo.';
    end if;

    if v_component_source is distinct from 'PRODUCT' then
      raise exception
        'El componente debe corresponder a un ítem de inventario de producto.';
    end if;

    if v_component_option_value_id is not null then
      raise exception
        'El componente debe corresponder al ítem base del producto.';
    end if;

    if v_component_product_id is null then
      raise exception
        'El componente no está asociado a un producto.';
    end if;

    if v_component_product_id = p_product_id then
      raise exception
        'Un producto no puede consumirse a sí mismo como componente.';
    end if;

    -- Protección de transición:
    -- un mapping activo tiene precedencia en el resolver actual.
    -- Por eso no permitimos activar mappings sobre un producto
    -- que ya posea inventario directo propio.
    if exists (
      select 1
      from public.inventory_items ii
      where ii.product_id = p_product_id
        and ii.is_active = true
    ) then
      raise exception
        'El producto posee inventario directo activo y no puede configurarse como compuesto.';
    end if;
  end if;

  insert into public.product_inventory_mappings (
    product_id,
    inventory_item_id,
    quantity,
    is_active,
    notes,
    updated_at
  )
  values (
    p_product_id,
    p_inventory_item_id,
    p_quantity,
    p_is_active,
    'Producto compuesto',
    now()
  )
  on conflict (product_id, inventory_item_id)
  do update set
    quantity = excluded.quantity,
    is_active = excluded.is_active,
    updated_at = now()
  returning id into v_mapping_id;

  return v_mapping_id;
end;
$$;

revoke all
  on function public.set_product_inventory_mapping(
    bigint,
    bigint,
    numeric,
    boolean
  )
  from public;

revoke all
  on function public.set_product_inventory_mapping(
    bigint,
    bigint,
    numeric,
    boolean
  )
  from anon;

revoke all
  on function public.set_product_inventory_mapping(
    bigint,
    bigint,
    numeric,
    boolean
  )
  from authenticated;

grant execute
  on function public.set_product_inventory_mapping(
    bigint,
    bigint,
    numeric,
    boolean
  )
  to service_role;

comment on function public.set_product_inventory_mapping(
  bigint,
  bigint,
  numeric,
  boolean
)
is
'Administra de forma transaccional los componentes de inventario de un producto compuesto.';

commit;