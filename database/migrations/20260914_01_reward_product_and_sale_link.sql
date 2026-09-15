-- ============================================================
-- DEV-LOY-RED-01B.1
-- Relación canónica reward -> producto y reward -> venta
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Producto asociado al premio
-- ------------------------------------------------------------

alter table public.customer_rewards
add column if not exists reward_product_id bigint;

alter table public.customer_rewards
drop constraint if exists customer_rewards_reward_product_id_fkey;

alter table public.customer_rewards
add constraint customer_rewards_reward_product_id_fkey
foreign key (reward_product_id)
references public.products(id);


-- ------------------------------------------------------------
-- 2. Venta donde se utilizó el premio
-- ------------------------------------------------------------

alter table public.customer_rewards
add column if not exists redeemed_sale_id bigint;

alter table public.customer_rewards
drop constraint if exists customer_rewards_redeemed_sale_id_fkey;

alter table public.customer_rewards
add constraint customer_rewards_redeemed_sale_id_fkey
foreign key (redeemed_sale_id)
references public.sales(id);


-- ------------------------------------------------------------
-- 3. Backfill seguro
--
-- Todos los rewards de loyalty "Helado simple gratis"
-- corresponden inequívocamente a HEL-SIMPLE.
--
-- No reinterpretamos rewards históricos de campañas que
-- permitían elegir entre topping y baño de chocolate.
-- ------------------------------------------------------------

update public.customer_rewards cr
set reward_product_id = p.id
from public.products p
where p.sku = 'HEL-SIMPLE'
  and cr.reward_type = 'loyalty'
  and lower(trim(cr.name)) = 'helado simple gratis'
  and cr.reward_product_id is null;


-- Compatibilidad con rewards legacy normalizados bajo demanda
-- que corresponden inequívocamente al premio histórico
-- "Helado simple gratis".
update public.customer_rewards cr
set reward_product_id = p.id
from public.products p
where p.sku = 'HEL-SIMPLE'
  and cr.reward_type = 'legacy'
  and lower(trim(cr.name)) = 'helado simple gratis'
  and cr.reward_product_id is null;


-- ------------------------------------------------------------
-- 4. Índices de trazabilidad
-- ------------------------------------------------------------

create index if not exists idx_customer_rewards_reward_product_id
on public.customer_rewards(reward_product_id);

create index if not exists idx_customer_rewards_redeemed_sale_id
on public.customer_rewards(redeemed_sale_id)
where redeemed_sale_id is not null;


-- Un reward solamente puede quedar asociado a una venta.
-- La propia PK del reward ya garantiza un único redeemed_sale_id.
-- No imponemos UNIQUE sobre redeemed_sale_id porque dejamos
-- abierta la posibilidad futura de más de un reward por venta.
-- ------------------------------------------------------------

commit;