-- ============================================================
-- DEV-EMAIL-01.2
-- Email Queue Engine
--
-- Objetivo:
-- Incorporar las primitivas atómicas del motor de email:
--
-- 1. Encolar de forma idempotente.
-- 2. Reclamar emails pendientes de forma concurrent-safe.
-- 3. Marcar envío exitoso.
-- 4. Devolver un email a retry.
-- 5. Marcar error terminal.
--
-- El envío real a Resend todavía NO ocurre en este DEV.
-- ============================================================


-- ============================================================
-- 1. ENQUEUE IDEMPOTENTE
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_email(
  p_recipient_email text,
  p_email_type text,
  p_priority smallint,
  p_idempotency_key text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_customer_id bigint DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_source_reference text DEFAULT NULL,
  p_max_attempts integer DEFAULT 5
)
RETURNS public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.email_queue;
BEGIN
  IF p_recipient_email IS NULL
     OR length(trim(p_recipient_email)) = 0 THEN
    RAISE EXCEPTION 'recipient_email is required';
  END IF;

  IF p_email_type IS NULL
     OR length(trim(p_email_type)) = 0 THEN
    RAISE EXCEPTION 'email_type is required';
  END IF;

  IF p_idempotency_key IS NULL
     OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key is required';
  END IF;

  IF p_priority NOT IN (0, 1, 2, 3) THEN
    RAISE EXCEPTION 'invalid email priority: %', p_priority;
  END IF;

  IF p_max_attempts <= 0 THEN
    RAISE EXCEPTION 'max_attempts must be greater than zero';
  END IF;

  INSERT INTO public.email_queue (
    customer_id,
    recipient_email,
    email_type,
    priority,
    payload,
    idempotency_key,
    source_type,
    source_reference,
    max_attempts,
    status,
    next_attempt_at
  )
  VALUES (
    p_customer_id,
    lower(trim(p_recipient_email)),
    trim(p_email_type),
    p_priority,
    COALESCE(p_payload, '{}'::jsonb),
    trim(p_idempotency_key),
    p_source_type,
    p_source_reference,
    p_max_attempts,
    'PENDING',
    now()
  )
  ON CONFLICT (idempotency_key)
  DO NOTHING
  RETURNING *
  INTO v_row;

  -- Si la obligación ya existía, devolvemos el registro existente.
  IF v_row.id IS NULL THEN
    SELECT *
    INTO v_row
    FROM public.email_queue
    WHERE idempotency_key = trim(p_idempotency_key);
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- 2. CLAIM ATÓMICO
--
-- FOR UPDATE SKIP LOCKED permite que dos dispatchers puedan
-- ejecutarse simultáneamente sin procesar el mismo correo.
--
-- attempt_count aumenta al reclamar el trabajo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_pending_emails(
  p_worker_id text,
  p_limit integer DEFAULT 10
)
RETURNS SETOF public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_worker_id IS NULL
     OR length(trim(p_worker_id)) = 0 THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;

  IF p_limit <= 0 OR p_limit > 100 THEN
    RAISE EXCEPTION 'limit must be between 1 and 100';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT eq.id
    FROM public.email_queue eq
    WHERE eq.status = 'PENDING'
      AND eq.attempt_count < eq.max_attempts
      AND (
        eq.next_attempt_at IS NULL
        OR eq.next_attempt_at <= now()
      )
    ORDER BY
      eq.priority ASC,
      eq.created_at ASC,
      eq.id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.email_queue eq
  SET
    status = 'PROCESSING',
    attempt_count = eq.attempt_count + 1,
    last_attempt_at = now(),
    locked_at = now(),
    locked_by = trim(p_worker_id),
    last_error = NULL
  FROM candidates c
  WHERE eq.id = c.id
  RETURNING eq.*;
END;
$$;


-- ============================================================
-- 3. MARCAR COMO ENVIADO
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_email_sent(
  p_email_id bigint,
  p_worker_id text,
  p_provider_message_id text DEFAULT NULL
)
RETURNS public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.email_queue;
BEGIN
  UPDATE public.email_queue
  SET
    status = 'SENT',
    sent_at = now(),
    provider_message_id = p_provider_message_id,
    last_error = NULL,
    next_attempt_at = NULL,
    locked_at = NULL,
    locked_by = NULL
  WHERE id = p_email_id
    AND status = 'PROCESSING'
    AND locked_by = trim(p_worker_id)
  RETURNING *
  INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION
      'email % is not PROCESSING for worker %',
      p_email_id,
      p_worker_id;
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- 4. REINTENTO
--
-- Si aún quedan intentos:
--   PROCESSING -> PENDING
--
-- Si ya llegó a max_attempts:
--   PROCESSING -> FAILED
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_email_retry(
  p_email_id bigint,
  p_worker_id text,
  p_error text,
  p_retry_after_seconds integer DEFAULT 300
)
RETURNS public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.email_queue;
  v_row public.email_queue;
