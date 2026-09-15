-- ============================================================
-- DEV-LOY-RED-01
-- Asociar producto canónico al emitir premios de fidelización.
--
-- Corrige:
--   FREE_SIMPLE_ICE_CREAM -> products.sku = HEL-SIMPLE
--
-- Además regulariza premios ya emitidos sin reward_product_id.
-- ============================================================

create or replace function public.convert_loyalty_stamps_to_rewards(
  p_customer_id bigint,
  p_actor_role text default null::text,
  p_actor_identifier text default null::text,
  p_reason text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_account loyalty_accounts%rowtype;

  v_threshold integer := 7;
  v_validity_days integer := 30;

  v_reward_code text := 'FREE_SIMPLE_ICE_CREAM';
  v_reward_name text := 'Helado simple gratis';
  v_reward_description text := 'Un helado simple a elección.';
  v_reward_type text := 'loyalty';

  -- Producto canónico asociado al premio.
  v_reward_product_id bigint;

  v_rewards_to_issue integer := 0;
  v_reward_index integer;

  v_reward_id bigint;
  v_legacy_reward_id text;

  v_conversion_movement jsonb;
  v_conversion_movement_id bigint;

  v_reward_event jsonb;

  v_issued_reward_ids bigint[] := '{}';
  v_final_account jsonb;
begin
  -- ==========================================================
  -- 1. VALIDACIONES Y BLOQUEO DE CUENTA
  -- ==========================================================

  if p_customer_id is null or p_customer_id <= 0 then
    raise exception 'El cliente indicado no es válido.';
  end if;

  if not exists (
    select 1
    from clientes
    where id = p_customer_id
  ) then
    raise exception 'El cliente indicado no existe.';
  end if;

  select *
  into v_account
  from loyalty_accounts
  where customer_id = p_customer_id
  for update;

  if not found then
    perform rebuild_loyalty_account(p_customer_id);

    select *
    into v_account
    from loyalty_accounts
    where customer_id = p_customer_id
    for update;
  end if;

  -- ==========================================================
  -- 2. CARGAR LA REGLA VIGENTE CONFIGURADA
  -- ==========================================================

  select
    coalesce(
      (conditions->>'stampsRequired')::integer,
      7
    ),

    coalesce(
      (effect->>'validityDays')::integer,
      30
    ),

    coalesce(
      nullif(effect->>'rewardCode', ''),
      'FREE_SIMPLE_ICE_CREAM'
    ),

    coalesce(
      nullif(effect->>'rewardName', ''),
      'Helado simple gratis'
    ),

    coalesce(
      nullif(effect->>'rewardDescription', ''),
      'Un helado simple a elección.'
    ),

    coalesce(
      nullif(effect->>'rewardType', ''),
      'loyalty'
    )

  into
    v_threshold,
    v_validity_days,
    v_reward_code,
    v_reward_name,
    v_reward_description,
    v_reward_type

  from loyalty_rules
  where code = 'LOYALTY_REWARD_THRESHOLD'
    and version = 1
    and configuration_version = 'LOYALTY_POLICY_V1'
  limit 1;

  v_threshold := coalesce(v_threshold, 7);
  v_validity_days := coalesce(v_validity_days, 30);

  if v_threshold <= 0 then
    raise exception
      'La meta de sellos configurada no es válida.';
  end if;

  if v_validity_days <= 0 then
    raise exception
      'La vigencia configurada para el premio no es válida.';
  end if;

  -- ==========================================================
  -- 2A. RESOLVER PRODUCTO CANÓNICO DEL PREMIO
  -- ==========================================================
  --
  -- FREE_SIMPLE_ICE_CREAM representa exactamente una unidad
  -- del SKU HEL-SIMPLE.
  --
  -- La resolución ocurre antes de consumir sellos.
  -- Si el catálogo no permite resolver el producto, la emisión
  -- falla en vez de crear un premio incompleto.
  -- ==========================================================

  v_reward_product_id := null;

  if v_reward_code = 'FREE_SIMPLE_ICE_CREAM' then
    select p.id
    into v_reward_product_id
    from products p
    where p.sku = 'HEL-SIMPLE'
      and p.is_active = true
    order by p.id
    limit 1;

    if v_reward_product_id is null then
      raise exception
        'No existe un producto activo HEL-SIMPLE para emitir el premio FREE_SIMPLE_ICE_CREAM.';
    end if;
  end if;

  v_rewards_to_issue :=
    floor(
      v_account.current_stamp_balance::numeric
      / v_threshold
    )::integer;

  -- ==========================================================
  -- 3. SIN CONVERSIÓN PENDIENTE
  -- ==========================================================

  if v_rewards_to_issue <= 0 then
    perform sync_legacy_customer_stamp_balance(
      p_customer_id
    );

    perform sync_legacy_customer_rewards(
      p_customer_id
    );

    return jsonb_build_object(
      'customer_id', p_customer_id,
      'balance_before',
        v_account.current_stamp_balance,
      'rewards_issued', 0,
      'stamps_consumed', 0,
      'balance_after',
        v_account.current_stamp_balance,
      'converted', false,
      'reason', 'reward_threshold_not_reached'
    );
  end if;

  -- ==========================================================
  -- 4. DESCONTAR SELLOS EN UN ÚNICO MOVIMIENTO
  -- ==========================================================

  select record_loyalty_movement(
    p_customer_id :=
      p_customer_id,

    p_movement_type :=
      'reward_conversion',

    p_stamp_delta :=
      -(v_rewards_to_issue * v_threshold),

    p_source :=
      'loyalty_reward_conversion',

    p_source_reference :=
      'reward-conversion:'
      || p_customer_id
      || ':account-movement:'
      || coalesce(
           v_account.last_movement_id::text,
           'opening'
         )
      || ':balance:'
      || v_account.current_stamp_balance,

    p_sale_id :=
      null,

    p_reward_id :=
      null,

    p_reason :=
      coalesce(
        nullif(trim(coalesce(p_reason, '')), ''),
        'Conversión automática de sellos en premios.'
      ),

    p_actor_role :=
      nullif(trim(coalesce(p_actor_role, '')), ''),

    p_actor_identifier :=
      nullif(
        trim(coalesce(p_actor_identifier, '')),
        ''
      ),

    p_reversal_of_movement_id :=
      null,

    p_occurred_at :=
      now(),

    p_idempotency_key :=
      'reward-conversion:'
      || p_customer_id
      || ':account-movement:'
      || coalesce(
           v_account.last_movement_id::text,
           'opening'
         )
      || ':balance:'
      || v_account.current_stamp_balance,

    p_metadata :=
      jsonb_build_object(
        'rewardCode',
          v_reward_code,

        'rewardName',
          v_reward_name,

        'rewardCount',
          v_rewards_to_issue,

        'stampsRequiredPerReward',
          v_threshold,

        'stampsConsumed',
          v_rewards_to_issue * v_threshold,

        'balanceBefore',
          v_account.current_stamp_balance,

        'balanceAfterExpected',
          v_account.current_stamp_balance
          - (v_rewards_to_issue * v_threshold),

        'policyCode',
          'LOYALTY_POLICY_V1',

        'policyVersion',
          1
      )
  )
  into v_conversion_movement;

  v_conversion_movement_id :=
    (v_conversion_movement->>'movement_id')::bigint;

  if
    v_conversion_movement_id is null
    or v_conversion_movement_id <= 0
  then
    raise exception
      'La conversión no entregó un movimiento válido.';
  end if;

  -- ==========================================================
  -- 5. CREAR LOS PREMIOS INDIVIDUALES
  -- ==========================================================

  for v_reward_index in
    1..v_rewards_to_issue
  loop
    v_legacy_reward_id :=
      gen_random_uuid()::text;

    insert into customer_rewards (
      customer_id,
      reward_type,
      name,
      description,
      status,
      issued_at,
      expires_at,
      redeemed_at,
      campaign_id,
      legacy_reward_id,
      source,
      source_reference,
      reward_product_id,
      metadata
    )
    values (
      p_customer_id,
      v_reward_type,
      v_reward_name,
      v_reward_description,
      'active',
      now(),
      now()
        + make_interval(days => v_validity_days),
      null,
      null,
      v_legacy_reward_id,
      'loyalty_engine',
      'reward-conversion-movement:'
        || v_conversion_movement_id
        || ':reward:'
        || v_reward_index,
      v_reward_product_id,
      jsonb_build_object(
        'rewardCode',
          v_reward_code,

        'conversionMovementId',
          v_conversion_movement_id,

        'rewardSequence',
          v_reward_index,

        'rewardCount',
          v_rewards_to_issue,

        'stampsConsumedPerReward',
          v_threshold,

        'policyCode',
          'LOYALTY_POLICY_V1',

        'policyVersion',
          1
      )
    )
    on conflict (
      customer_id,
      legacy_reward_id
    )
    where legacy_reward_id is not null
    do nothing
    returning id into v_reward_id;

    if v_reward_id is null then
      select id
      into v_reward_id
      from customer_rewards
      where customer_id = p_customer_id
        and source_reference =
          'reward-conversion-movement:'
          || v_conversion_movement_id
          || ':reward:'
          || v_reward_index
      limit 1;
    end if;

    if v_reward_id is null or v_reward_id <= 0 then
      raise exception
        'No se pudo identificar el premio emitido.';
    end if;

    v_issued_reward_ids :=
      array_append(
        v_issued_reward_ids,
        v_reward_id
      );

    select record_customer_event(
      p_customer_id :=
        p_customer_id,

      p_event_type :=
        'loyalty.reward_issued',

      p_source_module :=
        'loyalty',

      p_source_entity_type :=
        'customer_reward',

      p_source_entity_id :=
        v_reward_id::text,

      p_sale_id :=
        null,

      p_reward_id :=
        v_reward_id,

      p_loyalty_movement_id :=
        v_conversion_movement_id,

      p_actor_role :=
        nullif(trim(coalesce(p_actor_role, '')), ''),

      p_actor_identifier :=
        nullif(
          trim(coalesce(p_actor_identifier, '')),
          ''
        ),

      p_occurred_at :=
        now(),

      p_idempotency_key :=
        'loyalty-reward-issued:'
        || v_reward_id,

      p_metadata :=
        jsonb_build_object(
          'rewardCode',
            v_reward_code,

          'rewardName',
            v_reward_name,

          'rewardSequence',
            v_reward_index,

          'rewardCount',
            v_rewards_to_issue,

          'conversionMovementId',
            v_conversion_movement_id,

          'stampsConsumedPerReward',
            v_threshold
        )
    )
    into v_reward_event;
  end loop;

  -- ==========================================================
  -- 6. RECONSTRUIR CUENTA Y SINCRONIZAR MODELO VIGENTE
  -- ==========================================================

  select rebuild_loyalty_account(
    p_customer_id
  )
  into v_final_account;

  perform sync_legacy_customer_stamp_balance(
    p_customer_id
  );

  perform sync_legacy_customer_rewards(
    p_customer_id
  );

  -- ==========================================================
  -- 7. RESPUESTA
  -- ==========================================================

  return jsonb_build_object(
    'customer_id',
      p_customer_id,

    'balance_before',
      v_account.current_stamp_balance,

    'rewards_issued',
      v_rewards_to_issue,

    'reward_ids',
      v_issued_reward_ids,

    'stamps_consumed',
      v_rewards_to_issue * v_threshold,

    'conversion_movement_id',
      v_conversion_movement_id,

    'balance_after',
      v_final_account->'current_stamp_balance',

    'converted',
      true
  );
end;
$function$;


-- ============================================================
-- REGULARIZACIÓN
-- ============================================================
-- Corrige premios FREE_SIMPLE_ICE_CREAM ya emitidos durante
-- la ventana en que reward_product_id todavía no se escribía.
--
-- Es idempotente: solo modifica rewards sin producto asociado.
-- ============================================================

do $$
declare
  v_hel_simple_product_id bigint;
begin
  select p.id
  into v_hel_simple_product_id
  from public.products p
  where p.sku = 'HEL-SIMPLE'
    and p.is_active = true
  order by p.id
  limit 1;

  if v_hel_simple_product_id is null then
    raise exception
      'No existe un producto activo HEL-SIMPLE para regularizar premios FREE_SIMPLE_ICE_CREAM.';
  end if;

  update public.customer_rewards cr
  set reward_product_id = v_hel_simple_product_id
  where cr.reward_product_id is null
    and (
      cr.metadata->>'rewardCode' = 'FREE_SIMPLE_ICE_CREAM'
      or (
        cr.reward_type = 'loyalty'
        and lower(trim(cr.name)) = 'helado simple gratis'
      )
    );
end;
$$;