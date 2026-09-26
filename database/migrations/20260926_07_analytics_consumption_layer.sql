-- ============================================================
-- DEV-ANL-01.9
-- Consolidated Analytics Consumption Layer
-- ============================================================


-- ============================================================
-- 1. EXECUTIVE DAILY
-- Grain: 1 row = business date
--
-- Canonical daily consumption layer for executive KPIs.
--
-- IMPORTANT:
-- identified_customers is distinct at DAILY grain.
-- It must NOT be summed across dates to obtain distinct
-- customers for a multi-day period.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_executive_daily
WITH (security_invoker = true)
AS
SELECT
    d.business_date,
    d.calendar_year,
    d.calendar_month,
    d.iso_week,
    d.day_of_week,
    d.day_name,
    d.is_weekend,
    d.is_holiday,
    d.holiday_name,
    d.day_type,

    d.tickets,
    d.gross_revenue,
    d.discounts,
    d.revenue,
    d.average_ticket,

    d.units_sold,
    d.units_per_ticket,

    d.identified_tickets,
    d.identified_customers,
    d.identified_revenue,

    d.identified_ticket_rate,
    d.identified_revenue_rate,
    d.discount_rate

FROM analytics.v_commercial_daily d;


-- ============================================================
-- 2. SALES CONSUMPTION FACT
-- Grain: 1 row = valid sale/ticket
--
-- Preferred backend source for arbitrary-period
-- commercial KPI aggregation.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sales_consumption
WITH (security_invoker = true)
AS
SELECT
    s.sale_id,
    s.sale_number,
    s.order_id,

    s.business_date,
    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,

    s.confirmed_at,
    s.confirmed_at_local,
    s.confirmed_time_local,
    s.confirmed_hour,

    s.customer_id,
    s.is_identified,

    s.channel_code,
    s.channel_name,
    s.channel_type,

    s.payment_method_raw,
    s.payment_method_group,

    s.gross_revenue,
    s.discount_total,
    s.revenue,

    CASE
        WHEN s.gross_revenue <> 0
        THEN s.discount_total::numeric / s.gross_revenue
        ELSE NULL
    END AS discount_rate,

    s.manual_discount_amount,
    s.manual_discount_reason,

    s.promotional_stamps,
    s.promotion_reason,

    s.loyalty_eligible_total,

    s.cash_register_session_id,
    s.external_order_id,
    s.integration_source

FROM analytics.v_sales_enriched s;


-- ============================================================
-- 3. SALE ITEM CONSUMPTION FACT
-- Grain: 1 row = valid sale item
--
-- allocated_revenue is analytical attribution.
-- It reconciles item-level analysis with canonical sale revenue.
-- It MUST NOT be interpreted as transactional item revenue.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sale_item_consumption
WITH (security_invoker = true)
AS
SELECT
    a.sale_item_id,
    a.sale_id,
    a.business_date,

    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,
    s.confirmed_hour,

    s.customer_id,
    s.is_identified,

    s.channel_code,
    s.channel_name,
    s.channel_type,

    a.product_id,
    a.product_sku,
    a.product_name,

    a.current_category AS category,
    a.current_subcategory AS subcategory,
    a.current_operational_type AS operational_type,
    a.is_catalog_product,
    a.analytics_item_group,

    a.quantity,

    a.list_unit_price,
    a.unit_price,
    a.total_price,
    a.discount_total AS item_discount_total,

    a.sale_item_total,
    a.sale_item_discount_total,
    a.ticket_level_discount,
    a.allocated_ticket_discount,
    a.allocated_revenue

FROM analytics.v_sale_item_allocations a

JOIN analytics.v_sales_enriched s
    ON s.sale_id = a.sale_id;


-- ============================================================
-- 4. CUSTOMER CONSUMPTION
-- Grain: 1 row = registered customer
--
-- Current descriptive customer profile.
-- No churn classification is invented.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_customer_consumption
WITH (security_invoker = true)
AS
SELECT
    c.*,

    CASE
        WHEN c.valid_ticket_count > 0 THEN true
        ELSE false
    END AS has_observed_purchase_history

FROM analytics.v_customers c;


