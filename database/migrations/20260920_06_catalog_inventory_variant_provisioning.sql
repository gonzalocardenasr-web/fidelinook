-- ============================================================
-- DEV-CAT-01.6E
-- Provisionamiento seguro de variantes inventariables.
--
-- Permite asociar una opción existente a un producto configurable
-- mediante un inventory_item propio del producto.
-- ============================================================

begin;

create or replace function public.create_product_inventory_variant(
  p_product_id bigint,
  p_option_value_id bigint,
  p_item_type text,
  p_unit text,
  p_consumption_quantity numeric default 1
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_option public.catalog_option_values%rowtype;
  v_group public.catalog_option_groups%rowtype;
  v_inventory_item_id bigint;
  v_inventory_code text;
  v_inventory_name text;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      'product_inventory_variant:'
      || p_product_id::text
      || ':'
      || p_option_value_id::text
      || ':'
      || coalesce(p_item_type, ''),
      0
    )
  );

  if p_product_id is null then
    raise exception 'Producto inválido.';
  end if;

  if p_option_value_id is null then
    raise exception 'Opción inválida.';
  end if;

  if p_item_type is null
     or p_item_type not in ('PREPARED_PRODUCT', 'RESALE_PRODUCT')
  then
    raise exception 'Tipo de inventario no permitido.';
  end if;

  if p_unit is null
     or p_unit not in ('UNIT', 'JAR', 'BAG', 'BOX', 'PACK')
  then
    raise exception 'Unidad de inventario no permitida.';
  end if;

  if p_consumption_quantity is null
     or p_consumption_quantity <= 0
  then
    raise exception 'La cantidad de consumo debe ser mayor que cero.';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Producto no encontrado.';
  end if;

  if not v_product.is_active then
    raise exception 'El producto está inactivo.';
  end if;

  select *
  into v_option
  from public.catalog_option_values
  where id = p_option_value_id;

  if not found then
    raise exception 'Opción no encontrada.';
  end if;

  if not v_option.is_active then
    raise exception 'La opción está inactiva.';
  end if;

  select *
  into v_group
  from public.catalog_option_groups
  where id = v_option.group_id;

  if not found or not v_group.is_active then
    raise exception 'El grupo de opciones no está activo.';
  end if;

  -- Esta primera versión administra exclusivamente variantes
  -- inventariables por sabor.
  if not v_product.has_flavors then
    raise exception
      'El producto no está configurado para administrar variantes por sabor.';
  end if;

  if v_group.code <> 'flavor' then
    raise exception
      'La opción seleccionada debe pertenecer al grupo de sabores.';
  end if;

  if exists (
    select 1
    from public.inventory_items ii
    where ii.product_id = p_product_id
      and ii.option_value_id = p_option_value_id
      and ii.item_type = p_item_type
  ) then
    raise exception
      'La variante de inventario ya existe para este producto.';
  end if;

  v_inventory_code :=
    v_product.sku || '-' || v_option.code;

  v_inventory_name :=
    v_product.name || ' ' || v_option.name;

  insert into public.inventory_items (
    code,
    name,
    item_type,
    unit,
    product_id,
    option_value_id,
    allow_negative_stock,
    is_active,
    inventory_source,
    consumption_quantity,
    updated_at
  )
  values (
    v_inventory_code,
    v_inventory_name,
    p_item_type,
    p_unit,
    p_product_id,
    p_option_value_id,
    false,
    true,
    'PRODUCT',
    p_consumption_quantity,
    now()
  )
  returning id into v_inventory_item_id;

  return v_inventory_item_id;
end;
$$;

revoke all
  on function public.create_product_inventory_variant(
    bigint,
    bigint,
    text,
    text,
    numeric
  )
  from public;

revoke all
  on function public.create_product_inventory_variant(
    bigint,
    bigint,
    text,
    text,
    numeric
  )
  from anon;

revoke all
  on function public.create_product_inventory_variant(
    bigint,
    bigint,
    text,
    text,
    numeric
  )
  from authenticated;

grant execute
  on function public.create_product_inventory_variant(
    bigint,
    bigint,
    text,
    text,
    numeric
  )
  to service_role;

comment on function public.create_product_inventory_variant(
  bigint,
  bigint,
  text,
  text,
  numeric
)
is
'Provisiona de forma segura una variante inventariable para un producto configurable usando una opción existente.';

commit;