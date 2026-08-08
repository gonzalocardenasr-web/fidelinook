-- =====================================================================
-- NOOK
-- P0.02 — ATOMIC SALE CUSTOMER REASSIGNMENT + LOYALTY RECONCILIATION
-- 2026-08-08
--
-- OBJETIVOS
-- ---------------------------------------------------------------------
-- 1. Permitir que Daily Loyalty materialice:
--      delta > 0  -> sale_credit
--      delta < 0  -> sale_reversal
--      delta = 0  -> no-op
--
-- 2. Evitar idempotency keys incorrectas ante oscilaciones:
--      0 -> 2 -> 1 -> 2 -> 1
--
-- 3. Mantener trazabilidad con la venta que causó el ajuste.
--
-- 4. Hacer atómica la reasignación de una venta entregada:
--
--      cambio customer
--      + auditoría del cambio
--      + promoción POS asociada a la venta
--      + reconciliación cliente anterior
--      + reconciliación cliente nuevo
--      + conversión de premios del cliente nuevo
--      + eventos
--
--    Si cualquier parte falla:
--      ROLLBACK COMPLETO DEL RPC.
--
-- 5. Mantener compatibilidad con:
--      apply_customer_daily_loyalty_credit(...)
--
-- NOTA
-- ---------------------------------------------------------------------
-- La función histórica apply_customer_daily_loyalty_credit conserva
-- su nombre y firma para no romper callers existentes, pero delega
-- ahora en reconcile_customer_daily_loyalty().
-- =====================================================================


-- =====================================================================
-- 1. CORE DE RECONCILIACIÓN DAILY LOYALTY
-- =====================================================================

