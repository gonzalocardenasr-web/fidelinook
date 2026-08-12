WITH
-- ============================================================
-- 1. LEDGER PATRIMONIAL POR CLIENTE
-- ============================================================
ledger AS (
  SELECT
    customer_id,
    COALESCE(SUM(stamp_delta), 0)::integer AS ledger_balance,
    COALESCE(
      SUM(CASE WHEN stamp_delta > 0 THEN stamp_delta ELSE 0 END),
      0
    )::integer AS ledger_earned,
    ABS(
      COALESCE(
        SUM(CASE WHEN stamp_delta < 0 THEN stamp_delta ELSE 0 END),
        0
      )
    )::integer AS ledger_reversed
  FROM public.loyalty_movements
  GROUP BY customer_id
),

-- ============================================================
-- 2. CUENTAS VS LEDGER VS LEGACY
-- ============================================================
account_audit AS (
  SELECT
    la.customer_id,

    la.current_stamp_balance,
    la.lifetime_stamps_earned,
    la.lifetime_stamps_reversed,

    COALESCE(l.ledger_balance, 0) AS ledger_balance,
    COALESCE(l.ledger_earned, 0) AS ledger_earned,
    COALESCE(l.ledger_reversed, 0) AS ledger_reversed,

    COALESCE(c.sellos, 0) AS legacy_balance

  FROM public.loyalty_accounts la

  JOIN public.clientes c
    ON c.id = la.customer_id

  LEFT JOIN ledger l
    ON l.customer_id = la.customer_id
),

-- ============================================================
-- 3. PREMIOS ACTIVOS REALES POR CLIENTE
-- ============================================================
reward_counts AS (
  SELECT
    customer_id,

    COUNT(*) FILTER (
      WHERE status = 'active'
    )::integer AS active_rewards,

    COUNT(*) FILTER (
      WHERE status = 'redeemed'
    )::integer AS redeemed_rewards

  FROM public.customer_rewards
  GROUP BY customer_id
),

reward_audit AS (
  SELECT
    la.customer_id,
    la.active_rewards_count,
    COALESCE(rc.active_rewards, 0) AS actual_active_rewards

  FROM public.loyalty_accounts la

  LEFT JOIN reward_counts rc
    ON rc.customer_id = la.customer_id
),

-- ============================================================
-- 4. DAILY LOYALTY
-- ============================================================
daily_audit AS (
  SELECT
    id,
    customer_id,
    business_date,
    expected_stamps,
    applied_stamps,
    pending_stamp_delta,
    projection_status

  FROM public.customer_daily_loyalty
),

-- ============================================================
-- 5. VENTAS / SNAPSHOTS LOYALTY
--    Sólo ventas creadas desde P0.04 en adelante.
-- ============================================================
recent_sales AS (
  SELECT DISTINCT
    s.id,
    s.total,
    s.loyalty_eligible_total

  FROM public.sales s

  JOIN public.sale_items si
    ON si.sale_id = s.id

  WHERE s.created_at >= DATE '2026-08-08'
),

recent_sale_item_audit AS (
  SELECT
    s.id AS sale_id,
    s.total,
    s.loyalty_eligible_total,

    COALESCE(
      SUM(
        CASE
          WHEN si.loyalty_eligible
            THEN si.total_price
          ELSE 0
        END
      ),
      0
    )::integer AS eligible_line_total

  FROM recent_sales s

  JOIN public.sale_items si
    ON si.sale_id = s.id

  GROUP BY
    s.id,
    s.total,
    s.loyalty_eligible_total
),

