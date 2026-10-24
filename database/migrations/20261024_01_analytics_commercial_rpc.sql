-- DEV-ANL-02.2B | Solo lectura, RPC privadas de service_role.
-- Ejecutar únicamente tras validar la preflight y revisar en SQL Editor.
BEGIN;

CREATE OR REPLACE FUNCTION public.nook_analytics_commercial_overview(p_from date, p_to date, p_channel text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, analytics AS $$
WITH filtered AS (
 SELECT sale_id, business_date, customer_id, is_identified, revenue::numeric AS revenue
 FROM analytics.v_sales
 WHERE business_date BETWEEN p_from AND p_to
 AND (p_channel IS NULL OR channel_code = p_channel)
), totals AS (
 SELECT COUNT(*)::integer AS sales_count, COALESCE(SUM(revenue),0) AS revenue,
 COUNT(*) FILTER (WHERE is_identified)::integer AS identified_sales_count,
 COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL)::integer AS identified_customers_count
 FROM filtered
), daily AS (
 SELECT business_date, COUNT(*)::integer AS sales_count, SUM(revenue) AS revenue
 FROM filtered GROUP BY business_date
)
SELECT jsonb_build_object(
 'period',jsonb_build_object('from',p_from,'to',p_to),'channel',p_channel,
 'salesCount',t.sales_count,'revenue',t.revenue,
 'averageTicket',CASE WHEN t.sales_count > 0 THEN t.revenue/t.sales_count ELSE 0 END,
 'identifiedSalesCount',t.identified_sales_count,'identifiedCustomersCount',t.identified_customers_count,
 'daily',COALESCE((SELECT jsonb_agg(jsonb_build_object('date',business_date,'salesCount',sales_count,'revenue',revenue) ORDER BY business_date) FROM daily),'[]'::jsonb)
) FROM totals t;
$$;

CREATE OR REPLACE FUNCTION public.nook_analytics_commercial_products(p_from date, p_to date, p_channel text DEFAULT NULL, p_top_n integer DEFAULT 10, p_rank_by text DEFAULT 'revenue')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, analytics AS $$
WITH items AS (
 SELECT product_id, product_sku, product_name, analytics_item_group, quantity::numeric AS quantity, allocated_revenue::numeric AS allocated_revenue
 FROM analytics.v_sale_item_allocations
 WHERE business_date BETWEEN p_from AND p_to
 AND (p_channel IS NULL OR channel_code = p_channel)
), groups AS (
 SELECT product_id, product_sku, product_name, analytics_item_group,
 SUM(quantity) AS units, SUM(allocated_revenue) AS revenue
 FROM items WHERE analytics_item_group = 'catalog_product'
 GROUP BY product_id,product_sku,product_name,analytics_item_group
), ranked AS (
 SELECT * FROM groups ORDER BY
 CASE WHEN p_rank_by = 'units' THEN units ELSE revenue END DESC, product_sku NULLS LAST, product_name LIMIT p_top_n
), custom AS (
 SELECT COALESCE(SUM(quantity),0) AS units,COALESCE(SUM(allocated_revenue),0) AS revenue
 FROM items WHERE analytics_item_group = 'custom_line'
)
SELECT jsonb_build_object(
 'period',jsonb_build_object('from',p_from,'to',p_to),'channel',p_channel,
 'rankBy',p_rank_by,'topN',p_top_n,
 'products',COALESCE((SELECT jsonb_agg(jsonb_build_object('productId',product_id,'sku',product_sku,'name',product_name,'itemGroup',analytics_item_group,'units',units,'allocatedRevenue',revenue) ORDER BY CASE WHEN p_rank_by='units' THEN units ELSE revenue END DESC, product_sku NULLS LAST,product_name) FROM ranked),'[]'::jsonb),
 'customLines',jsonb_build_object('units',c.units,'allocatedRevenue',c.revenue),
 'reconciliation',jsonb_build_object('allAllocatedRevenue',(SELECT COALESCE(SUM(allocated_revenue),0) FROM items),'catalogAllocatedRevenue',(SELECT COALESCE(SUM(allocated_revenue),0) FROM items WHERE analytics_item_group='catalog_product'))
) FROM custom c;
$$;

-- Ranking comparable en UNIDADES: exclusivamente POT-16-LISTO, 1 opción por línea.
-- No mezclar cantidad de opciones de potes armados con unidades vendidas.
CREATE OR REPLACE FUNCTION public.nook_analytics_commercial_flavors(p_from date, p_to date, p_channel text DEFAULT NULL, p_top_n integer DEFAULT 10)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, analytics AS $$
WITH eligible AS (
 SELECT sale_item_id, quantity::numeric AS quantity FROM analytics.v_sale_items
 WHERE business_date BETWEEN p_from AND p_to AND (p_channel IS NULL OR channel_code = p_channel)
 AND product_sku = 'POT-16-LISTO'
), options AS (
 SELECT e.sale_item_id,e.quantity,o.option_value_id,o.option_value_name,
 COUNT(o.sale_item_option_id) OVER (PARTITION BY e.sale_item_id) AS option_count
 FROM eligible e LEFT JOIN analytics.v_sale_item_options o ON o.sale_item_id=e.sale_item_id
), observed AS (
 SELECT * FROM options WHERE option_count=1 AND option_value_name IS NOT NULL
), ranked AS (
 SELECT option_value_id,option_value_name,SUM(quantity) AS units
 FROM observed GROUP BY option_value_id,option_value_name
 ORDER BY units DESC,option_value_name LIMIT p_top_n
), coverage AS (
 SELECT (SELECT COUNT(*) FROM eligible)::integer AS eligible_rows,
 (SELECT COUNT(*) FROM observed)::integer AS observed_rows
)
SELECT jsonb_build_object(
 'period',jsonb_build_object('from',p_from,'to',p_to),'channel',p_channel,'topN',p_top_n,
 'flavors',COALESCE((SELECT jsonb_agg(jsonb_build_object('flavorId',option_value_id,'flavorName',option_value_name,'observedUnits',units) ORDER BY units DESC,option_value_name) FROM ranked),'[]'::jsonb),
 'coverage',jsonb_build_object('eligibleItemRows',c.eligible_rows,'observedItemRows',c.observed_rows,'unknownItemRows',c.eligible_rows-c.observed_rows,'observedRowRate',CASE WHEN c.eligible_rows>0 THEN c.observed_rows::numeric/c.eligible_rows ELSE NULL END),
 'methodology','observed_sale_item_options',
 'scope','POT-16-LISTO exclusivamente; no representa sabores de helados simples/dobles ni potes armados'
) FROM coverage c;
$$;

REVOKE ALL ON FUNCTION public.nook_analytics_commercial_overview(date,date,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.nook_analytics_commercial_products(date,date,text,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.nook_analytics_commercial_flavors(date,date,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nook_analytics_commercial_overview(date,date,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nook_analytics_commercial_products(date,date,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nook_analytics_commercial_flavors(date,date,text,integer) TO service_role;
COMMIT;
