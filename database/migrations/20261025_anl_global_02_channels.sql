-- DEV-ANL-GLOBAL-02: consulta agregada, sin cambios a ventas.
-- Mantiene exclusivamente ingresos canónicos de analytics.v_sales.
CREATE OR REPLACE FUNCTION public.nook_analytics_global_channels(
  p_to date,
  p_channel text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, analytics
AS $$
WITH months AS (
 SELECT (date_trunc('month', p_to::timestamp) - (n || ' months')::interval)::date AS month_start
 FROM generate_series(11,0,-1) n
), sales AS (
 SELECT date_trunc('month', s.business_date::timestamp)::date AS month_start,
 CASE
   WHEN lower(coalesce(s.channel_code,'')) = 'local' THEN 'local'
   WHEN lower(coalesce(s.channel_code,'')) IN ('shopify','uber_eats','rappi') THEN 'digital'
   ELSE 'otros_pos'
 END AS bucket,
 s.revenue::numeric AS revenue
 FROM analytics.v_sales s
 WHERE s.business_date >= (SELECT min(month_start) FROM months)
   AND s.business_date <= p_to
   AND (p_channel IS NULL OR s.channel_code = p_channel)
), agg AS (
 SELECT month_start,
 SUM(revenue) FILTER (WHERE bucket='local') AS local_revenue,
 SUM(revenue) FILTER (WHERE bucket='digital') AS digital_revenue,
 SUM(revenue) FILTER (WHERE bucket='otros_pos') AS other_revenue,
 SUM(revenue) AS total_revenue
 FROM sales GROUP BY month_start
)
SELECT coalesce(jsonb_agg(jsonb_build_object(
 'month',to_char(m.month_start,'YYYY-MM'),
 'local',coalesce(a.local_revenue,0),
 'digital',coalesce(a.digital_revenue,0),
 'other',coalesce(a.other_revenue,0),
 'total',coalesce(a.total_revenue,0),
 'partial', (m.month_start = date_trunc('month',p_to::timestamp)::date AND p_to < (m.month_start + interval '1 month - 1 day')::date)
) ORDER BY m.month_start),'[]'::jsonb)
FROM months m LEFT JOIN agg a USING(month_start);
$$;
REVOKE ALL ON FUNCTION public.nook_analytics_global_channels(date,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nook_analytics_global_channels(date,text) TO service_role;
