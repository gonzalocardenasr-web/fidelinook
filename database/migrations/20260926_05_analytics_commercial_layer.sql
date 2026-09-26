-- ============================================================
-- DEV-ANL-01.1-01.5
-- Commercial Analytics Layer
--
-- Cubre:
--   ANL-01.1 Sales & Commercial Performance
--   ANL-01.2 Products & Mix
--   ANL-01.3 Customers
--   ANL-01.4 Channels
--   ANL-01.5 Temporal Analysis
--
-- Principios:
--   - sales.revenue sigue siendo la verdad comercial.
--   - descuentos de ticket no registrados en sale_items se
--     distribuyen proporcionalmente para análisis por producto.
--   - esa atribución se denomina allocated_revenue.
--   - líneas CUSTOM sin product_id se conservan, pero no se
--     convierten artificialmente en productos de catálogo.
-- ============================================================


-- ============================================================
-- 1. SALES ENRICHED
-- Grain: 1 row = 1 valid sale / ticket
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sales_enriched
WITH (security_invoker = true)
AS
SELECT
    s.*,

    c.calendar_year,
    c.calendar_month,
    c.calendar_day,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.is_weekend,
    c.is_holiday,
    c.holiday_name,
    c.day_type

FROM analytics.v_sales s
JOIN analytics.calendar c
    ON c.calendar_date = s.business_date;


-- ============================================================
-- 2. SALE ITEM ENRICHED
-- Grain: 1 row = 1 valid sale item
--
-- Category/subcategory are CURRENT catalog attributes.
-- Historical category snapshots do not exist.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sale_items_enriched
WITH (security_invoker = true)
AS
SELECT
    si.*,

    p.category AS current_category,
    p.subcategory AS current_subcategory,
    p.operational_type AS current_operational_type,
    p.is_active AS current_product_is_active,

    (p.id IS NOT NULL) AS is_catalog_product,

    CASE
        WHEN p.id IS NOT NULL THEN 'catalog_product'
        ELSE 'custom_line'
    END AS analytics_item_group

FROM analytics.v_sale_items si
LEFT JOIN public.products p
    ON p.id = si.product_id;


-- ============================================================
-- 3. SALE ITEM ALLOCATION
-- Grain: 1 row = 1 valid sale item
--
-- Reconciles item-level analysis with ticket revenue.
--
-- item_total_before_ticket_discount:
--     sale_items.total_price
--
-- ticket_level_discount:
--     sale.discount_total - SUM(item discount)
--
-- allocated_ticket_discount:
--     proportional allocation based on item_total
--
-- allocated_revenue:
--     item_total - allocated ticket discount
--
-- Numeric values are intentionally preserved with decimal
-- precision. They are analytical allocations, not transactional
-- monetary records.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_sale_item_allocations
WITH (security_invoker = true)
AS
WITH item_base AS (
    SELECT
        sie.*,

        SUM(sie.total_price) OVER (
            PARTITION BY sie.sale_id
        ) AS sale_item_total,

        SUM(sie.discount_total) OVER (
            PARTITION BY sie.sale_id
        ) AS sale_item_discount_total

    FROM analytics.v_sale_items_enriched sie
),
allocation_base AS (
    SELECT
        ib.*,

        s.gross_revenue AS sale_gross_revenue,
        s.discount_total AS sale_discount_total,
        s.revenue AS sale_revenue,

        (
            s.discount_total
            - ib.sale_item_discount_total
        )::numeric AS ticket_level_discount

    FROM item_base ib
    JOIN analytics.v_sales s
        ON s.sale_id = ib.sale_id
)
SELECT
    ab.*,

    CASE
        WHEN ab.sale_item_total <> 0
        THEN
            ab.ticket_level_discount
            * ab.total_price::numeric
            / ab.sale_item_total::numeric
        ELSE 0::numeric
    END AS allocated_ticket_discount,

    (
        ab.total_price::numeric
        -
        CASE
            WHEN ab.sale_item_total <> 0
            THEN
                ab.ticket_level_discount
                * ab.total_price::numeric
                / ab.sale_item_total::numeric
            ELSE 0::numeric
        END
    ) AS allocated_revenue

