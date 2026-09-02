-- ============================================================
-- DEV-EMAIL-01.4
-- Claim específico de email
--
-- Permite que un flujo P0 recién creado intente despachar
-- inmediatamente SU propia obligación, sin reclamar otro
-- email pendiente de la cola.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_pending_email_by_id(
  p_email_id bigint,
  p_worker_id text
)
RETURNS public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.email_queue;
BEGIN
  IF p_worker_id IS NULL
     OR length(trim(p_worker_id)) = 0 THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  SELECT *
  INTO v_row
  FROM public.email_queue
  WHERE id = p_email_id
    AND status = 'PENDING'
    AND attempt_count < max_attempts
    AND (
      next_attempt_at IS NULL
      OR next_attempt_at <= now()
    )
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.email_queue
  SET
    status = 'PROCESSING',
    attempt_count = attempt_count + 1,
    last_attempt_at = now(),
    locked_at = now(),
    locked_by = trim(p_worker_id),
    last_error = NULL
  WHERE id = p_email_id
  RETURNING *
  INTO v_row;

  RETURN v_row;
END;
$$;


REVOKE ALL ON FUNCTION public.claim_pending_email_by_id(
  bigint,
  text
) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.claim_pending_email_by_id(
  bigint,
  text
) TO service_role;


COMMENT ON FUNCTION public.claim_pending_email_by_id(
  bigint,
  text
) IS
  'Atomically claims one specific pending email for immediate dispatch.';