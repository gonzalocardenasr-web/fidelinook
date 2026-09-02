-- ============================================================
-- DEV-EMAIL-01.3
-- Email Dispatcher - Stale Lock Recovery
--
-- Objetivo:
-- Evitar que un email quede permanentemente PROCESSING si
-- una ejecución del dispatcher termina inesperadamente.
-- ============================================================


CREATE OR REPLACE FUNCTION public.recover_stale_processing_emails(
  p_stale_after_minutes integer DEFAULT 15
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recovered integer := 0;
BEGIN
  IF p_stale_after_minutes <= 0 THEN
    RAISE EXCEPTION 'stale_after_minutes must be greater than zero';
  END IF;

  WITH recovered AS (
    UPDATE public.email_queue
    SET
      status = CASE
        WHEN attempt_count >= max_attempts THEN 'FAILED'
        ELSE 'PENDING'
      END,

      next_attempt_at = CASE
        WHEN attempt_count >= max_attempts THEN NULL
        ELSE now()
      END,

      last_error = CASE
        WHEN attempt_count >= max_attempts
          THEN COALESCE(
            last_error,
            'Processing lock expired after final attempt'
          )
        ELSE COALESCE(
          last_error,
          'Recovered stale processing lock'
        )
      END,

      locked_at = NULL,
      locked_by = NULL

    WHERE status = 'PROCESSING'
      AND locked_at IS NOT NULL
      AND locked_at <
        now() - make_interval(mins => p_stale_after_minutes)

    RETURNING id
  )

  SELECT count(*)
  INTO v_recovered
  FROM recovered;

  RETURN v_recovered;
END;
$$;


REVOKE ALL ON FUNCTION public.recover_stale_processing_emails(
  integer
) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.recover_stale_processing_emails(
  integer
) TO service_role;


COMMENT ON FUNCTION public.recover_stale_processing_emails(
  integer
) IS
  'Recovers emails stranded in PROCESSING after a dispatcher crash or interrupted execution.';