FROM allocation_base ab;


-- ============================================================
-- 4. DAILY COMMERCIAL PERFORMANCE
-- Grain: 1 row = business date
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_commercial_daily
WITH (security_invoker = true)
AS
WITH sales_daily AS (
    SELECT
        business_date,

        COUNT(*) AS tickets,

        SUM(gross_revenue) AS gross_revenue,
        SUM(discount_total) AS discounts,
        SUM(revenue) AS revenue,

        COUNT(*) FILTER (
            WHERE is_identified
        ) AS identified_tickets,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE customer_id IS NOT NULL
        ) AS identified_customers,

        SUM(revenue) FILTER (
            WHERE is_identified
        ) AS identified_revenue

    FROM analytics.v_sales
    GROUP BY business_date
),
units_daily AS (
    SELECT
        business_date,
        SUM(quantity) AS units_sold
    FROM analytics.v_sale_items
    GROUP BY business_date
)
SELECT
    sd.business_date,

    c.calendar_year,
    c.calendar_month,
    c.iso_week,
    c.day_of_week,
    c.day_name,
    c.is_weekend,
    c.is_holiday,
    c.holiday_name,
    c.day_type,

    sd.tickets,
    sd.gross_revenue,
    sd.discounts,
    sd.revenue,

    CASE
        WHEN sd.tickets > 0
        THEN sd.revenue::numeric / sd.tickets
        ELSE NULL
    END AS average_ticket,

    COALESCE(ud.units_sold, 0) AS units_sold,

    CASE
        WHEN sd.tickets > 0
        THEN COALESCE(ud.units_sold, 0)::numeric / sd.tickets
        ELSE NULL
    END AS units_per_ticket,

    sd.identified_tickets,
    sd.identified_customers,
    COALESCE(sd.identified_revenue, 0) AS identified_revenue,

    CASE
        WHEN sd.tickets > 0
        THEN sd.identified_tickets::numeric / sd.tickets
        ELSE NULL
    END AS identified_ticket_rate,

    CASE
        WHEN sd.revenue <> 0
        THEN COALESCE(sd.identified_revenue, 0)::numeric / sd.revenue
        ELSE NULL
    END AS identified_revenue_rate,

    CASE
        WHEN sd.gross_revenue <> 0
        THEN sd.discounts::numeric / sd.gross_revenue
        ELSE NULL
    END AS discount_rate

FROM sales_daily sd
JOIN analytics.calendar c
    ON c.calendar_date = sd.business_date
LEFT JOIN units_daily ud
    ON ud.business_date = sd.business_date;


-- ============================================================
-- 5. CHANNEL PERFORMANCE
-- Grain: 1 row = channel
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_channel_performance
WITH (security_invoker = true)
AS
WITH channel_sales AS (
    SELECT
        channel_code,
        channel_name,
        channel_type,

        COUNT(*) AS tickets,
        SUM(gross_revenue) AS gross_revenue,
        SUM(discount_total) AS discounts,
        SUM(revenue) AS revenue,

        COUNT(*) FILTER (
            WHERE is_identified
        ) AS identified_tickets,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE customer_id IS NOT NULL
        ) AS identified_customers

    FROM analytics.v_sales
    GROUP BY
        channel_code,
        channel_name,
        channel_type
),
channel_units AS (
    SELECT
        channel_code,
        SUM(quantity) AS units_sold
    FROM analytics.v_sale_items
    GROUP BY channel_code
),
total_revenue AS (
    SELECT
        SUM(revenue) AS revenue
    FROM analytics.v_sales
)
SELECT
    cs.channel_code,
    cs.channel_name,
    cs.channel_type,

    cs.tickets,
    cs.gross_revenue,
    cs.discounts,
    cs.revenue,

    COALESCE(cu.units_sold, 0) AS units_sold,

    CASE
        WHEN cs.tickets > 0
        THEN cs.revenue::numeric / cs.tickets
        ELSE NULL
    END AS average_ticket,

    CASE
        WHEN cs.tickets > 0
        THEN COALESCE(cu.units_sold, 0)::numeric / cs.tickets
        ELSE NULL
    END AS units_per_ticket,

    CASE
        WHEN cs.gross_revenue <> 0
        THEN cs.discounts::numeric / cs.gross_revenue
        ELSE NULL
    END AS discount_rate,

    CASE
        WHEN tr.revenue <> 0
        THEN cs.revenue::numeric / tr.revenue
        ELSE NULL
    END AS revenue_mix,

    cs.identified_tickets,
    cs.identified_customers

