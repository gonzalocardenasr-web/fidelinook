-- DEV-ANL-02.3B: consulta de temporalidad, solo lectura. Requiere service_role.
BEGIN;
CREATE OR REPLACE FUNCTION public.nook_analytics_commercial_temporality(p_from date,p_to date,p_channel text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,analytics AS $$
WITH calendar_days AS (
 SELECT calendar_date,day_of_week,day_name,is_weekend,is_holiday,holiday_name,
   CASE WHEN is_weekend OR is_holiday THEN 'weekend_holiday' ELSE 'weekday' END AS kind
 FROM analytics.calendar WHERE calendar_date BETWEEN p_from AND p_to
), sales_filtered AS (
 SELECT s.sale_id,s.business_date,s.confirmed_hour,s.revenue::numeric AS revenue,s.customer_id
 FROM analytics.v_sales s WHERE s.business_date BETWEEN p_from AND p_to
 AND (p_channel IS NULL OR s.channel_code=p_channel)
), daily AS (
 SELECT c.calendar_date,c.day_of_week,c.day_name,c.kind,c.is_holiday,c.holiday_name,
 COUNT(s.sale_id)::integer AS tickets,COALESCE(SUM(s.revenue),0)::numeric AS revenue
 FROM calendar_days c LEFT JOIN sales_filtered s ON s.business_date=c.calendar_date
 GROUP BY c.calendar_date,c.day_of_week,c.day_name,c.kind,c.is_holiday,c.holiday_name
), weekdays AS (
 SELECT day_of_week,MIN(day_name) AS day_name,COUNT(*)::integer AS days,
 SUM(tickets)::integer AS tickets,SUM(revenue) AS revenue
 FROM daily GROUP BY day_of_week
), daytypes AS (
 SELECT kind,COUNT(*)::integer AS days,SUM(tickets)::integer AS tickets,SUM(revenue) AS revenue
 FROM daily GROUP BY kind
), hours AS (
 SELECT h.hour,COUNT(s.sale_id)::integer AS tickets,COALESCE(SUM(s.revenue),0)::numeric AS revenue
 FROM generate_series(0,23) h(hour) LEFT JOIN sales_filtered s ON s.confirmed_hour=h.hour
 GROUP BY h.hour
), total AS (SELECT COALESCE(SUM(tickets),0)::integer AS tickets,COALESCE(SUM(revenue),0) AS revenue,COUNT(*)::integer AS days FROM daily)
SELECT jsonb_build_object(
 'period',jsonb_build_object('from',p_from,'to',p_to),'channel',p_channel,
 'totals',(SELECT jsonb_build_object('tickets',tickets,'revenue',revenue,'days',days,'averageTicket',CASE WHEN tickets>0 THEN revenue/tickets ELSE 0 END,'averageDailyRevenue',CASE WHEN days>0 THEN revenue/days ELSE 0 END) FROM total),
 'hours',COALESCE((SELECT jsonb_agg(jsonb_build_object('hour',hour,'tickets',tickets,'revenue',revenue) ORDER BY hour) FROM hours),'[]'::jsonb),
 'weekdays',COALESCE((SELECT jsonb_agg(jsonb_build_object('dayOfWeek',day_of_week,'dayName',day_name,'days',days,'tickets',tickets,'revenue',revenue,'averageDailyRevenue',CASE WHEN days>0 THEN revenue/days ELSE 0 END,'averageDailyTickets',CASE WHEN days>0 THEN tickets::numeric/days ELSE 0 END) ORDER BY day_of_week) FROM weekdays),'[]'::jsonb),
 'dayTypes',COALESCE((SELECT jsonb_agg(jsonb_build_object('type',kind,'days',days,'tickets',tickets,'revenue',revenue,'averageDailyRevenue',CASE WHEN days>0 THEN revenue/days ELSE 0 END,'averageTicket',CASE WHEN tickets>0 THEN revenue/tickets ELSE 0 END) ORDER BY kind) FROM daytypes),'[]'::jsonb),
 'daily',COALESCE((SELECT jsonb_agg(jsonb_build_object('date',calendar_date,'dayOfWeek',day_of_week,'type',kind,'isHoliday',is_holiday,'holidayName',holiday_name,'tickets',tickets,'revenue',revenue) ORDER BY calendar_date) FROM daily),'[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.nook_analytics_commercial_temporality(date,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nook_analytics_commercial_temporality(date,date,text) TO service_role;
COMMIT;
