-- DEV-ANL-03B: ranking individual; consultas de solo lectura y privilegio exclusivo service_role.
CREATE OR REPLACE FUNCTION public.nook_analytics_customer_ranking(
 p_cutoff date, p_channel text DEFAULT NULL, p_search text DEFAULT NULL,
 p_sort text DEFAULT 'revenue', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
WITH base AS (
 SELECT c.customer_id, c.customer_name, c.email, c.phone,
        (c.customer_created_at AT TIME ZONE 'America/Santiago')::date AS registered_date
 FROM analytics.v_customers c
 WHERE (c.customer_created_at AT TIME ZONE 'America/Santiago')::date <= p_cutoff
   AND (NULLIF(trim(p_search),'') IS NULL OR
     c.customer_name ILIKE '%' || trim(p_search) || '%' OR
     c.email ILIKE '%' || trim(p_search) || '%' OR
     c.phone ILIKE '%' || trim(p_search) || '%' OR
     c.customer_id::text = trim(p_search))
), sales AS (
 SELECT s.customer_id, count(DISTINCT s.sale_id)::integer AS purchases,
        coalesce(sum(s.revenue),0)::bigint AS revenue,
        min(s.business_date) AS first_purchase,
        max(s.business_date) AS last_purchase,
        count(DISTINCT s.sale_id) FILTER (WHERE s.business_date > p_cutoff-90)::integer AS purchases90
 FROM analytics.v_sales s
 WHERE s.customer_id IS NOT NULL AND s.business_date <= p_cutoff
   AND (p_channel IS NULL OR s.channel_code = p_channel)
 GROUP BY s.customer_id
), stamps AS (
 SELECT l.customer_id,
  coalesce(sum(l.stamp_delta) FILTER (WHERE l.analytics_movement_group IN ('organic_sale_credit','organic_sale_reversal') AND l.occurred_at < ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago')),0)::integer AS earned_stamps_net,
  coalesce(sum(l.stamp_delta) FILTER (WHERE l.analytics_movement_group = 'organic_sale_credit' AND l.occurred_at < ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago')),0)::integer AS earned_stamps_gross
 FROM analytics.v_loyalty_movements l GROUP BY l.customer_id
), rewards AS (
 SELECT r.customer_id,
  count(*) FILTER (WHERE r.issued_at < ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago'))::integer AS issued,
  count(*) FILTER (WHERE r.redeemed_at < ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago'))::integer AS redeemed,
  count(*) FILTER (WHERE r.issued_at < ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago') AND (r.redeemed_at IS NULL OR r.redeemed_at >= ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago')) AND (r.cancelled_at IS NULL OR r.cancelled_at >= ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago')) AND (r.expires_at IS NULL OR r.expires_at >= ((p_cutoff+1)::timestamp AT TIME ZONE 'America/Santiago')))::integer AS available_at_cutoff
 FROM analytics.v_rewards r WHERE r.analytics_reward_group = 'current_engine'
 GROUP BY r.customer_id
), combined AS (
 SELECT b.*, coalesce(s.purchases,0) AS purchases,coalesce(s.revenue,0) AS revenue,
        CASE WHEN coalesce(s.purchases,0)>0 THEN round(s.revenue::numeric/s.purchases,0) ELSE 0 END AS average_ticket,
        s.first_purchase,s.last_purchase,
        CASE WHEN s.last_purchase IS NULL THEN NULL ELSE p_cutoff-s.last_purchase END AS days_since_purchase,
        coalesce(s.purchases90,0) AS purchases90,
        coalesce(t.earned_stamps_net,0) AS earned_stamps_net,
        coalesce(t.earned_stamps_gross,0) AS earned_stamps_gross,
        coalesce(r.issued,0) AS rewards_issued,coalesce(r.redeemed,0) AS rewards_redeemed,
        coalesce(r.available_at_cutoff,0) AS rewards_available
 FROM base b LEFT JOIN sales s USING(customer_id)
 LEFT JOIN stamps t USING(customer_id) LEFT JOIN rewards r USING(customer_id)
), ranked AS (
 SELECT * FROM combined
 ORDER BY
  CASE WHEN p_sort='purchases' THEN purchases END DESC NULLS LAST,
  CASE WHEN p_sort='recent' THEN last_purchase END DESC NULLS LAST,
  CASE WHEN p_sort='ticket' THEN average_ticket END DESC NULLS LAST,
  CASE WHEN p_sort='stamps' THEN earned_stamps_net END DESC NULLS LAST,
  CASE WHEN p_sort='revenue' THEN revenue END DESC NULLS LAST,
  revenue DESC, customer_id ASC
 LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0)
)
SELECT jsonb_build_object(
 'total',(SELECT count(*) FROM combined),
 'items',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM ranked r),'[]'::jsonb),
 'cutoff',p_cutoff,'channel',p_channel,'sort',p_sort
);
$$;
REVOKE ALL ON FUNCTION public.nook_analytics_customer_ranking(date,text,text,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nook_analytics_customer_ranking(date,text,text,text,integer,integer) FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nook_analytics_customer_ranking(date,text,text,text,integer,integer) TO service_role;
