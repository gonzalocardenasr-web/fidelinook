-- =====================================================================
-- NOOK
-- CIERRE DE SANEAMIENTO
-- Reconciliación histórica de customer_daily_loyalty.id = 183
-- 2026-08-12
--
-- CONTEXTO
-- ---------------------------------------------------------------------
-- La proyección diaria 183 quedó históricamente:
--   expected_stamps = 2
--   applied_stamps = 0
--   pending_stamp_delta = 2
--
-- Sin embargo, esos 2 sellos ya están representados patrimonialmente
-- mediante el movimiento histórico:
--
--   loyalty_movements.id = 846
--   source = go_live_ledger_completion
--
-- Por lo tanto, NO corresponde generar nuevos sellos.
-- Esta migración sólo deja reproducible el saneamiento semántico.
--
-- Es idempotente: si el caso ya está reconciliado, no modifica nada.
-- =====================================================================

UPDATE public.customer_daily_loyalty
SET
  applied_stamps = expected_stamps,
  pending_stamp_delta = 0,
  projection_status = 'reconciled',
  reconciled_at = COALESCE(reconciled_at, now()),
  recalculation_reason = 'historical_baseline_reconciliation',
  metadata =
    COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'historicalBaselineReconciliation', true,
      'historicalBaselineMovementId', 846,
      'historicalBaselineSource', 'go_live_ledger_completion',
      'historicalBaselineAsOf', '2026-07-30',
      'historicalBaselineCoveredStamps', 2,
      'reconciliationReason',
        'Daily projection predates ledger completion; expected stamps are already represented in historical opening balance.'
    )
WHERE id = 183
  AND customer_id = 32
  AND business_date = DATE '2026-08-06'
  AND expected_stamps = 2
  AND applied_stamps = 0
  AND pending_stamp_delta = 2
  AND projection_status = 'calculated';


DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.customer_daily_loyalty
  WHERE id = 183
    AND customer_id = 32
    AND business_date = DATE '2026-08-06'
    AND expected_stamps = 2
    AND applied_stamps = 2
    AND pending_stamp_delta = 0
    AND projection_status = 'reconciled'
    AND metadata->>'historicalBaselineReconciliation' = 'true';

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'No se pudo validar la reconciliación histórica de daily_loyalty_id 183.';
  END IF;
END $$;