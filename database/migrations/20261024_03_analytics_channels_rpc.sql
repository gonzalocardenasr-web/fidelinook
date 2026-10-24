-- DEV-ANL-02.3C. Ejecutar en Supabase SQL Editor.
-- Agrega exclusivamente una RPC de lectura; no altera ventas ni pedidos.
BEGIN;
CREATE OR REPLACE FUNCTION public.nook_analytics_commercial_channels(p_from date,p_to date,p_channel text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,analytics AS $$
WITH days AS (
 SELECT calendar_date FROM analytics.calendar WHERE calendar_date BETWEEN p_from AND p_to
), channels AS (
 SELECT code,name FROM public.sales_channels WHERE p_channel IS NULL OR code=p_channel
), sales_filtered AS (
 SELECT sale_id,business_date,channel_code,revenue::numeric AS revenue,customer_id
 FROM analytics.v_sales WHERE business_date BETWEEN p_from AND p_to
 AND (p_channel IS NULL OR channel_code=p_channel)
), channel_agg AS (
 SELECT c.code,c.name,COUNT(s.sale_id)::integer AS tickets,COALESCE(SUM(s.revenue),0)::numeric AS revenue,
 COUNT(s.sale_id) FILTER(WHERE s.customer_id IS NOT NULL)::integer AS identified_tickets
 FROM channels c LEFT JOIN sales_filtered s ON s.channel_code=c.code GROUP BY c.code,c.name
), daily AS (
 SELECT d.calendar_date,c.code,c.name,COUNT(s.sale_id)::integer AS tickets,COALESCE(SUM(s.revenue),0)::numeric AS revenue
 FROM days d CROSS JOIN channels c LEFT JOIN sales_filtered s ON s.business_date=d.calendar_date AND s.channel_code=c.code
 GROUP BY d.calendar_date,c.code,c.name
), totals AS (
 SELECT COALESCE(SUM(tickets),0)::integer AS tickets,COALESCE(SUM(revenue),0)::numeric AS revenue FROM channel_agg
)
SELECT jsonb_build_object(
 'period',jsonb_build_object('from',p_from,'to',p_to),'channel',p_channel,
 'totals',(SELECT jsonb_build_object('tickets',tickets,'revenue',revenue,'averageTicket',CASE WHEN tickets>0 THEN revenue/tickets ELSE 0 END) FROM totals),
 'channels',COALESCE((SELECT jsonb_agg(jsonb_build_object('code',a.code,'name',a.name,'tickets',a.tickets,'revenue',a.revenue,'averageTicket',CASE WHEN a.tickets>0 THEN a.revenue/a.tickets ELSE 0 END,'identifiedTickets',a.identified_tickets,'share',CASE WHEN t.revenue>0 THEN a.revenue/t.revenue ELSE 0 END) ORDER BY a.revenue DESC,a.code) FROM channel_agg a CROSS JOIN totals t),'[]'::jsonb),
 'daily',COALESCE((SELECT jsonb_agg(jsonb_build_object('date',calendar_date,'channel',code,'tickets',tickets,'revenue',revenue) ORDER BY calendar_date,code) FROM daily),'[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.nook_analytics_commercial_channels(date,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nook_analytics_commercial_channels(date,date,text) TO service_role;
COMMIT;