CREATE OR REPLACE FUNCTION public.reconcile_customer_daily_loyalty(
  p_daily_loyalty_id bigint,
  p_actor_role text DEFAULT NULL::text,
  p_actor_identifier text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text,
  p_causal_sale_id bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_projection customer_daily_loyalty%rowtype;

  v_rebuilt_projection jsonb;
  v_movement_result jsonb;
  v_event_result jsonb;
  v_final_projection jsonb;

  v_pending_delta integer;

  v_movement_id bigint;
  v_movement_created boolean;

  v_source_reference text;

  v_movement_type text;
  v_event_type text;

  v_effective_sale_id bigint;

  v_movement_idempotency_key text;
  v_event_idempotency_key text;

  v_previous_movement_id bigint;
begin

  -- ==========================================================
  -- 1. VALIDAR INPUT
  -- ==========================================================

  if p_daily_loyalty_id is null
    or p_daily_loyalty_id <= 0
  then
    raise exception
      'La proyección diaria indicada no es válida.';
  end if;


  if p_causal_sale_id is not null
    and p_causal_sale_id <= 0
  then
    raise exception
      'La venta causal indicada no es válida.';
  end if;


  select *
  into v_projection
  from customer_daily_loyalty
  where id = p_daily_loyalty_id;

  if not found then
    raise exception
      'La proyección diaria indicada no existe.';
  end if;


  -- ==========================================================
  -- 2. RECONSTRUIR ANTES DE MATERIALIZAR
  --
  -- Nunca aplicamos una proyección obsoleta.
  -- ==========================================================

  select rebuild_customer_daily_loyalty(
    v_projection.customer_id,
    v_projection.business_date,
    v_projection.policy_code,
    v_projection.policy_version,
    coalesce(
      nullif(trim(coalesce(p_reason, '')), ''),
      'daily_loyalty_reconciliation'
    )
  )
  into v_rebuilt_projection;


  -- Bloqueamos el estado recalculado.
  select *
  into v_projection
  from customer_daily_loyalty
  where id = p_daily_loyalty_id
  for update;

  if not found then
    raise exception
      'La proyección diaria desapareció durante el cálculo.';
  end if;


  if v_projection.projection_status = 'error' then
    raise exception
      'La proyección diaria está en estado de error.';
  end if;


  -- ==========================================================
  -- 3. CALCULAR DELTA REAL
  -- ==========================================================

  v_pending_delta :=
    v_projection.expected_stamps
    - v_projection.applied_stamps;


  v_source_reference :=
    coalesce(
      nullif(
        trim(
          v_projection.metadata
            ->> 'movementSourceReference'
        ),
        ''
      ),
      'daily-loyalty:'
        || v_projection.customer_id
        || ':'
        || v_projection.business_date
        || ':'
        || v_projection.policy_code
        || ':'
        || v_projection.policy_version
    );


  -- ==========================================================
  -- 4. DELTA CERO = YA RECONCILIADO
  -- ==========================================================

  if v_pending_delta = 0 then

    return jsonb_build_object(
      'daily_loyalty_id',
      v_projection.id,

      'customer_id',
      v_projection.customer_id,

      'business_date',
      v_projection.business_date,

      'expected_stamps',
      v_projection.expected_stamps,

      'previously_applied_stamps',
      v_projection.applied_stamps,

      'pending_stamp_delta',
      0,

      'applied_delta',
      0,

      'movement_id',
      null,

      'movement_created',
      false,

      'event_id',
      null,

      'event_created',
      false,

      'applied',
      false,

      'reason',
      'projection_already_reconciled'
    );

  end if;


  -- ==========================================================
  -- 5. DEFINIR DIRECCIÓN DEL AJUSTE
  -- ==========================================================

  if v_pending_delta > 0 then

    v_movement_type :=
      'sale_credit';

    v_event_type :=
      'loyalty.stamps_credited';

  else

    v_movement_type :=
      'sale_reversal';

    v_event_type :=
      'loyalty.stamps_reversed';

  end if;


  -- ==========================================================
  -- 6. DETERMINAR VENTA CAUSAL
  --
  -- En operación normal usamos last_sale_id.
  --
  -- En una reasignación podemos forzar explícitamente la venta
  -- que produjo la reconciliación.
  -- ==========================================================

  v_effective_sale_id :=
    coalesce(
      p_causal_sale_id,
      v_projection.last_sale_id
    );


  -- ==========================================================
  -- 7. IDEMPOTENCIA SEGURA
  --
  -- NO usamos solamente expected_stamps.
  --
  -- Ejemplo válido:
  --
  --   0 -> 2
  --   2 -> 1
  --   1 -> 2
  --   2 -> 1
  --
  -- Cada transición se diferencia por el último movimiento del
  -- ledger previo a la nueva materialización.
  --
  -- Un retry real del mismo estado sí reutiliza la misma key.
  -- ==========================================================

  v_previous_movement_id :=
    coalesce(
      v_projection.last_loyalty_movement_id,
      0
    );


  v_movement_idempotency_key :=
    'daily-loyalty-adjustment:'
    || v_projection.id
    || ':after:'
    || v_previous_movement_id
    || ':to:'
    || v_projection.expected_stamps;


  -- ==========================================================
  -- 8. REGISTRAR MOVIMIENTO
  --
  -- record_loyalty_movement protege:
  -- - cliente válido
  -- - idempotencia
  -- - saldo negativo
  -- - rebuild de loyalty_account
  --
  -- Si una reversa intenta consumir más sellos que los
  -- disponibles, falla y la transacción completa debe abortar.
  -- ==========================================================

  select record_loyalty_movement(
    p_customer_id :=
      v_projection.customer_id,

    p_movement_type :=
      v_movement_type,

    p_stamp_delta :=
      v_pending_delta,

    p_source :=
      'daily_loyalty',

    p_source_reference :=
      v_source_reference,

    p_sale_id :=
      v_effective_sale_id,

    p_reward_id :=
      null,

    p_reason :=
      coalesce(
        nullif(
          trim(coalesce(p_reason, '')),
          ''
        ),
        case
          when v_pending_delta > 0
            then
              'Acreditación de proyección diaria de fidelización.'
          else
            'Reversa por reconciliación de proyección diaria de fidelización.'
        end
      ),

    p_actor_role :=
      nullif(
        trim(coalesce(p_actor_role, '')),
        ''
      ),

    p_actor_identifier :=
      nullif(
        trim(coalesce(p_actor_identifier, '')),
        ''
      ),

    p_reversal_of_movement_id :=
      null,

    p_occurred_at :=
      coalesce(
        v_projection.calculated_at,
        now()
      ),

    p_idempotency_key :=
      v_movement_idempotency_key,

    p_metadata :=
      jsonb_build_object(
        'dailyLoyaltyId',
        v_projection.id,

        'businessDate',
        v_projection.business_date,

        'policyCode',
        v_projection.policy_code,

        'policyVersion',
        v_projection.policy_version,

        'eligibleNetAmount',
        v_projection.eligible_net_amount,

        'eligibleSalesCount',
        v_projection.eligible_sales_count,

        'baseStamps',
        v_projection.base_stamps,

        'amountStamps',
        v_projection.amount_stamps,

        'firstPurchaseBonus',
        v_projection.first_purchase_bonus,

        'promotionBonus',
        v_projection.promotion_bonus,

        'expectedStamps',
        v_projection.expected_stamps,

        'previouslyAppliedStamps',
        v_projection.applied_stamps,

        'appliedDelta',
        v_pending_delta,

        'adjustmentDirection',
        case
          when v_pending_delta > 0
            then 'credit'
          else 'reversal'
        end,

        'causalSaleId',
        v_effective_sale_id,

        'previousDailyMovementId',
        nullif(v_previous_movement_id, 0)
      )
  )
  into v_movement_result;


  v_movement_id :=
    (v_movement_result->>'movement_id')::bigint;


  v_movement_created :=
    coalesce(
      (v_movement_result->>'created')::boolean,
      false
    );


  if v_movement_id is null
    or v_movement_id <= 0
  then
    raise exception
      'El movimiento no entregó un identificador válido.';
  end if;


  -- ==========================================================
  -- 9. REGISTRAR EVENTO TRANSVERSAL
  -- ==========================================================

  v_event_idempotency_key :=
    case
      when v_pending_delta > 0
        then 'loyalty-stamps-credited:'
      else 'loyalty-stamps-reversed:'
    end
    || v_movement_id;


  select record_customer_event(
    p_customer_id :=
      v_projection.customer_id,

    p_event_type :=
      v_event_type,

    p_source_module :=
      'loyalty',

    p_source_entity_type :=
      'loyalty_movement',

    p_source_entity_id :=
      v_movement_id::text,

    p_sale_id :=
      v_effective_sale_id,

    p_reward_id :=
      null,

    p_loyalty_movement_id :=
      v_movement_id,

    p_actor_role :=
      nullif(
        trim(coalesce(p_actor_role, '')),
        ''
      ),

    p_actor_identifier :=
      nullif(
        trim(coalesce(p_actor_identifier, '')),
        ''
      ),

    p_occurred_at :=
      coalesce(
        v_projection.calculated_at,
        now()
      ),

    p_idempotency_key :=
      v_event_idempotency_key,

    p_metadata :=
      jsonb_build_object(
        'dailyLoyaltyId',
        v_projection.id,

        'businessDate',
        v_projection.business_date,

        'stampDelta',
        v_pending_delta,

        'expectedStamps',
        v_projection.expected_stamps,

        'previouslyAppliedStamps',
        v_projection.applied_stamps,

        'policyCode',
        v_projection.policy_code,

        'policyVersion',
        v_projection.policy_version,

        'sourceReference',
        v_source_reference,

        'adjustmentDirection',
        case
          when v_pending_delta > 0
            then 'credit'
          else 'reversal'
        end,

        'causalSaleId',
        v_effective_sale_id
      )
  )
  into v_event_result;


  -- ==========================================================
  -- 10. RECONSTRUIR NUEVAMENTE
  --
  -- applied_stamps se calcula algebraicamente desde:
  --
  -- loyalty_movements
  -- WHERE source = 'daily_loyalty'
  -- AND source_reference = ...
  --
  -- Por tanto:
  --   credits + reversals = applied_stamps real.
  -- ==========================================================

  select rebuild_customer_daily_loyalty(
    v_projection.customer_id,
    v_projection.business_date,
    v_projection.policy_code,
    v_projection.policy_version,
    case
      when v_pending_delta > 0
        then 'daily_loyalty_credit_applied'
      else 'daily_loyalty_reversal_applied'
    end
  )
  into v_final_projection;


  -- ==========================================================
  -- 11. LA PROYECCIÓN DEBE QUEDAR RECONCILIADA
  --
  -- Si no queda en delta 0, abortamos.
  -- No aceptamos deuda silenciosa.
  -- ==========================================================

  if coalesce(
       (v_final_projection->>'pending_stamp_delta')::integer,
       0
     ) <> 0
  then
    raise exception
      'La reconciliación diaria no terminó en delta cero para daily_loyalty_id %.',
      v_projection.id;
  end if;


  update customer_daily_loyalty
  set
    projection_status =
      'reconciled',

    applied_at =
      coalesce(
        applied_at,
        now()
      ),

    reconciled_at =
      now()

  where id = v_projection.id;


  -- ==========================================================
  -- 12. RESPUESTA
  -- ==========================================================

  return jsonb_build_object(
    'daily_loyalty_id',
    v_projection.id,

    'customer_id',
    v_projection.customer_id,

    'business_date',
    v_projection.business_date,

    'expected_stamps',
    v_projection.expected_stamps,

    'previously_applied_stamps',
    v_projection.applied_stamps,

    'applied_delta',
    v_pending_delta,

    'movement_id',
    v_movement_id,

    'movement_created',
    v_movement_created,

    'event_id',
    v_event_result->'event_id',

    'event_created',
    v_event_result->'created',

    'applied',
    true,

    'movement_type',
    v_movement_type,

    'causal_sale_id',
    v_effective_sale_id,

    'final_projection',
    v_final_projection
  );

end;
$function$;


-- =====================================================================
-- 2. MANTENER COMPATIBILIDAD CON EL RPC EXISTENTE
--
-- Los callers actuales siguen usando:
--
-- apply_customer_daily_loyalty_credit(...)
--
-- Ahora esa función simplemente delega al reconciliador general.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.apply_customer_daily_loyalty_credit(
  p_daily_loyalty_id bigint,
  p_actor_role text DEFAULT NULL::text,
  p_actor_identifier text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin

  return public.reconcile_customer_daily_loyalty(
    p_daily_loyalty_id :=
      p_daily_loyalty_id,

    p_actor_role :=
      p_actor_role,

    p_actor_identifier :=
      p_actor_identifier,

    p_reason :=
      p_reason,

    p_causal_sale_id :=
      null
  );

end;
$function$;


-- =====================================================================
-- 3. RPC ATÓMICO DE REASIGNACIÓN DE CLIENTE + LOYALTY
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assign_customer_to_sale_with_loyalty(
  p_sale_id bigint,
  p_customer_id bigint,
  p_actor_role text DEFAULT NULL::text,
  p_actor_identifier text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_sale sales%rowtype;
  v_new_customer clientes%rowtype;

  v_previous_customer_id bigint;

  v_assignment_result jsonb;
  v_change_id bigint;

  v_delivered_order orders%rowtype;
  v_is_delivered boolean := false;

  v_timezone text := 'America/Santiago';
  v_business_date date;

  v_previous_projection jsonb;
  v_previous_application jsonb;

  v_new_projection_pre_promotion jsonb;
  v_new_projection jsonb;
  v_new_application jsonb;

  v_new_conversion jsonb;

  v_new_daily_loyalty_id bigint;

  v_promotion_key text;
  v_promotion_moved boolean := false;

  v_event_result jsonb;
begin

  -- ==========================================================
  -- 1. VALIDAR INPUT
  -- ==========================================================

  if p_sale_id is null
    or p_sale_id <= 0
  then
    raise exception
      'La venta indicada no es válida.';
  end if;


  if p_customer_id is null
    or p_customer_id <= 0
  then
    raise exception
      'El cliente indicado no es válido.';
  end if;


  -- ==========================================================
  -- 2. BLOQUEAR Y CARGAR VENTA
  -- ==========================================================

  select *
  into v_sale
  from sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception
      'La venta indicada no existe.';
  end if;


  -- ==========================================================
  -- 3. VALIDAR CLIENTE NUEVO
  -- ==========================================================

  select *
  into v_new_customer
  from clientes
  where id = p_customer_id;

  if not found then
    raise exception
      'El cliente indicado no existe.';
  end if;


  v_previous_customer_id :=
    v_sale.customer_id;


  -- ==========================================================
  -- 4. NO-OP SI YA ESTÁ ASIGNADA
  -- ==========================================================

  if v_previous_customer_id
     is not distinct from p_customer_id
  then

    return jsonb_build_object(
      'sale_id',
      v_sale.id,

      'change_id',
      null,

      'previous_customer_id',
      v_previous_customer_id,

      'customer_id',
      p_customer_id,

      'customer_name',
      v_new_customer.nombre,

      'changed',
      false,

      'delivered',
      false,

      'business_date',
      null,

      'promotion_moved',
      false,

      'previous_projection',
      null,

      'previous_application',
      null,

      'new_projection',
      null,

      'new_application',
      null,

      'new_conversion',
      null
    );

  end if;


  -- ==========================================================
  -- 5. REALIZAR ASIGNACIÓN BASE
  --
  -- Reutilizamos la función ya existente.
  --
  -- Al ejecutarse dentro de este RPC forma parte de LA MISMA
  -- transacción PostgreSQL.
  -- ==========================================================

  select public.assign_customer_to_sale(
    p_sale_id :=
      p_sale_id,

    p_customer_id :=
      p_customer_id,

    p_actor_role :=
      p_actor_role,

    p_reason :=
      p_reason
  )
  into v_assignment_result;


  v_change_id :=
    (v_assignment_result->>'change_id')::bigint;


  if v_change_id is null
    or v_change_id <= 0
  then
    raise exception
      'La reasignación no generó un change_id válido.';
  end if;


  -- ==========================================================
  -- 6. EVENTO ATÓMICO DE REASIGNACIÓN
  -- ==========================================================

  select record_customer_event(
    p_customer_id :=
      p_customer_id,

    p_event_type :=
      case
        when v_previous_customer_id is null
          then 'sale.customer_assigned'
        else 'sale.customer_changed'
      end,

    p_source_module :=
      'sales',

    p_source_entity_type :=
      'sale_customer_change',

    p_source_entity_id :=
      v_change_id::text,

    p_sale_id :=
      p_sale_id,

    p_reward_id :=
      null,

    p_loyalty_movement_id :=
      null,

    p_actor_role :=
      nullif(
        trim(coalesce(p_actor_role, '')),
        ''
      ),

    p_actor_identifier :=
      nullif(
        trim(coalesce(p_actor_identifier, '')),
        ''
      ),

    p_occurred_at :=
      now(),

    p_idempotency_key :=
      'sale-customer-change:'
      || v_change_id,

    p_metadata :=
      jsonb_build_object(
        'previousCustomerId',
        v_previous_customer_id,

        'newCustomerId',
        p_customer_id,

        'reason',
        nullif(
          trim(coalesce(p_reason, '')),
          ''
        )
      )
  )
  into v_event_result;


  -- ==========================================================
  -- 7. ¿LA VENTA YA FUE ENTREGADA?
  -- ==========================================================

  select *
  into v_delivered_order
  from orders
  where sale_id = p_sale_id
    and status = 'delivered'
    and delivered_at is not null
  order by delivered_at desc, id desc
  limit 1
  for update;

  if found then
    v_is_delivered := true;
  else
    v_is_delivered := false;
  end if;


  -- ==========================================================
  -- 8. SI NO FUE ENTREGADA, TERMINAMOS
  --
  -- La fidelización se construirá normalmente al entregar.
  -- ==========================================================

  if not v_is_delivered then

    return jsonb_build_object(
      'sale_id',
      p_sale_id,

      'change_id',
      v_change_id,

      'previous_customer_id',
      v_previous_customer_id,

      'customer_id',
      p_customer_id,

      'customer_name',
      v_new_customer.nombre,

      'changed',
      true,

      'delivered',
      false,

      'business_date',
      null,

      'promotion_moved',
      false,

      'previous_projection',
      null,

      'previous_application',
      null,

      'new_projection',
      null,

      'new_application',
      null,

      'new_conversion',
      null
    );

  end if;


  -- ==========================================================
  -- 9. DÍA COMERCIAL DE LA ENTREGA
  -- ==========================================================

  v_business_date :=
    (
      v_delivered_order.delivered_at
        at time zone v_timezone
    )::date;


  -- ==========================================================
  -- 10. CREAR / REUTILIZAR PROYECCIÓN DEL CLIENTE NUEVO
  --
  -- Esto nos da el daily_loyalty_id destino antes de mover
  -- la promoción POS.
  -- ==========================================================

  select rebuild_customer_daily_loyalty(
    p_customer_id,
    v_business_date,
    'LOYALTY_POLICY_V1',
    1,
    case
      when v_previous_customer_id is null
        then 'sale.customer_assigned:new_customer:prepare'
      else 'sale.customer_changed:new_customer:prepare'
    end
  )
  into v_new_projection_pre_promotion;


  v_new_daily_loyalty_id :=
    (
      v_new_projection_pre_promotion
        ->> 'daily_loyalty_id'
    )::bigint;


  if v_new_daily_loyalty_id is null
    or v_new_daily_loyalty_id <= 0
  then
    raise exception
      'No fue posible crear la proyección diaria del cliente nuevo.';
  end if;


  -- ==========================================================
  -- 11. SINCRONIZAR PROMOCIÓN POS ASOCIADA A LA VENTA
  --
  -- La venta es la fuente de verdad para promotional_stamps.
  --
  -- La key usada por el flujo delivered es:
  --   pos-sale-promotion:<saleId>
  --
  -- Si la venta tiene promoción:
  --   UPSERT hacia el nuevo cliente/proyección.
  --
  -- Si no tiene:
  --   eliminamos cualquier registro huérfano con esa key.
  -- ==========================================================

  v_promotion_key :=
    'pos-sale-promotion:'
    || p_sale_id;


  if coalesce(v_sale.promotional_stamps, 0) > 0 then

    insert into customer_daily_loyalty_promotions (
      daily_loyalty_id,
      customer_id,
      business_date,
      loyalty_rule_id,
      promotion_code,
      effect_type,
      multiplier,
      fixed_stamp_bonus,
      applied_stamp_bonus,
      actor_role,
      actor_identifier,
      evidence_reference,
      idempotency_key,
      metadata
    )
    values (
      v_new_daily_loyalty_id,
      p_customer_id,
      v_business_date,
      null,
      'POS_RRSS',
      'fixed_stamp_bonus',
      null,
      v_sale.promotional_stamps,
      v_sale.promotional_stamps,
      nullif(
        trim(coalesce(p_actor_role, '')),
        ''
      ),
      nullif(
        trim(coalesce(p_actor_identifier, '')),
        ''
      ),
      'sale:'
        || p_sale_id,
      v_promotion_key,
      jsonb_build_object(
        'saleId',
        p_sale_id,

        'orderId',
        v_delivered_order.id,

        'reason',
        v_sale.promotion_reason,

        'source',
        'pos',

        'reassigned',
        true,

        'previousCustomerId',
        v_previous_customer_id,

        'newCustomerId',
        p_customer_id
      )
    )

    on conflict (idempotency_key)
    do update
    set
      daily_loyalty_id =
        excluded.daily_loyalty_id,

      customer_id =
        excluded.customer_id,

      business_date =
        excluded.business_date,

      fixed_stamp_bonus =
        excluded.fixed_stamp_bonus,

      applied_stamp_bonus =
        excluded.applied_stamp_bonus,

      actor_role =
        excluded.actor_role,

      actor_identifier =
        excluded.actor_identifier,

      evidence_reference =
        excluded.evidence_reference,

      metadata =
        excluded.metadata;


    v_promotion_moved := true;

  else

    delete from customer_daily_loyalty_promotions
    where idempotency_key = v_promotion_key;


    v_promotion_moved := false;

  end if;


  -- ==========================================================
  -- 12. RECONCILIAR CLIENTE ANTERIOR
  --
  -- sales.customer_id ya apunta al nuevo cliente.
  -- La promoción también dejó de pertenecer al anterior.
  --
  -- El rebuild elimina automáticamente esa venta de su día.
  -- ==========================================================

  if v_previous_customer_id is not null
    and v_previous_customer_id > 0
    and v_previous_customer_id <> p_customer_id
  then

    select rebuild_customer_daily_loyalty(
      v_previous_customer_id,
      v_business_date,
      'LOYALTY_POLICY_V1',
      1,
      'sale.customer_changed:previous_customer'
    )
    into v_previous_projection;


    select public.reconcile_customer_daily_loyalty(
      p_daily_loyalty_id :=
        (
          v_previous_projection
            ->> 'daily_loyalty_id'
        )::bigint,

      p_actor_role :=
        p_actor_role,

      p_actor_identifier :=
        p_actor_identifier,

      p_reason :=
        'Reconciliación automática por reasignación de venta: cliente anterior.',

      p_causal_sale_id :=
        p_sale_id
    )
    into v_previous_application;

  else

    v_previous_projection := null;
    v_previous_application := null;

  end if;


  -- ==========================================================
  -- 13. RECONSTRUIR CLIENTE NUEVO CON PROMOCIÓN YA SINCRONIZADA
  -- ==========================================================

  select rebuild_customer_daily_loyalty(
    p_customer_id,
    v_business_date,
    'LOYALTY_POLICY_V1',
    1,
    case
      when v_previous_customer_id is null
        then 'sale.customer_assigned:new_customer'
      else 'sale.customer_changed:new_customer'
    end
  )
  into v_new_projection;


  -- ==========================================================
  -- 14. RECONCILIAR CLIENTE NUEVO
  -- ==========================================================

  select public.reconcile_customer_daily_loyalty(
    p_daily_loyalty_id :=
      (
        v_new_projection
          ->> 'daily_loyalty_id'
      )::bigint,

    p_actor_role :=
      p_actor_role,

    p_actor_identifier :=
      p_actor_identifier,

    p_reason :=
      'Reconciliación automática por reasignación de venta: cliente nuevo.',

    p_causal_sale_id :=
      p_sale_id
  )
  into v_new_application;


  -- ==========================================================
  -- 15. CONVERTIR SELLOS DEL CLIENTE NUEVO EN PREMIOS
  --
  -- Forma parte de la misma transacción.
  --
  -- Si falla:
  --   rollback de TODA la reasignación.
  -- ==========================================================

  select public.convert_loyalty_stamps_to_rewards(
    p_customer_id :=
      p_customer_id,

    p_actor_role :=
      p_actor_role,

    p_actor_identifier :=
      p_actor_identifier,

    p_reason :=
      'Conversión automática posterior a reasignación de venta.'
  )
  into v_new_conversion;


  -- ==========================================================
  -- 16. GUARDRAIL FINAL
  --
  -- Ninguna de las dos proyecciones puede quedar con deuda.
  -- ==========================================================

  if v_previous_projection is not null then

    if exists (
      select 1
      from customer_daily_loyalty
      where id =
        (
          v_previous_projection
            ->> 'daily_loyalty_id'
        )::bigint
        and pending_stamp_delta <> 0
    ) then

      raise exception
        'La fidelización del cliente anterior quedó sin reconciliar.';

    end if;

  end if;


  if exists (
    select 1
    from customer_daily_loyalty
    where id =
      (
        v_new_projection
          ->> 'daily_loyalty_id'
      )::bigint
      and pending_stamp_delta <> 0
  ) then

    raise exception
      'La fidelización del cliente nuevo quedó sin reconciliar.';

  end if;


  -- ==========================================================
  -- 17. RESPUESTA
  -- ==========================================================

  return jsonb_build_object(
    'sale_id',
    p_sale_id,

    'change_id',
    v_change_id,

    'previous_customer_id',
    v_previous_customer_id,

    'customer_id',
    p_customer_id,

    'customer_name',
    v_new_customer.nombre,

    'changed',
    true,

    'delivered',
    true,

    'business_date',
    v_business_date,

    'promotion_moved',
    v_promotion_moved,

    'sale_customer_event',
    v_event_result,

    'previous_projection',
    v_previous_projection,

    'previous_application',
    v_previous_application,

    'new_projection',
    v_new_projection,

    'new_application',
    v_new_application,

    'new_conversion',
    v_new_conversion
  );

end;
$function$;


-- =====================================================================
-- FIN P0.02
-- =====================================================================