-- DEV-ANL-03A. Solo lectura. Ejecutar en Supabase SQL Editor antes de desplegar frontend.
-- Los registros son globales; las compras responden al filtro de canal.
CREATE OR REPLACE FUNCTION public.nook_analytics_customers_overview(
  p_from date, p_to date, p_channel text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
WITH bounds AS (
 SELECT p_from AS d_from, p_to AS d_to,
        (p_to + 1)::timestamp AT TIME ZONE 'America/Santiago' AS end_exclusive
),
registered AS (
 SELECT customer_id, (customer_created_at AT TIME ZONE 'America/Santiago')::date AS registered_date
 FROM analytics.v_customers, bounds
 WHERE customer_created_at < bounds.end_exclusive
),
valid_sales AS (
 SELECT s.sale_id, s.customer_id, s.business_date, s.revenue
 FROM analytics.v_sales s, bounds b
 WHERE s.customer_id IS NOT NULL AND s.business_date <= b.d_to
   AND (p_channel IS NULL OR s.channel_code = p_channel)
),
customer_history AS (
 SELECT customer_id, MIN(business_date) AS first_purchase,
        MAX(business_date) AS last_purchase,
        COUNT(DISTINCT sale_id)::integer AS lifetime_tickets
 FROM valid_sales GROUP BY customer_id
),
period_sales AS (
 SELECT s.* FROM valid_sales s, bounds b WHERE s.business_date >= b.d_from
),
months AS (
 SELECT gs::date AS month_start
 FROM bounds b, generate_series(date_trunc('month', b.d_from::timestamp),
                                date_trunc('month', b.d_to::timestamp), interval '1 month') gs
),
monthly AS (
 SELECT m.month_start,
   (SELECT count(*) FROM registered r WHERE r.registered_date >= m.month_start
      AND r.registered_date < (m.month_start + interval '1 month')::date)::integer AS registrations,
   (SELECT count(*) FROM customer_history h WHERE h.first_purchase >= m.month_start
      AND h.first_purchase < (m.month_start + interval '1 month')::date)::integer AS first_buyers
 FROM months m
),
period_buyers AS (SELECT DISTINCT customer_id FROM period_sales),
identified_period AS (
 SELECT count(DISTINCT sale_id)::integer AS tickets, COALESCE(sum(revenue),0)::bigint AS revenue
 FROM period_sales
)
SELECT jsonb_build_object(
 'from', p_from, 'to', p_to, 'channel', p_channel,
 'registeredTotal', (SELECT count(*) FROM registered),
 'registeredNew', (SELECT count(*) FROM registered r, bounds b WHERE r.registered_date BETWEEN b.d_from AND b.d_to),
 'buyersTotal', (SELECT count(*) FROM customer_history),
 'buyersPeriod', (SELECT count(*) FROM period_buyers),
 'firstBuyersPeriod', (SELECT count(*) FROM customer_history h, bounds b WHERE h.first_purchase BETWEEN b.d_from AND b.d_to),
 'repeatBuyersTotal', (SELECT count(*) FROM customer_history WHERE lifetime_tickets >= 2),
 'repeatBuyersPeriod', (SELECT count(*) FROM customer_history h JOIN period_buyers p USING(customer_id) WHERE h.lifetime_tickets >= 2),
 'active30', (SELECT count(*) FROM customer_history h, bounds b WHERE h.last_purchase BETWEEN b.d_to - 29 AND b.d_to),
 'active60', (SELECT count(*) FROM customer_history h, bounds b WHERE h.last_purchase BETWEEN b.d_to - 59 AND b.d_to),
 'active90', (SELECT count(*) FROM customer_history h, bounds b WHERE h.last_purchase BETWEEN b.d_to - 89 AND b.d_to),
 'identifiedTicketsPeriod', (SELECT tickets FROM identified_period),
 'identifiedRevenuePeriod', (SELECT revenue FROM identified_period),
 'monthly', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', to_char(month_start, 'YYYY-MM'),
    'registrations', registrations, 'firstBuyers', first_buyers) ORDER BY month_start) FROM monthly), '[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.nook_analytics_customers_overview(date,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nook_analytics_customers_overview(date,date,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nook_analytics_customers_overview(date,date,text) TO service_role;
