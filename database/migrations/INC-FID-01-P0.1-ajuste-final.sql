-- INC-FID-01 / P0.1 - Ajuste mínimo y protegido
-- No modifica datos históricos ni crea objetos nuevos.

BEGIN;

-- Protección contra sobrescribir una versión posterior de la función.
DO $guard$
DECLARE
  v_actual text;
  v_defaults integer;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_actual
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'activate_customer_by_token'
    AND pg_get_function_identity_arguments(p.oid) = 'p_token text, p_activation_source text';

  IF v_actual IS NULL OR md5(v_actual) <> 'f767883f9c0fa2e50c53e3128368c6a8' THEN
    RAISE EXCEPTION 'La función de activación cambió desde la auditoría; no sobrescribir.';
  END IF;

  SELECT p.pronargdefaults
  INTO v_defaults
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'convert_loyalty_stamps_to_rewards'
    AND pg_get_function_identity_arguments(p.oid) =
      'p_customer_id bigint, p_actor_role text, p_actor_identifier text, p_reason text';

  IF v_defaults IS NULL OR v_defaults < 3 THEN
    RAISE EXCEPTION 'Conversión de premios: faltan valores por defecto para invocar solo con customer_id.';
  END IF;
END;
$guard$;

CREATE OR REPLACE FUNCTION public.activate_customer_by_token(p_token text, p_activation_source text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer public.clientes%ROWTYPE;
  v_activation_at timestamptz;
  v_was_active boolean;
  v_event_result jsonb;

  v_day record;
  v_projection jsonb;
  v_reconciliation jsonb;
  v_rewards jsonb;

  v_daily_loyalty_id bigint;
  v_days_processed integer := 0;
  v_stamps_recovered integer := 0;
  v_balance_before integer := 0;
  v_balance_after integer := 0;
BEGIN
  -- 1. Validaciones originales.
  IF NULLIF(TRIM(COALESCE(p_token, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Token de verificación no válido.';
  END IF;

  IF NULLIF(TRIM(COALESCE(p_activation_source, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El origen de la activación es obligatorio.';
  END IF;

  -- 2. Bloqueo del cliente.
  SELECT *
  INTO v_customer
  FROM public.clientes
  WHERE token_verificacion = TRIM(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido o cliente no encontrado.';
  END IF;

  v_was_active :=
    COALESCE(v_customer.email_verificado, FALSE)
    AND COALESCE(v_customer.tarjeta_activa, FALSE);

  v_activation_at :=
    COALESCE(v_customer.fecha_activacion, NOW());

  -- 3. Saldo previo.
  SELECT COALESCE(current_stamp_balance, 0)
  INTO v_balance_before
  FROM public.loyalty_accounts
  WHERE customer_id = v_customer.id;

  v_balance_before := COALESCE(v_balance_before, 0);

  -- 4. Activación original.
  UPDATE public.clientes
  SET
    email_verificado = TRUE,
    tarjeta_activa = TRUE,
    fecha_activacion = v_activation_at,
    token_verificacion = NULL
  WHERE id = v_customer.id;

  -- 5. Evento original.
  SELECT public.record_customer_event(
    p_customer_id := v_customer.id,
    p_event_type := 'customer.activated',
    p_source_module := 'customers',
    p_source_entity_type := 'customer',
    p_source_entity_id := v_customer.id::text,
    p_actor_role := NULL,
    p_actor_identifier := v_customer.auth_user_id::text,
    p_occurred_at := v_activation_at,
    p_idempotency_key := 'customer-activated:' || v_customer.id,
    p_metadata := jsonb_build_object(
      'activationSource', TRIM(p_activation_source),
      'hasAuthUser', v_customer.auth_user_id IS NOT NULL,
      'wasAlreadyActive', v_was_active
    )
  )
  INTO v_event_result;

  -- 6. Recuperar todas las fechas con compras entregadas.
  -- No depende de que exista previamente customer_daily_loyalty.
  FOR v_day IN
    SELECT DISTINCT
      (o.delivered_at AT TIME ZONE 'America/Santiago')::date
        AS business_date
    FROM public.sales s
    JOIN public.orders o ON o.sale_id = s.id
    WHERE s.customer_id = v_customer.id
      AND o.status = 'delivered'
      AND o.delivered_at IS NOT NULL
    ORDER BY business_date
  LOOP
    -- 7. Crear o actualizar la proyección del día.
    SELECT public.rebuild_customer_daily_loyalty(
      p_customer_id := v_customer.id,
      p_business_date := v_day.business_date,
      p_policy_code := 'LOYALTY_POLICY_V1',
      p_policy_version := 1,
      p_recalculation_reason := 'customer_activation_recovery'
    )
    INTO v_projection;

    v_daily_loyalty_id :=
      (v_projection->>'daily_loyalty_id')::bigint;

    IF v_daily_loyalty_id IS NULL THEN
      RAISE EXCEPTION
        'No se generó proyección para cliente %, fecha %',
        v_customer.id, v_day.business_date;
    END IF;

    -- 8. Acreditar usando el motor oficial.
    SELECT public.reconcile_customer_daily_loyalty(
      p_daily_loyalty_id := v_daily_loyalty_id,
      p_actor_role := 'system',
      p_actor_identifier := 'customer-activation',
      p_reason := 'Recuperación automática tras validación'
    )
    INTO v_reconciliation;

    v_days_processed := v_days_processed + 1;
  END LOOP;

  -- 9. Convertir sellos acumulados en premios.
  IF v_days_processed > 0 THEN
    SELECT public.convert_loyalty_stamps_to_rewards(
      p_customer_id := v_customer.id
    )
    INTO v_rewards;
  END IF;

  SELECT COALESCE(current_stamp_balance, 0)
  INTO v_balance_after
  FROM public.loyalty_accounts
  WHERE customer_id = v_customer.id;

  v_balance_after := COALESCE(v_balance_after, 0);

  RETURN jsonb_build_object(
    'customer_id', v_customer.id,
    'nombre', v_customer.nombre,
    'correo', v_customer.correo,
    'public_token', v_customer.public_token,
    'auth_user_id', v_customer.auth_user_id,
    'activated', NOT v_was_active,
    'already_active', v_was_active,
    'activation_at', v_activation_at,
    'event_id', v_event_result->'event_id',
    'event_created', v_event_result->'created',
    'loyalty_days_processed', v_days_processed,
    'stamp_balance_before', v_balance_before,
    'stamp_balance_after', v_balance_after
  );
END;
$function$;


-- Comprobación de la versión instalada dentro de la transacción.
DO $verify$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'activate_customer_by_token'
    AND pg_get_function_identity_arguments(p.oid) = 'p_token text, p_activation_source text';

  IF v_def IS NULL
     OR position('o.delivered_at <= v_activation_at' in v_def) > 0
     OR position('o.status = ''delivered''' in v_def) = 0
     OR position('rebuild_customer_daily_loyalty' in v_def) = 0
     OR position('reconcile_customer_daily_loyalty' in v_def) = 0
  THEN
    RAISE EXCEPTION 'La definición final no superó la comprobación.';
  END IF;
END;
$verify$;

COMMIT;
