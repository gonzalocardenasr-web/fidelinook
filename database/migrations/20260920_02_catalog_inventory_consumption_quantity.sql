-- ============================================================
-- DEV-CAT-01.6
-- Operational inventory consumption quantity
--
-- Separates inventory consumption rules from commercial pricing.
-- product_option_prices.inventory_quantity remains temporarily
-- for backwards compatibility, but inventory_items becomes the
-- canonical home for standard consumption quantity.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Add canonical operational consumption quantity
-- ------------------------------------------------------------

alter table public.inventory_items
add column consumption_quantity numeric;


-- ------------------------------------------------------------
-- 2. Backfill
--
-- Default operational consumption is 1.
--
-- For inventory items linked to product + option, preserve the
-- current operational rule from active local/general option
-- pricing when available.
-- ------------------------------------------------------------

update public.inventory_items ii
set consumption_quantity =
    coalesce(
        (
            select pop.inventory_quantity
            from public.product_option_prices pop
            where pop.product_id = ii.product_id
              and pop.option_value_id = ii.option_value_id
              and pop.channel = 'local'
              and pop.price_list = 'general'
              and pop.is_active = true
              and pop.valid_from <= now()
              and (
                    pop.valid_to is null
                    or pop.valid_to > now()
              )
              and pop.inventory_quantity > 0
            order by pop.valid_from desc
            limit 1
        ),
        1
    );


-- ------------------------------------------------------------
-- 3. Make rule mandatory
-- ------------------------------------------------------------

alter table public.inventory_items
alter column consumption_quantity set default 1;

alter table public.inventory_items
alter column consumption_quantity set not null;


-- ------------------------------------------------------------
-- 4. Protect invariant
-- ------------------------------------------------------------

alter table public.inventory_items
add constraint inventory_items_consumption_quantity_chk
check (consumption_quantity > 0);


-- ------------------------------------------------------------
-- 5. Documentation
-- ------------------------------------------------------------

comment on column public.inventory_items.consumption_quantity is
'Cantidad estándar de este ítem de inventario consumida por una unidad de la referencia de catálogo asociada. Fuente operacional canónica; independiente del precio o canal de venta.';