-- ============================================================
-- DEV-ANL-01
-- Analytics Extended Foundation
--
-- Extiende la capa semántica con:
--   - calendario analítico
--   - clientes
--   - loyalty
--   - inventario
--   - caja
-- ============================================================


-- ============================================================
-- 1. CALENDARIO ANALÍTICO
--
-- day_type:
--   weekday = lunes-viernes no feriado
--   weekend_holiday = sábado, domingo o feriado
--
-- Los feriados se mantienen explícitamente mediante
-- is_holiday + holiday_name.
-- ============================================================

CREATE TABLE analytics.calendar (
    calendar_date date PRIMARY KEY,

    calendar_year integer NOT NULL,
    calendar_month integer NOT NULL,
    calendar_day integer NOT NULL,

    iso_week integer NOT NULL,

    day_of_week integer NOT NULL,
    day_name text NOT NULL,

    is_weekend boolean NOT NULL,

    is_holiday boolean NOT NULL DEFAULT false,
    holiday_name text,

    day_type text GENERATED ALWAYS AS (
        CASE
            WHEN is_weekend OR is_holiday
                THEN 'weekend_holiday'
            ELSE 'weekday'
        END
    ) STORED,

    CONSTRAINT analytics_calendar_day_of_week_check
        CHECK (day_of_week BETWEEN 1 AND 7),

    CONSTRAINT analytics_calendar_month_check
        CHECK (calendar_month BETWEEN 1 AND 12),

    CONSTRAINT analytics_calendar_holiday_name_check
        CHECK (
            is_holiday
            OR holiday_name IS NULL
        )
);

-- ============================================================
-- SECURITY
--
-- Tabla analítica interna:
--   - RLS habilitado explícitamente.
--   - Sin policies para anon/authenticated.
--   - service_role mantiene acceso administrativo.
--   - Los clientes no deben consultar esta tabla directamente.
-- ============================================================

ALTER TABLE analytics.calendar ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON analytics.calendar FROM PUBLIC;
REVOKE ALL ON analytics.calendar FROM anon;
REVOKE ALL ON analytics.calendar FROM authenticated;

GRANT SELECT ON analytics.calendar TO service_role;


-- Rango inicial suficientemente amplio para análisis histórico
-- y operación futura sin mantenimiento frecuente.

INSERT INTO analytics.calendar (
    calendar_date,
    calendar_year,
    calendar_month,
    calendar_day,
    iso_week,
    day_of_week,
    day_name,
    is_weekend
)
SELECT
    d::date,

    EXTRACT(YEAR FROM d)::integer,
    EXTRACT(MONTH FROM d)::integer,
    EXTRACT(DAY FROM d)::integer,

    EXTRACT(WEEK FROM d)::integer,

    EXTRACT(ISODOW FROM d)::integer,

    CASE EXTRACT(ISODOW FROM d)::integer
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
        WHEN 7 THEN 'Domingo'
    END,

    EXTRACT(ISODOW FROM d)::integer IN (6, 7)

FROM generate_series(
    DATE '2025-01-01',
    DATE '2030-12-31',
    INTERVAL '1 day'
) AS d;


-- ============================================================
-- 2. CLIENTES ANALÍTICOS
--
-- Grano:
--   1 fila = 1 cliente registrado.
--
-- Las métricas comerciales se derivan EXCLUSIVAMENTE desde
-- ventas válidas de analytics.v_sales.
--
-- No se inventa un cliente para ventas anónimas.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_customers
WITH (security_invoker = true)
AS
SELECT
    c.id AS customer_id,
    c.nombre AS customer_name,
    c.correo AS email,
    c.telefono AS phone,

    c."created_At" AS customer_created_at,
    c.email_verificado AS email_verified,
    c.tarjeta_activa AS card_active,

    COUNT(vs.sale_id) AS valid_ticket_count,

    COALESCE(
        SUM(vs.revenue),
        0
    ) AS lifetime_observed_revenue,

    CASE
        WHEN COUNT(vs.sale_id) = 0
            THEN NULL
        ELSE
            SUM(vs.revenue)::numeric
            / COUNT(vs.sale_id)
    END AS observed_average_ticket,

    MIN(vs.business_date)
        AS first_observed_purchase_date,

    MAX(vs.business_date)
        AS last_observed_purchase_date,

    MAX(vs.confirmed_at)
        AS last_observed_purchase_at,

    CASE
        WHEN MAX(vs.business_date) IS NULL
            THEN NULL
        ELSE
            CURRENT_DATE - MAX(vs.business_date)
    END AS days_since_last_purchase

FROM public.clientes c

LEFT JOIN analytics.v_sales vs
    ON vs.customer_id = c.id

GROUP BY
    c.id,
    c.nombre,
    c.correo,
    c.telefono,
    c."created_At",
    c.email_verificado,
    c.tarjeta_activa;