FROM channel_sales cs
LEFT JOIN channel_units cu
    ON cu.channel_code = cs.channel_code
CROSS JOIN total_revenue tr;


-- ============================================================
-- 6. PRODUCT PERFORMANCE
-- Grain: 1 row = catalog product
--
-- Only catalog products are included.
-- CUSTOM lines remain available in v_sale_item_allocations
-- and therefore remain part of financial reconciliation.
--
-- allocated_revenue is an analytical attribution.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_product_performance
WITH (security_invoker = true)
AS
WITH product_metrics AS (
    SELECT
        product_id,
        product_sku,
        product_name,
        current_category,
        current_subcategory,
        current_operational_type,
        current_product_is_active,

        COUNT(*) AS sale_item_rows,
        COUNT(DISTINCT sale_id) AS tickets,
        SUM(quantity) AS units_sold,

        SUM(
            list_unit_price * quantity
        ) AS gross_item_value,

        SUM(discount_total) AS item_discounts,

        SUM(total_price) AS item_revenue_before_ticket_discount,

        SUM(allocated_ticket_discount)
            AS allocated_ticket_discount,

        SUM(allocated_revenue)
            AS allocated_revenue

    FROM analytics.v_sale_item_allocations
    WHERE is_catalog_product
    GROUP BY
        product_id,
        product_sku,
        product_name,
        current_category,
        current_subcategory,
        current_operational_type,
        current_product_is_active
),
totals AS (
    SELECT
        SUM(units_sold) AS catalog_units,
        SUM(allocated_revenue) AS catalog_allocated_revenue
    FROM product_metrics
)
SELECT
    pm.*,

    CASE
        WHEN t.catalog_units <> 0
        THEN pm.units_sold::numeric / t.catalog_units
        ELSE NULL
    END AS unit_mix,

    CASE
        WHEN t.catalog_allocated_revenue <> 0
        THEN pm.allocated_revenue
             / t.catalog_allocated_revenue
        ELSE NULL
    END AS allocated_revenue_mix

FROM product_metrics pm
CROSS JOIN totals t;


-- ============================================================
-- 7. CUSTOM / NON-CATALOG SALE LINES
-- Grain: normalized historical custom concept
--
-- Kept separate from product rankings.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_custom_sale_items
WITH (security_invoker = true)
AS
SELECT
    LOWER(TRIM(product_name)) AS normalized_custom_name,
    item_type,

    COUNT(*) AS sale_item_rows,
    COUNT(DISTINCT sale_id) AS tickets,
    SUM(quantity) AS units,

    SUM(total_price) AS item_revenue_before_ticket_discount,
    SUM(allocated_ticket_discount) AS allocated_ticket_discount,
    SUM(allocated_revenue) AS allocated_revenue

FROM analytics.v_sale_item_allocations
WHERE NOT is_catalog_product
GROUP BY
    LOWER(TRIM(product_name)),
    item_type;


-- ============================================================
-- 8. CUSTOMER COMMERCIAL PROFILE
-- Grain: 1 row = registered customer
--
-- This represents observed behavior in the transactional
-- history currently available. It is NOT lifetime history
-- prior to the current transactional base.
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_customer_commercial_profile
WITH (security_invoker = true)
AS
SELECT
    c.customer_id,
    c.customer_name,
    c.email,
    c.phone,
    c.customer_created_at,
    c.email_verified,
    c.card_active,

    c.valid_ticket_count AS observed_purchase_frequency,
    c.lifetime_observed_revenue AS observed_revenue,
    c.observed_average_ticket,

    c.first_observed_purchase_date,
    c.last_observed_purchase_date,
    c.last_observed_purchase_at,
    c.days_since_last_purchase,

    CASE
        WHEN c.valid_ticket_count > 0
        THEN true
        ELSE false
    END AS is_observed_buyer