-- ============================================================
-- 5. CUSTOMER PRODUCT PREFERENCES
-- Grain: customer + catalog product
--
-- CUSTOM lines are intentionally excluded from catalog-product
-- preference rankings.
--
-- They remain included in full monetary reconciliation through
-- v_sale_item_consumption.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_customer_product_preferences
WITH (security_invoker = true)
AS
SELECT
    i.customer_id,

    i.product_id,
    i.product_sku,
    i.product_name,
    i.category,
    i.subcategory,

    COUNT(DISTINCT i.sale_id) AS tickets,
    SUM(i.quantity) AS units,

    SUM(i.allocated_revenue) AS allocated_revenue,

    MIN(i.business_date) AS first_purchase_date,
    MAX(i.business_date) AS last_purchase_date

FROM analytics.v_sale_item_consumption i

WHERE i.customer_id IS NOT NULL
  AND i.is_catalog_product

GROUP BY
    i.customer_id,
    i.product_id,
    i.product_sku,
    i.product_name,
    i.category,
    i.subcategory;


-- ============================================================
-- 6. CHANNEL DAILY
-- Grain: business date + channel
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_channel_daily
WITH (security_invoker = true)
AS
SELECT
    s.business_date,

    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,

    s.channel_code,
    s.channel_name,
    s.channel_type,

    COUNT(*) AS tickets,
    SUM(s.gross_revenue) AS gross_revenue,
    SUM(s.discount_total) AS discounts,
    SUM(s.revenue) AS revenue,

    COUNT(*) FILTER (
        WHERE s.is_identified
    ) AS identified_tickets,

    COUNT(DISTINCT s.customer_id) FILTER (
        WHERE s.customer_id IS NOT NULL
    ) AS identified_customers,

    CASE
        WHEN COUNT(*) > 0
        THEN SUM(s.revenue)::numeric / COUNT(*)
        ELSE NULL
    END AS average_ticket

FROM analytics.v_sales_consumption s

GROUP BY
    s.business_date,
    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,
    s.channel_code,
    s.channel_name,
    s.channel_type;


-- ============================================================
-- 7. PRODUCT DAILY
-- Grain: business date + catalog product
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_product_daily
WITH (security_invoker = true)
AS
SELECT
    i.business_date,

    i.calendar_year,
    i.calendar_month,
    i.iso_week,
    i.day_of_week,
    i.day_name,
    i.is_weekend,
    i.is_holiday,
    i.holiday_name,
    i.day_type,

    i.product_id,
    i.product_sku,
    i.product_name,
    i.category,
    i.subcategory,

    COUNT(DISTINCT i.sale_id) AS tickets,
    SUM(i.quantity) AS units,

    SUM(i.total_price)
        AS item_revenue_before_ticket_discount,

    SUM(i.allocated_ticket_discount)
        AS allocated_ticket_discount,

    SUM(i.allocated_revenue)
        AS allocated_revenue

FROM analytics.v_sale_item_consumption i

WHERE i.is_catalog_product

GROUP BY
    i.business_date,
    i.calendar_year,
    i.calendar_month,
    i.iso_week,
    i.day_of_week,
    i.day_name,
    i.is_weekend,
    i.is_holiday,
    i.holiday_name,
    i.day_type,
    i.product_id,
    i.product_sku,
    i.product_name,
    i.category,
    i.subcategory;


-- ============================================================
-- 8. PAYMENT METHOD DAILY
-- Grain: business date + grouped/raw payment method
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_payment_method_daily
WITH (security_invoker = true)
AS
SELECT
    s.business_date,

    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,

    s.payment_method_group,
    s.payment_method_raw,

    COUNT(*) AS tickets,
    SUM(s.gross_revenue) AS gross_revenue,
    SUM(s.discount_total) AS discounts,
    SUM(s.revenue) AS revenue,

    CASE
        WHEN COUNT(*) > 0
        THEN SUM(s.revenue)::numeric / COUNT(*)
        ELSE NULL
    END AS average_ticket

FROM analytics.v_sales_consumption s

GROUP BY
    s.business_date,
    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,
    s.payment_method_group,
    s.payment_method_raw;


-- ============================================================
-- 9. HOURLY DAILY
-- Grain: business date + hour
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_hourly_daily
WITH (security_invoker = true)
AS
SELECT
    s.business_date,

    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,

    s.confirmed_hour,

    COUNT(*) AS tickets,
    SUM(s.gross_revenue) AS gross_revenue,
    SUM(s.discount_total) AS discounts,
    SUM(s.revenue) AS revenue,

    COUNT(*) FILTER (
        WHERE s.is_identified
    ) AS identified_tickets,

    COUNT(DISTINCT s.customer_id) FILTER (
        WHERE s.customer_id IS NOT NULL
    ) AS identified_customers,

    CASE
        WHEN COUNT(*) > 0
        THEN SUM(s.revenue)::numeric / COUNT(*)
        ELSE NULL
    END AS average_ticket