BEGIN
  IF p_retry_after_seconds < 0 THEN
    RAISE EXCEPTION 'retry_after_seconds cannot be negative';
  END IF;

  SELECT *
  INTO v_current
  FROM public.email_queue
  WHERE id = p_email_id
    AND status = 'PROCESSING'
    AND locked_by = trim(p_worker_id)
  FOR UPDATE;

  IF v_current.id IS NULL THEN
    RAISE EXCEPTION
      'email % is not PROCESSING for worker %',
      p_email_id,
      p_worker_id;
  END IF;

  IF v_current.attempt_count >= v_current.max_attempts THEN
    UPDATE public.email_queue
    SET
      status = 'FAILED',
      last_error = p_error,
      next_attempt_at = NULL,
      locked_at = NULL,
      locked_by = NULL
    WHERE id = p_email_id
    RETURNING *
    INTO v_row;
  ELSE
    UPDATE public.email_queue
    SET
      status = 'PENDING',
      last_error = p_error,
      next_attempt_at =
        now() + make_interval(secs => p_retry_after_seconds),
      locked_at = NULL,
      locked_by = NULL
    WHERE id = p_email_id
    RETURNING *
    INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- 5. ERROR TERMINAL EXPLÍCITO
--
-- Para errores que sabemos que no deben reintentarse.
-- Ejemplo futuro:
-- destinatario inválido definitivo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_email_failed(
  p_email_id bigint,
  p_worker_id text,
  p_error text
)
RETURNS public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.email_queue;
BEGIN
  UPDATE public.email_queue
  SET
    status = 'FAILED',
    last_error = p_error,
    next_attempt_at = NULL,
    locked_at = NULL,
    locked_by = NULL
  WHERE id = p_email_id
    AND status = 'PROCESSING'
    AND locked_by = trim(p_worker_id)
  RETURNING *
  INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION
      'email % is not PROCESSING for worker %',
      p_email_id,
      p_worker_id;
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- PERMISOS
--
-- Estas funciones pertenecen al backend.
-- No deben poder ejecutarse directamente desde clientes
-- anon/authenticated.
-- ============================================================

REVOKE ALL ON FUNCTION public.enqueue_email(
  text,
  text,
  smallint,
  text,
  jsonb,
  bigint,
  text,
  text,
  integer
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.claim_pending_emails(
  text,
  integer
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mark_email_sent(
  bigint,
  text,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mark_email_retry(
  bigint,
  text,
  text,
  integer
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.mark_email_failed(
  bigint,
  text,
  text
) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.enqueue_email(
  text,
  text,
  smallint,
  text,
  jsonb,
  bigint,
  text,
  text,
  integer
) TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_pending_emails(
  text,
  integer
) TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_email_sent(
  bigint,
  text,
  text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_email_retry(
  bigint,
  text,
  text,
  integer
) TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_email_failed(
  bigint,
  text,
  text
) TO service_role;


COMMENT ON FUNCTION public.enqueue_email(
  text,
  text,
  smallint,
  text,
  jsonb,
  bigint,
  text,
  text,
  integer
) IS
  'Creates an email obligation idempotently and returns the new or existing queue row.';

COMMENT ON FUNCTION public.claim_pending_emails(
  text,
  integer
) IS
  'Atomically claims pending emails using FOR UPDATE SKIP LOCKED.';

COMMENT ON FUNCTION public.mark_email_sent(
  bigint,
  text,
  text
) IS
  'Marks a worker-owned PROCESSING email as SENT.';

COMMENT ON FUNCTION public.mark_email_retry(
  bigint,
  text,
  text,
  integer
) IS
  'Returns a worker-owned email to PENDING or marks it FAILED when max attempts are exhausted.';

COMMENT ON FUNCTION public.mark_email_failed(
  bigint,
  text,
  text
) IS
  'Marks a worker-owned PROCESSING email as terminally FAILED.';