-- ============================================================
-- 3. LOYALTY MOVEMENTS
--
-- Grano:
--   1 fila = 1 movimiento loyalty.
--
-- Se clasifica el movimiento para impedir que migraciones,
-- correcciones o restauraciones se mezclen con performance
-- orgánica.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_loyalty_movements
WITH (security_invoker = true)
AS
SELECT
    lm.*,

    CASE
        WHEN lm.movement_type = 'sale_credit'
            THEN 'organic_sale_credit'

        WHEN lm.movement_type = 'sale_reversal'
            THEN 'organic_sale_reversal'

        WHEN lm.movement_type = 'reward_conversion'
            THEN 'reward_conversion'

        WHEN lm.movement_type IN (
            'historical_opening_balance',
            'historical_opening_reversal',
            'baseline_restoration'
        )
            THEN 'historical_migration'

        WHEN lm.movement_type = 'incident_correction'
            THEN 'correction'

        ELSE 'other'
    END AS analytics_movement_group,

    (
        lm.movement_type IN (
            'sale_credit',
            'sale_reversal',
            'reward_conversion'
        )
    ) AS is_organic_program_activity

FROM public.loyalty_movements lm;


-- ============================================================
-- 4. REWARDS
--
-- Grano:
--   1 fila = 1 reward.
--
-- Mantiene source para distinguir loyalty_engine de legacy.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_rewards
WITH (security_invoker = true)
AS
SELECT
    cr.*,

    CASE
        WHEN cr.source = 'loyalty_engine'
            THEN 'current_engine'
        ELSE 'legacy_or_other'
    END AS analytics_reward_group

FROM public.customer_rewards cr;


-- ============================================================
-- 5. INVENTARIO — STOCK ACTUAL
--
-- Grano:
--   1 fila = 1 inventory_item.
--
-- Estado actual; no representa historia.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_inventory_stock
WITH (security_invoker = true)
AS
SELECT
    ii.id AS inventory_item_id,
    ii.code AS inventory_code,
    ii.name AS inventory_name,

    ii.product_id,
    ii.option_value_id,

    ist.quantity AS current_quantity,

    (COALESCE(ist.quantity, 0) <= 0)
        AS is_stockout

FROM public.inventory_items ii

LEFT JOIN public.inventory_stock ist
    ON ist.inventory_item_id = ii.id;


-- ============================================================
-- 6. INVENTARIO — MOVIMIENTOS
--
-- Grano:
--   1 fila = 1 movimiento efectivo de inventario.
--
-- quantity_change es el impacto efectivo.
-- Solo transacciones POSTED forman parte de esta vista.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_inventory_movements
WITH (security_invoker = true)
AS
SELECT
    im.*,

    it.transaction_type_id,
    itt.code AS transaction_type_code,
    itt.name AS transaction_type_name,

    it.reference_type,
    it.reference_id,
    it.reference_number,

    CASE
        WHEN itt.code IN (
            'POSITIVE_ADJUSTMENT',
            'ADJUSTMENT_POSITIVE'
        )
            THEN 'ADJUSTMENT_POSITIVE'

        WHEN itt.code IN (
            'NEGATIVE_ADJUSTMENT',
            'ADJUSTMENT_NEGATIVE'
        )
            THEN 'ADJUSTMENT_NEGATIVE'

        ELSE itt.code
    END AS analytics_transaction_type

FROM public.inventory_movements im

JOIN public.inventory_transactions it
    ON it.id = im.transaction_id

JOIN public.inventory_transaction_types itt
    ON itt.id = it.transaction_type_id

WHERE it.status = 'POSTED';


-- ============================================================
-- 7. CAJA
--
-- Grano:
--   1 fila = 1 sesión de caja.
--
-- cash_difference:
--   0  = BALANCED
--   <0 = SHORT
--   >0 = OVER
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_cash_sessions
WITH (security_invoker = true)
AS
SELECT
    crs.id AS cash_register_session_id,
    crs.status,

    crs.opened_at,
    crs.closed_at,

    crs.opening_amount,
    crs.expected_cash_amount,
    crs.counted_cash_amount,
    crs.cash_difference,

    ABS(crs.cash_difference)
        AS absolute_cash_difference,

    CASE
        WHEN crs.cash_difference IS NULL
            THEN NULL

        WHEN crs.cash_difference = 0
            THEN 'BALANCED'

        WHEN crs.cash_difference < 0
            THEN 'SHORT'

        ELSE 'OVER'
    END AS balancing_status

FROM public.cash_register_sessions crs;


-- ============================================================
-- 8. PERMISOS
-- ============================================================

REVOKE ALL ON analytics.calendar FROM PUBLIC;
REVOKE ALL ON analytics.calendar FROM anon;
REVOKE ALL ON analytics.calendar FROM authenticated;

GRANT SELECT ON analytics.calendar TO service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO service_role;