FROM analytics.v_sales_consumption s

GROUP BY
    s.business_date,
    s.calendar_year,
    s.calendar_month,
    s.iso_week,
    s.day_of_week,
    s.day_name,
    s.is_weekend,
    s.is_holiday,
    s.holiday_name,
    s.day_type,
    s.confirmed_hour;


-- ============================================================
-- 10. ANALYTICS DATA QUALITY
-- Grain: 1 row
--
-- Known analytical limitations are exposed explicitly rather
-- than silently converted into metrics.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_data_quality_summary
WITH (security_invoker = true)
AS
WITH purchase_cost AS (
    SELECT
        COUNT(*) AS purchase_lines,

        COUNT(*) FILTER (
            WHERE iti.unit_cost IS NOT NULL
        ) AS purchase_lines_with_cost,

        SUM(ABS(iti.quantity_change))
            AS purchased_quantity,

        SUM(ABS(iti.quantity_change)) FILTER (
            WHERE iti.unit_cost IS NOT NULL
        ) AS purchased_quantity_with_cost

    FROM public.inventory_transaction_items iti

    JOIN public.inventory_transactions it
        ON it.id = iti.transaction_id

    JOIN public.inventory_transaction_types itt
        ON itt.id = it.transaction_type_id

    WHERE it.status = 'POSTED'
      AND itt.code = 'PURCHASE'
),
commercial AS (
    SELECT
        COUNT(*) AS valid_sales,

        COUNT(*) FILTER (
            WHERE customer_id IS NOT NULL
        ) AS identified_sales

    FROM analytics.v_sales
),
items AS (
    SELECT
        COUNT(*) AS sale_item_rows,

        COUNT(*) FILTER (
            WHERE NOT is_catalog_product
        ) AS custom_sale_item_rows

    FROM analytics.v_sale_items_enriched
)
SELECT
    pc.purchase_lines,
    pc.purchase_lines_with_cost,

    CASE
        WHEN pc.purchase_lines > 0
        THEN pc.purchase_lines_with_cost::numeric
             / pc.purchase_lines
        ELSE NULL
    END AS purchase_cost_line_coverage,

    pc.purchased_quantity,
    pc.purchased_quantity_with_cost,

    CASE
        WHEN pc.purchased_quantity <> 0
        THEN pc.purchased_quantity_with_cost::numeric
             / pc.purchased_quantity
        ELSE NULL
    END AS purchase_cost_quantity_coverage,

    c.valid_sales,
    c.identified_sales,

    CASE
        WHEN c.valid_sales > 0
        THEN c.identified_sales::numeric
             / c.valid_sales
        ELSE NULL
    END AS customer_identification_coverage,

    i.sale_item_rows,
    i.custom_sale_item_rows,

    CASE
        WHEN i.sale_item_rows > 0
        THEN i.custom_sale_item_rows::numeric
             / i.sale_item_rows
        ELSE NULL
    END AS custom_sale_item_row_share,

    false AS profitability_metrics_available,

    'Insufficient purchase-cost coverage and no reliable COGS attribution'
        AS profitability_limitation

FROM purchase_cost pc
CROSS JOIN commercial c
CROSS JOIN items i;


-- ============================================================
-- 11. SECURITY
-- ============================================================

REVOKE ALL ON analytics.v_executive_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_sales_consumption
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_sale_item_consumption
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_customer_consumption
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_customer_product_preferences
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_channel_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_product_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_payment_method_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_hourly_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_data_quality_summary
    FROM PUBLIC, anon, authenticated;


GRANT SELECT ON analytics.v_executive_daily
    TO service_role;

GRANT SELECT ON analytics.v_sales_consumption
    TO service_role;

GRANT SELECT ON analytics.v_sale_item_consumption
    TO service_role;

GRANT SELECT ON analytics.v_customer_consumption
    TO service_role;

GRANT SELECT ON analytics.v_customer_product_preferences
    TO service_role;

GRANT SELECT ON analytics.v_channel_daily
    TO service_role;

GRANT SELECT ON analytics.v_product_daily
    TO service_role;

GRANT SELECT ON analytics.v_payment_method_daily
    TO service_role;

GRANT SELECT ON analytics.v_hourly_daily
    TO service_role;

GRANT SELECT ON analytics.v_data_quality_summary
    TO service_role;