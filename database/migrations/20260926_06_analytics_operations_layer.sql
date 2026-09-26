-- ============================================================
-- DEV-ANL-01.3L + ANL-01.6 + ANL-01.7
-- Loyalty, Inventory, Operations & Cash Analytics Layer
-- ============================================================


-- ============================================================
-- 1. LOYALTY CURRENT PROGRAM SUMMARY
-- Grain: 1 row
--
-- Only organic/current-program activity.
-- Historical migrations and corrections remain outside
-- current-program performance.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_loyalty_current_summary
WITH (security_invoker = true)
AS
WITH movements AS (
    SELECT
        COUNT(*) FILTER (
            WHERE movement_type = 'sale_credit'
        ) AS sale_credit_movements,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE movement_type = 'sale_credit'
        ) AS customers_earning_stamps,

        COALESCE(SUM(stamp_delta) FILTER (
            WHERE movement_type = 'sale_credit'
        ), 0) AS stamps_earned_from_sales,

        COUNT(*) FILTER (
            WHERE movement_type = 'sale_reversal'
        ) AS sale_reversal_movements,

        COALESCE(SUM(stamp_delta) FILTER (
            WHERE movement_type = 'sale_reversal'
        ), 0) AS stamps_reversed,

        COUNT(*) FILTER (
            WHERE movement_type = 'reward_conversion'
        ) AS reward_conversion_movements,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE movement_type = 'reward_conversion'
        ) AS customers_converting_rewards,

        COALESCE(SUM(ABS(stamp_delta)) FILTER (
            WHERE movement_type = 'reward_conversion'
        ), 0) AS stamps_converted_to_rewards

    FROM analytics.v_loyalty_movements
    WHERE is_organic_program_activity
),
rewards AS (
    SELECT
        COUNT(*) AS current_engine_rewards,

        COUNT(*) FILTER (
            WHERE status = 'active'
        ) AS active_rewards,

        COUNT(*) FILTER (
            WHERE status = 'redeemed'
        ) AS redeemed_rewards,

        COUNT(*) FILTER (
            WHERE status = 'expired'
        ) AS expired_rewards,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE status = 'redeemed'
        ) AS customers_redeeming_rewards

    FROM analytics.v_rewards
    WHERE analytics_reward_group = 'current_engine'
)
SELECT
    m.sale_credit_movements,
    m.customers_earning_stamps,
    m.stamps_earned_from_sales,

    m.sale_reversal_movements,
    m.stamps_reversed,

    m.reward_conversion_movements,
    m.customers_converting_rewards,
    m.stamps_converted_to_rewards,

    r.current_engine_rewards,
    r.active_rewards,
    r.redeemed_rewards,
    r.expired_rewards,
    r.customers_redeeming_rewards

FROM movements m
CROSS JOIN rewards r;


-- ============================================================
-- 2. LOYALTY MOVEMENTS DAILY
-- Grain: business/calendar date + analytical movement group
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_loyalty_daily
WITH (security_invoker = true)
AS
SELECT
    (lm.occurred_at AT TIME ZONE 'America/Santiago')::date
        AS activity_date,

    c.calendar_year,
    c.calendar_month,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.day_type,

    lm.analytics_movement_group,
    lm.movement_type,
    lm.is_organic_program_activity,

    COUNT(*) AS movement_count,
    COUNT(DISTINCT lm.customer_id) AS customers,
    SUM(lm.stamp_delta) AS net_stamp_delta,
    SUM(ABS(lm.stamp_delta)) AS absolute_stamp_movement

FROM analytics.v_loyalty_movements lm
LEFT JOIN analytics.calendar c
    ON c.calendar_date =
       (lm.occurred_at AT TIME ZONE 'America/Santiago')::date

GROUP BY
    (lm.occurred_at AT TIME ZONE 'America/Santiago')::date,
    c.calendar_year,
    c.calendar_month,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.day_type,
    lm.analytics_movement_group,
    lm.movement_type,
    lm.is_organic_program_activity;


-- ============================================================
-- 3. INVENTORY CURRENT STATUS
-- Grain: 1 row = inventory item
--
-- No arbitrary low-stock threshold is introduced.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_inventory_current_status
WITH (security_invoker = true)
AS
SELECT
    s.inventory_item_id,
    s.inventory_code,
    s.inventory_name,
    s.product_id,
    s.option_value_id,
    s.current_quantity,
    s.is_stockout,

    CASE
        WHEN s.is_stockout THEN 'stockout'
        ELSE 'in_stock'
    END AS stock_status

FROM analytics.v_inventory_stock s;


