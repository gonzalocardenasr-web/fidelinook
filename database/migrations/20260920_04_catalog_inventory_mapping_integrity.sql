-- ============================================================
-- DEV-CAT-01.6D
-- Integridad de componentes de inventario por producto.
--
-- Cada combinación producto + ítem de inventario representa
-- una única relación canónica. La relación se activa/inactiva;
-- no se crean duplicados históricos.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Verificación defensiva
-- ------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.product_inventory_mappings
    group by product_id, inventory_item_id
    having count(*) > 1
  ) then
    raise exception
      'Existen mappings duplicados en product_inventory_mappings.';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2. Unicidad lógica producto + componente
-- ------------------------------------------------------------

alter table public.product_inventory_mappings
  add constraint product_inventory_mappings_product_item_unique
  unique (product_id, inventory_item_id);

comment on constraint product_inventory_mappings_product_item_unique
  on public.product_inventory_mappings
  is
  'Garantiza una única relación canónica entre producto e ítem de inventario. La vigencia se controla mediante is_active.';

commit;