-- ============================================================
-- 6. REFERENCIAS ROTAS
-- ============================================================
orphan_audit AS (
  SELECT
    (
      SELECT COUNT(*)
      FROM public.loyalty_movements lm
      LEFT JOIN public.clientes c
        ON c.id = lm.customer_id
      WHERE c.id IS NULL
    )::integer AS movements_without_customer,

    (
      SELECT COUNT(*)
      FROM public.customer_rewards cr
      LEFT JOIN public.clientes c
        ON c.id = cr.customer_id
      WHERE c.id IS NULL
    )::integer AS rewards_without_customer,

    (
      SELECT COUNT(*)
      FROM public.loyalty_accounts la
      LEFT JOIN public.clientes c
        ON c.id = la.customer_id
      WHERE c.id IS NULL
    )::integer AS accounts_without_customer
)

SELECT
  -- ==========================================================
  -- UNIVERSO
  -- ==========================================================
  (SELECT COUNT(*) FROM public.loyalty_accounts)
    AS accounts,

  (SELECT COUNT(*) FROM public.loyalty_movements)
    AS loyalty_movements,

  (SELECT COUNT(*) FROM public.customer_rewards)
    AS rewards,

  (SELECT COUNT(*) FROM public.customer_daily_loyalty)
    AS daily_projections,

  -- ==========================================================
  -- ACCOUNT / LEDGER / LEGACY
  -- Esperado: todos 0
  -- ==========================================================
  (
    SELECT COUNT(*)
    FROM account_audit
    WHERE current_stamp_balance <> ledger_balance
  ) AS balance_mismatches,

  (
    SELECT COUNT(*)
    FROM account_audit
    WHERE lifetime_stamps_earned <> ledger_earned
  ) AS lifetime_earned_mismatches,

  (
    SELECT COUNT(*)
    FROM account_audit
    WHERE lifetime_stamps_reversed <> ledger_reversed
  ) AS lifetime_reversed_mismatches,

  (
    SELECT COUNT(*)
    FROM account_audit
    WHERE legacy_balance <> current_stamp_balance
  ) AS legacy_mismatches,

  (
    SELECT COUNT(*)
    FROM account_audit
    WHERE current_stamp_balance < 0
  ) AS negative_accounts,

  (
    SELECT COUNT(*)
    FROM account_audit
    WHERE ledger_balance < 0
  ) AS negative_ledgers,

  -- ==========================================================
  -- REWARDS
  -- Esperado: 0
  -- ==========================================================
  (
    SELECT COUNT(*)
    FROM reward_audit
    WHERE active_rewards_count <> actual_active_rewards
  ) AS active_reward_count_mismatches,

  -- ==========================================================
  -- DAILY LOYALTY
  -- Esperado: todos 0
  -- ==========================================================
  (
    SELECT COUNT(*)
    FROM daily_audit
    WHERE COALESCE(pending_stamp_delta, 0) <> 0
  ) AS daily_pending_mismatches,

  (
    SELECT COUNT(*)
    FROM daily_audit
    WHERE COALESCE(expected_stamps, 0)
       <> COALESCE(applied_stamps, 0)
  ) AS daily_expected_applied_mismatches,

  (
    SELECT COUNT(*)
    FROM daily_audit
    WHERE projection_status NOT IN ('reconciled')
  ) AS daily_not_reconciled,

  -- ==========================================================
  -- P0.04 — SNAPSHOTS NUEVOS
  -- loyalty_eligible_total puede ser menor al subtotal elegible
  -- por descuentos, pero nunca:
  --   < 0
  --   > total venta
  --   > suma de líneas elegibles antes de descuentos
  -- ==========================================================
  (
    SELECT COUNT(*)
    FROM recent_sale_item_audit
    WHERE loyalty_eligible_total < 0
       OR loyalty_eligible_total > total
       OR loyalty_eligible_total > eligible_line_total
  ) AS recent_sale_loyalty_amount_invalid,

  (
    SELECT COUNT(*)
    FROM public.sale_items
    WHERE loyalty_eligible IS NULL
  ) AS sale_items_without_loyalty_snapshot,

  -- ==========================================================
  -- HUÉRFANOS
  -- Esperado: todos 0
  -- ==========================================================
  oa.movements_without_customer,
  oa.rewards_without_customer,
  oa.accounts_without_customer

FROM orphan_audit oa;