-- ============================================================
-- 4. INVENTORY MOVEMENT SUMMARY
-- Grain: inventory item + normalized transaction type
--
-- Uses quantity_change as the effective signed impact.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_inventory_movement_summary
WITH (security_invoker = true)
AS
SELECT
    im.inventory_item_id,
    s.inventory_code,
    s.inventory_name,

    im.analytics_transaction_type,

    COUNT(*) AS movement_rows,

    SUM(im.quantity_change) AS net_quantity_change,
    SUM(ABS(im.quantity_change)) AS absolute_quantity_movement,

    MIN(im.created_at) AS first_movement_at,
    MAX(im.created_at) AS last_movement_at

FROM analytics.v_inventory_movements im
LEFT JOIN analytics.v_inventory_stock s
    ON s.inventory_item_id = im.inventory_item_id

GROUP BY
    im.inventory_item_id,
    s.inventory_code,
    s.inventory_name,
    im.analytics_transaction_type;


-- ============================================================
-- 5. INVENTORY DAILY
-- Grain: date + inventory item + transaction type
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_inventory_daily
WITH (security_invoker = true)
AS
SELECT
    (im.created_at AT TIME ZONE 'America/Santiago')::date
        AS movement_date,

    c.calendar_year,
    c.calendar_month,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.day_type,

    im.inventory_item_id,
    s.inventory_code,
    s.inventory_name,

    im.analytics_transaction_type,

    COUNT(*) AS movement_rows,
    SUM(im.quantity_change) AS net_quantity_change,
    SUM(ABS(im.quantity_change)) AS absolute_quantity_movement

FROM analytics.v_inventory_movements im

LEFT JOIN analytics.v_inventory_stock s
    ON s.inventory_item_id = im.inventory_item_id

LEFT JOIN analytics.calendar c
    ON c.calendar_date =
       (im.created_at AT TIME ZONE 'America/Santiago')::date

GROUP BY
    (im.created_at AT TIME ZONE 'America/Santiago')::date,
    c.calendar_year,
    c.calendar_month,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.day_type,
    im.inventory_item_id,
    s.inventory_code,
    s.inventory_name,
    im.analytics_transaction_type;


-- ============================================================
-- 6. ORDER PREPARATION PERFORMANCE
-- Grain: 1 row = order
--
-- Does not use delivered_at as preparation time.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_order_preparation
WITH (security_invoker = true)
AS
SELECT
    o.order_id,
    o.sale_id,
    o.business_date,
    o.daily_order_number,
    o.display_order_code,
    o.order_status,

    o.created_at,
    o.preparation_started_at,
    o.ready_at,
    o.delivered_at,
    o.cancelled_at,

    o.waiting_for_preparation_seconds,
    o.effective_preparation_seconds,
    o.time_until_ready_seconds,

    o.has_complete_preparation_timestamps,

    NOT (
        o.invalid_preparation_before_creation
        OR o.invalid_ready_before_preparation
        OR o.invalid_delivery_before_ready
    ) AS has_valid_temporal_sequence,

    c.calendar_year,
    c.calendar_month,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.day_type

FROM analytics.v_orders o
LEFT JOIN analytics.calendar c
    ON c.calendar_date = o.business_date;


-- ============================================================
-- 7. ORDER PREPARATION SUMMARY
-- Grain: 1 row
--
-- Median is the principal measure.
-- Average is complementary.
-- Only complete and temporally valid observations participate.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_order_preparation_summary
WITH (security_invoker = true)
AS
WITH valid_orders AS (
    SELECT *
    FROM analytics.v_order_preparation
    WHERE has_complete_preparation_timestamps
      AND has_valid_temporal_sequence
      AND order_status <> 'CANCELLED'
)
SELECT
    (SELECT COUNT(*)
     FROM analytics.v_order_preparation)
        AS total_orders,

    (SELECT COUNT(*)
     FROM analytics.v_order_preparation
     WHERE has_complete_preparation_timestamps
       AND has_valid_temporal_sequence
       AND order_status <> 'CANCELLED')
        AS orders_with_valid_preparation_timing,

    AVG(waiting_for_preparation_seconds)
        AS average_waiting_for_preparation_seconds,

    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY waiting_for_preparation_seconds
    ) AS median_waiting_for_preparation_seconds,

    AVG(effective_preparation_seconds)
        AS average_effective_preparation_seconds,

    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY effective_preparation_seconds
    ) AS median_effective_preparation_seconds,

    AVG(time_until_ready_seconds)
        AS average_time_until_ready_seconds,

    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY time_until_ready_seconds
    ) AS median_time_until_ready_seconds

FROM valid_orders;


-- ============================================================
-- 8. CASH SESSION PERFORMANCE
-- Grain: 1 row = cash-register session
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_cash_session_performance
WITH (security_invoker = true)
AS
SELECT
    cs.*,

    (cs.opened_at AT TIME ZONE 'America/Santiago')::date
        AS opened_date,

    (cs.closed_at AT TIME ZONE 'America/Santiago')::date
        AS closed_date,

    c.day_name AS opened_day_name,
    c.day_type AS opened_day_type

