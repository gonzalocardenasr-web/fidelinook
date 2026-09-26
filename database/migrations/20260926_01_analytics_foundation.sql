-- ============================================================
-- DEV-ANL-01
-- Analytics Foundation
--
-- Objetivo:
-- Crear la primera capa semántica analítica de Plataforma Nook.
--
-- Principios:
--   DATA -> METRICS -> VISUALIZATION
--   - Las tablas operacionales siguen siendo source of truth.
--   - No se duplican hechos.
--   - Las métricas posteriores deben consumir esta capa.
--   - Ventas válidas:
--       sales.status = 'confirmed'
--       sales.payment_status = 'paid'
-- ============================================================


-- ============================================================
-- 1. SCHEMA ANALYTICS
-- ============================================================

CREATE SCHEMA IF NOT EXISTS analytics;

REVOKE ALL ON SCHEMA analytics FROM PUBLIC;
GRANT USAGE ON SCHEMA analytics TO service_role;


-- ============================================================
-- 2. VENTAS CANÓNICAS
--
-- Grano:
--   1 fila = 1 venta válida.
--
-- Fecha comercial:
--   orders.business_date
--
-- Tiempo local:
--   sales.confirmed_at convertido a America/Santiago.
--
-- Canal:
--   snapshot sales.channel enriquecido con sales_channels.
--
-- Medio de pago:
--   se conserva raw y se agrega agrupación analítica.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sales
WITH (security_invoker = true)
AS
SELECT
    s.id AS sale_id,
    s.sale_number,

    o.id AS order_id,
    o.business_date,

    s.confirmed_at,
    s.confirmed_at AT TIME ZONE 'America/Santiago'
        AS confirmed_at_local,

    (s.confirmed_at AT TIME ZONE 'America/Santiago')::time
        AS confirmed_time_local,

    EXTRACT(
        HOUR FROM
        s.confirmed_at AT TIME ZONE 'America/Santiago'
    )::integer AS confirmed_hour,

    s.customer_id,
    (s.customer_id IS NOT NULL) AS is_identified,

    s.channel AS channel_code,
    sc.name AS channel_name,
    sc.channel_type,

    s.payment_method AS payment_method_raw,

    CASE
        WHEN s.payment_method IN ('credito', 'debito', 'tarjeta')
            THEN 'Tarjeta'

        WHEN s.payment_method = 'efectivo'
            THEN 'Efectivo'

        WHEN s.payment_method = 'transferencia'
            THEN 'Transferencia'

        WHEN s.payment_method = 'pago_electronico'
            THEN 'Pago electrónico externo'

        WHEN s.payment_method = 'manual'
            THEN 'Manual/legacy'

        ELSE 'Otro'
    END AS payment_method_group,

    s.subtotal AS gross_revenue,
    s.discount_total,
    s.total AS revenue,

    s.manual_discount_type,
    s.manual_discount_value,
    s.manual_discount_amount,
    s.manual_discount_reason,

    s.promotional_stamps,
    s.promotion_reason,

    s.loyalty_eligible_total,

    s.cash_register_session_id,

    s.external_order_id,
    s.integration_source,

    s.status,
    s.payment_status

FROM public.sales s

JOIN public.orders o
    ON o.sale_id = s.id

LEFT JOIN public.sales_channels sc
    ON sc.code = s.channel

WHERE s.status = 'confirmed'
  AND s.payment_status = 'paid';


-- ============================================================
-- 3. LÍNEAS DE VENTA CANÓNICAS
--
-- Grano:
--   1 fila = 1 sale_item perteneciente a una venta válida.
--
-- IMPORTANTE:
--   La validez depende de sales, NO de sale_items.status.
--
-- Los atributos product_sku / product_name / precios son
-- snapshots históricos de la venta.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sale_items
WITH (security_invoker = true)
AS
SELECT
    si.id AS sale_item_id,
    si.sale_id,

    vs.order_id,
    vs.business_date,
    vs.confirmed_at,
    vs.confirmed_at_local,
    vs.confirmed_hour,

    vs.customer_id,
    vs.is_identified,

    vs.channel_code,
    vs.channel_name,
    vs.channel_type,

    si.product_id,
    si.product_sku,
    si.product_name,

    si.quantity,
    si.list_unit_price,
    si.unit_price,
    si.total_price,
    si.discount_total,

    si.is_gift,
    si.gift_reason,
    si.item_type,
    si.loyalty_eligible,

    si.status AS sale_item_status,
    si.created_at AS sale_item_created_at