FROM analytics.v_customers c;


-- ============================================================
-- 9. HOURLY PERFORMANCE
-- Grain: 1 row = local confirmed hour
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_commercial_hourly
WITH (security_invoker = true)
AS
WITH hourly_sales AS (
    SELECT
        confirmed_hour,

        COUNT(*) AS tickets,
        SUM(gross_revenue) AS gross_revenue,
        SUM(discount_total) AS discounts,
        SUM(revenue) AS revenue,

        COUNT(DISTINCT customer_id) FILTER (
            WHERE customer_id IS NOT NULL
        ) AS identified_customers

    FROM analytics.v_sales
    GROUP BY confirmed_hour
),
hourly_units AS (
    SELECT
        confirmed_hour,
        SUM(quantity) AS units_sold
    FROM analytics.v_sale_items
    GROUP BY confirmed_hour
)
SELECT
    hs.confirmed_hour,

    hs.tickets,
    hs.gross_revenue,
    hs.discounts,
    hs.revenue,

    COALESCE(hu.units_sold, 0) AS units_sold,

    CASE
        WHEN hs.tickets > 0
        THEN hs.revenue::numeric / hs.tickets
        ELSE NULL
    END AS average_ticket,

    hs.identified_customers

FROM hourly_sales hs
LEFT JOIN hourly_units hu
    ON hu.confirmed_hour = hs.confirmed_hour;


-- ============================================================
-- 10. DAY-TYPE PERFORMANCE
-- Grain: weekday vs weekend_holiday
-- ============================================================

CREATE OR REPLACE VIEW analytics.v_commercial_day_type
WITH (security_invoker = true)
AS
SELECT
    c.day_type,

    COUNT(*) AS tickets,
    SUM(s.gross_revenue) AS gross_revenue,
    SUM(s.discount_total) AS discounts,
    SUM(s.revenue) AS revenue,

    COUNT(DISTINCT s.customer_id) FILTER (
        WHERE s.customer_id IS NOT NULL
    ) AS identified_customers,

    CASE
        WHEN COUNT(*) > 0
        THEN SUM(s.revenue)::numeric / COUNT(*)
        ELSE NULL
    END AS average_ticket

FROM analytics.v_sales s
JOIN analytics.calendar c
    ON c.calendar_date = s.business_date
GROUP BY c.day_type;


-- ============================================================
-- 11. SECURITY
-- ============================================================

REVOKE ALL ON analytics.v_sales_enriched
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_sale_items_enriched
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_sale_item_allocations
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_commercial_daily
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_channel_performance
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_product_performance
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_custom_sale_items
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_customer_commercial_profile
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_commercial_hourly
    FROM PUBLIC, anon, authenticated;

REVOKE ALL ON analytics.v_commercial_day_type
    FROM PUBLIC, anon, authenticated;


GRANT SELECT ON analytics.v_sales_enriched
    TO service_role;

GRANT SELECT ON analytics.v_sale_items_enriched
    TO service_role;

GRANT SELECT ON analytics.v_sale_item_allocations
    TO service_role;

GRANT SELECT ON analytics.v_commercial_daily
    TO service_role;

GRANT SELECT ON analytics.v_channel_performance
    TO service_role;

GRANT SELECT ON analytics.v_product_performance
    TO service_role;

GRANT SELECT ON analytics.v_custom_sale_items
    TO service_role;

GRANT SELECT ON analytics.v_customer_commercial_profile
    TO service_role;

GRANT SELECT ON analytics.v_commercial_hourly
    TO service_role;

GRANT SELECT ON analytics.v_commercial_day_type
    TO service_role;