FROM analytics.v_cash_sessions cs

LEFT JOIN analytics.calendar c
    ON c.calendar_date =
       (cs.opened_at AT TIME ZONE 'America/Santiago')::date;


-- ============================================================
-- 9. CASH BALANCING SUMMARY
-- Grain: 1 row
--
-- Signed and absolute differences are intentionally separate.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_cash_balancing_summary
WITH (security_invoker = true)
AS
SELECT
    COUNT(*) AS sessions,

    COUNT(*) FILTER (
        WHERE status = 'CLOSED'
    ) AS closed_sessions,

    COUNT(*) FILTER (
        WHERE status = 'OPEN'
    ) AS open_sessions,

    COUNT(*) FILTER (
        WHERE status = 'CLOSED'
          AND balancing_status = 'BALANCED'
    ) AS balanced_sessions,

    COUNT(*) FILTER (
        WHERE status = 'CLOSED'
          AND balancing_status = 'SHORT'
    ) AS short_sessions,

    COUNT(*) FILTER (
        WHERE status = 'CLOSED'
          AND balancing_status = 'OVER'
    ) AS over_sessions,

    COALESCE(SUM(cash_difference) FILTER (
        WHERE status = 'CLOSED'
    ), 0) AS signed_closed_difference,

    COALESCE(SUM(absolute_cash_difference) FILTER (
        WHERE status = 'CLOSED'
    ), 0) AS absolute_closed_difference

FROM analytics.v_cash_sessions;


-- ============================================================
-- 10. PAYMENT METHOD PERFORMANCE
-- Grain: grouped payment method
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_payment_method_performance
WITH (security_invoker = true)
AS
WITH payment_metrics AS (
    SELECT
        payment_method_group,

        COUNT(*) AS tickets,
        SUM(gross_revenue) AS gross_revenue,
        SUM(discount_total) AS discounts,
        SUM(revenue) AS revenue,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE customer_id IS NOT NULL
        ) AS identified_customers

    FROM analytics.v_sales
    GROUP BY payment_method_group
),
totals AS (
    SELECT
        SUM(revenue) AS total_revenue
    FROM analytics.v_sales
)
SELECT
    pm.*,

    CASE
        WHEN pm.tickets > 0
        THEN pm.revenue::numeric / pm.tickets
        ELSE NULL
    END AS average_ticket,

    CASE
        WHEN t.total_revenue <> 0
        THEN pm.revenue::numeric / t.total_revenue
        ELSE NULL
    END AS revenue_mix

FROM payment_metrics pm
CROSS JOIN totals t;


-- ============================================================
-- 11. RAW PAYMENT METHOD PERFORMANCE
-- Preserves historical raw payment values.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_payment_method_raw_performance
WITH (security_invoker = true)
AS
SELECT
    payment_method_raw,

    COUNT(*) AS tickets,
    SUM(gross_revenue) AS gross_revenue,
    SUM(discount_total) AS discounts,
    SUM(revenue) AS revenue,

    CASE
        WHEN COUNT(*) > 0
        THEN SUM(revenue)::numeric / COUNT(*)
        ELSE NULL
    END AS average_ticket

FROM analytics.v_sales
GROUP BY payment_method_raw;


-- ============================================================
-- 12. SECURITY
-- ============================================================

REVOKE ALL ON analytics.v_loyalty_current_summary
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_loyalty_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_inventory_current_status
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_inventory_movement_summary
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_inventory_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_order_preparation
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_order_preparation_summary
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_cash_session_performance
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_cash_balancing_summary
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_payment_method_performance
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_payment_method_raw_performance
    FROM PUBLIC, anon, authenticated;


GRANT SELECT ON analytics.v_loyalty_current_summary
    TO service_role;

GRANT SELECT ON analytics.v_loyalty_daily
    TO service_role;

GRANT SELECT ON analytics.v_inventory_current_status
    TO service_role;

GRANT SELECT ON analytics.v_inventory_movement_summary
    TO service_role;

GRANT SELECT ON analytics.v_inventory_daily
    TO service_role;

GRANT SELECT ON analytics.v_order_preparation
    TO service_role;

GRANT SELECT ON analytics.v_order_preparation_summary
    TO service_role;

GRANT SELECT ON analytics.v_cash_session_performance
    TO service_role;

GRANT SELECT ON analytics.v_cash_balancing_summary
    TO service_role;

GRANT SELECT ON analytics.v_payment_method_performance
    TO service_role;

GRANT SELECT ON analytics.v_payment_method_raw_performance
    TO service_role;