FROM public.sale_items si

JOIN analytics.v_sales vs
    ON vs.sale_id = si.sale_id;


-- ============================================================
-- 4. OPCIONES / SABORES DE LÍNEA
--
-- Grano:
--   1 fila = 1 opción asociada a una línea de venta válida.
--
-- Permite analizar sabores, tipos de café y futuras opciones
-- estructurales sin reconstruir la venta desde catálogo actual.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sale_item_options
WITH (security_invoker = true)
AS
SELECT
    sio.id AS sale_item_option_id,
    sio.sale_item_id,

    vsi.sale_id,
    vsi.order_id,
    vsi.business_date,
    vsi.confirmed_at,
    vsi.confirmed_at_local,

    vsi.customer_id,
    vsi.is_identified,

    vsi.channel_code,

    vsi.product_id,
    vsi.product_sku,
    vsi.product_name,

    sio.option_group_code,
    sio.option_value_id,
    sio.option_value_name,
    sio.quantity AS option_quantity,

    sio.created_at AS option_created_at

FROM public.sale_item_options sio

JOIN analytics.v_sale_items vsi
    ON vsi.sale_item_id = sio.sale_item_id;


-- ============================================================
-- 5. OPERACIÓN / PEDIDOS
--
-- Grano:
--   1 fila = 1 order.
--
-- Esta vista NO es fuente de revenue.
--
-- Métricas temporales:
--   waiting_for_preparation
--       preparation_started_at - created_at
--
--   effective_preparation
--       ready_at - preparation_started_at
--
--   time_until_ready
--       ready_at - created_at
--
-- Se expresan en segundos para permitir AVG, percentile_cont,
-- medianas y P90 sin depender de interval formatting.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_orders
WITH (security_invoker = true)
AS
SELECT
    o.id AS order_id,
    o.sale_id,

    o.business_date,
    o.daily_order_number,
    o.display_order_code,

    o.status AS order_status,

    o.created_at,
    o.preparation_started_at,
    o.ready_at,
    o.delivered_at,
    o.cancelled_at,

    CASE
        WHEN o.preparation_started_at IS NOT NULL
        THEN EXTRACT(
            EPOCH FROM (
                o.preparation_started_at - o.created_at
            )
        )
    END AS waiting_for_preparation_seconds,

    CASE
        WHEN o.preparation_started_at IS NOT NULL
         AND o.ready_at IS NOT NULL
        THEN EXTRACT(
            EPOCH FROM (
                o.ready_at - o.preparation_started_at
            )
        )
    END AS effective_preparation_seconds,

    CASE
        WHEN o.ready_at IS NOT NULL
        THEN EXTRACT(
            EPOCH FROM (
                o.ready_at - o.created_at
            )
        )
    END AS time_until_ready_seconds,

    (
        o.preparation_started_at IS NOT NULL
        AND o.ready_at IS NOT NULL
    ) AS has_complete_preparation_timestamps,

    CASE
        WHEN o.preparation_started_at IS NULL
            THEN false
        ELSE o.preparation_started_at < o.created_at
    END AS invalid_preparation_before_creation,

    CASE
        WHEN o.preparation_started_at IS NULL
          OR o.ready_at IS NULL
            THEN false
        ELSE o.ready_at < o.preparation_started_at
    END AS invalid_ready_before_preparation,

    CASE
        WHEN o.ready_at IS NULL
          OR o.delivered_at IS NULL
            THEN false
        ELSE o.delivered_at < o.ready_at
    END AS invalid_delivery_before_ready,

    o.notes

FROM public.orders o;


-- ============================================================
-- 6. PERMISOS
--
-- Capa analítica interna.
-- No se expone directamente a anon/authenticated.
-- ============================================================

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO service_role;