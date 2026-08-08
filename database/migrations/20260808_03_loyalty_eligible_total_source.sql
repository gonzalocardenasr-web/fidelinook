-- =====================================================================
-- NOOK
-- P0.03 — LOYALTY ELIGIBLE TOTAL AS CANONICAL MONETARY SOURCE
-- 2026-08-08
--
-- OBJETIVO
-- ---------------------------------------------------------------------
-- Para reglas monetarias de fidelización:
--
--   sales.total
--     = monto comercial/bruto de la venta
--
--   sales.loyalty_eligible_total
--     = monto canónico elegible para fidelización
--
-- CAMBIOS
-- ---------------------------------------------------------------------
-- 1. customer_daily_loyalty_sales.eligible_amount
--      usa sales.loyalty_eligible_total.
--
-- 2. Determinación de día elegible anterior
--      usa sales.loyalty_eligible_total.
--
-- 3. gross_sales_amount continúa usando sales.total.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.rebuild_customer_daily_loyalty(
  p_customer_id bigint,
  p_business_date date,
  p_policy_code text DEFAULT 'LOYALTY_POLICY_V1'::text,
  p_policy_version integer DEFAULT 1,
  p_recalculation_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_timezone text := 'America/Santiago';

  v_day_start timestamptz;
  v_day_end timestamptz;

  v_customer_exists boolean;
  v_customer_validated boolean;

  v_minimum_daily_amount integer := 3000;
  v_amount_per_stamp integer := 20000;
  v_reward_threshold integer := 7;

  v_eligible_channels jsonb :=
    '["local", "shopify"]'::jsonb;

  v_daily_loyalty_id bigint;

  v_eligible_sales_count integer := 0;
  v_ineligible_sales_count integer := 0;

  v_gross_sales_amount integer := 0;
  v_discount_amount integer := 0;
  v_refunded_amount integer := 0;
  v_eligible_net_amount integer := 0;

  v_base_stamps integer := 0;
  v_amount_stamps integer := 0;
  v_first_purchase_bonus integer := 0;

  v_multiplier numeric := 1;
  v_fixed_promotion_bonus integer := 0;
  v_multiplier_bonus integer := 0;
  v_promotion_bonus integer := 0;

  v_expected_stamps integer := 0;
  v_applied_stamps integer := 0;
  v_pending_stamp_delta integer := 0;

  v_current_account_balance integer := 0;
  v_rewards_expected integer := 0;
  v_rewards_issued integer := 0;

  v_has_previous_eligible_day boolean := false;

  v_last_sale_id bigint;
  v_last_loyalty_movement_id bigint;

  v_source_event_ids bigint[] := '{}';
  v_source_reference text;

  v_projection_status text;
begin

  -- ==========================================================
  -- 1. VALIDACIONES
  -- ==========================================================

  if p_customer_id is null
    or p_customer_id <= 0
  then
    raise exception
      'El cliente indicado no es válido.';
  end if;

  if p_business_date is null then
    raise exception
      'La fecha comercial es obligatoria.';
  end if;

  if nullif(
       trim(coalesce(p_policy_code, '')),
       ''
     ) is null
  then
    raise exception
      'El código de política es obligatorio.';
  end if;

  if coalesce(p_policy_version, 0) <= 0 then
    raise exception
      'La versión de política no es válida.';
  end if;

  select
    true,
    coalesce(email_verificado, false)
      and coalesce(tarjeta_activa, false)

  into
    v_customer_exists,
    v_customer_validated

  from clientes

  where id = p_customer_id;

  if not found then
    raise exception
      'El cliente indicado no existe.';
  end if;


  -- ==========================================================
  -- 2. CARGAR PARÁMETROS DE LA POLÍTICA
  -- ==========================================================

  select
    coalesce(
      nullif(
        conditions->>'timezone',
        ''
      ),
      v_timezone
    ),

    coalesce(
      (conditions->>'minimumDailyAmount')::integer,
      v_minimum_daily_amount
    ),

    coalesce(
      conditions->'eligibleChannels',
      v_eligible_channels
    )

  into
    v_timezone,
    v_minimum_daily_amount,
    v_eligible_channels

  from loyalty_rules

  where code =
        'LOYALTY_DAILY_ELIGIBILITY'

    and version =
        p_policy_version

    and configuration_version =
        p_policy_code

  limit 1;


  select
    coalesce(
      (conditions->>'amountPerAdditionalStamp')::integer,
      v_amount_per_stamp
    )

  into
    v_amount_per_stamp

  from loyalty_rules

  where code =
        'LOYALTY_DAILY_AMOUNT_STAMPS'

    and version =
        p_policy_version

    and configuration_version =
        p_policy_code

  limit 1;


  select
    coalesce(
      (conditions->>'stampsRequired')::integer,
      v_reward_threshold
    )

  into
    v_reward_threshold

  from loyalty_rules

  where code =
        'LOYALTY_REWARD_THRESHOLD'

    and version =
        p_policy_version

    and configuration_version =
        p_policy_code

  limit 1;


  v_timezone :=
    coalesce(
      v_timezone,
      'America/Santiago'
    );

  v_minimum_daily_amount :=
    coalesce(
      v_minimum_daily_amount,
      3000
    );

  v_amount_per_stamp :=
    coalesce(
      v_amount_per_stamp,
      20000
    );

  v_reward_threshold :=
    coalesce(
      v_reward_threshold,
      7
    );

  v_eligible_channels :=
    coalesce(
      v_eligible_channels,
      '["local", "shopify"]'::jsonb
    );


  if v_minimum_daily_amount <= 0 then
    raise exception
      'El monto mínimo diario configurado no es válido.';
  end if;

  if v_amount_per_stamp <= 0 then
    raise exception
      'El tramo adicional configurado no es válido.';
  end if;

  if v_reward_threshold <= 0 then
    raise exception
      'La meta de premios configurada no es válida.';
  end if;


  -- La fecha comercial se interpreta en la zona horaria
  -- de la política.

  v_day_start :=
    p_business_date::timestamp
      at time zone v_timezone;

  v_day_end :=
    (p_business_date + 1)::timestamp
      at time zone v_timezone;


  v_source_reference :=
    'daily-loyalty:'
      || p_customer_id
      || ':'
      || p_business_date
      || ':'
      || trim(p_policy_code)
      || ':'
      || p_policy_version;


  -- ==========================================================
  -- 3. CREAR O REUTILIZAR CABECERA DE PROYECCIÓN
  -- ==========================================================

  insert into customer_daily_loyalty (
    customer_id,
    business_date,
    timezone,
    policy_code,
    policy_version,
    projection_status,
    recalculation_reason
  )
  values (
    p_customer_id,
    p_business_date,
    v_timezone,
    trim(p_policy_code),
    p_policy_version,
    'pending',
    nullif(
      trim(
        coalesce(
          p_recalculation_reason,
          ''
        )
      ),
      ''
    )
  )

  on conflict (
    customer_id,
    business_date,
    policy_code,
    policy_version
  )

  do update

  set
    timezone =
      excluded.timezone,

    projection_status =
      'pending',

    recalculation_reason =
      excluded.recalculation_reason,

    calculated_at =
      null,

    reconciled_at =
      null

  returning id
  into v_daily_loyalty_id;


  delete from customer_daily_loyalty_sales

  where daily_loyalty_id =
        v_daily_loyalty_id;


  -- ==========================================================
  -- 4. INSERTAR VENTAS ENTREGADAS DEL CLIENTE Y DÍA
  --
  -- CAMBIO P0.03:
  --
  -- sale_total:
  --   sigue usando sales.total.
  --
  -- eligible_amount:
  --   usa sales.loyalty_eligible_total.
  -- ==========================================================

  insert into customer_daily_loyalty_sales (
    daily_loyalty_id,
    sale_id,
    customer_id,
    business_date,
    channel,
    sale_total,
    discount_total,
    refunded_amount,
    eligible_amount,
    is_channel_eligible,
    is_customer_eligible,
    is_sale_eligible,
    exclusion_reason,
    delivered_at,
    metadata
  )

  select
    v_daily_loyalty_id,
    s.id,
    p_customer_id,
    p_business_date,

    lower(
      coalesce(
        nullif(
          trim(s.channel),
          ''
        ),
        'local'
      )
    ),

    -- Monto bruto/comercial.
    greatest(
      round(
        coalesce(
          s.total,
          0
        )
      )::integer,
      0
    ),

    greatest(
      round(
        coalesce(
          s.discount_total,
          0
        )
      )::integer,
      0
    ),

    0,

    -- ========================================================
    -- P0.03
    -- ÚNICO monto monetario elegible para loyalty.
    -- ========================================================

    case
      when
        v_customer_validated

        and v_eligible_channels
          ? lower(
              coalesce(
                nullif(
                  trim(s.channel),
                  ''
                ),
                'local'
              )
            )

      then greatest(
        round(
          coalesce(
            s.loyalty_eligible_total,
            0
          )
        )::integer,
        0
      )

      else 0
    end,

    v_eligible_channels
      ? lower(
          coalesce(
            nullif(
              trim(s.channel),
              ''
            ),
            'local'
          )
        ),

    v_customer_validated,

    v_customer_validated
      and v_eligible_channels
        ? lower(
            coalesce(
              nullif(
                trim(s.channel),
                ''
              ),
              'local'
            )
          ),

    case
      when not v_customer_validated
        then 'customer_not_validated'

      when not (
        v_eligible_channels
          ? lower(
              coalesce(
                nullif(
                  trim(s.channel),
                  ''
                ),
                'local'
              )
            )
      )
        then 'ineligible_channel'

      else null
    end,

    o.delivered_at,

    jsonb_build_object(
      'orderId',
      o.id,

      'orderStatus',
      o.status,

      'saleStatus',
      s.status,

      'paymentStatus',
      s.payment_status,

      'paymentMethod',
      s.payment_method,

      'externalOrderId',
      s.external_order_id,

      'saleTotal',
      coalesce(
        s.total,
        0
      ),

      'loyaltyEligibleTotal',
      coalesce(
        s.loyalty_eligible_total,
        0
      )
    )

  from sales s

  join lateral (
    select
      ord.id,
      ord.status,
      ord.delivered_at

    from orders ord

    where ord.sale_id = s.id
      and ord.status = 'delivered'
      and ord.delivered_at is not null

    order by
      ord.delivered_at desc,
      ord.id desc

    limit 1
  ) o on true

  where s.customer_id =
        p_customer_id

    and o.delivered_at >=
        v_day_start

    and o.delivered_at <
        v_day_end;


  -- ==========================================================
  -- 5. AGREGAR RESULTADOS DE LAS VENTAS DEL DÍA
  -- ==========================================================

  select
    count(*) filter (
      where is_sale_eligible
    )::integer,

    count(*) filter (
      where not is_sale_eligible
    )::integer,

    coalesce(
      sum(sale_total),
      0
    )::integer,

    coalesce(
      sum(discount_total),
      0
    )::integer,

    coalesce(
      sum(refunded_amount),
      0
    )::integer,

    coalesce(
      sum(eligible_amount),
      0
    )::integer,

    max(sale_id)

  into
    v_eligible_sales_count,
    v_ineligible_sales_count,
    v_gross_sales_amount,
    v_discount_amount,
    v_refunded_amount,
    v_eligible_net_amount,
    v_last_sale_id

  from customer_daily_loyalty_sales

  where daily_loyalty_id =
        v_daily_loyalty_id;


  -- ==========================================================
  -- 6. CALCULAR SELLO BASE Y SELLOS POR MONTO
  -- ==========================================================

  if
    v_customer_validated
    and v_eligible_net_amount >=
        v_minimum_daily_amount

  then

    v_base_stamps := 1;

    v_amount_stamps :=
      floor(
        v_eligible_net_amount::numeric
        / v_amount_per_stamp
      )::integer;

  else

    v_base_stamps := 0;
    v_amount_stamps := 0;

  end if;


  -- ==========================================================
  -- 7. DETERMINAR SI EXISTE UN DÍA ELEGIBLE ANTERIOR
  --
  -- CAMBIO P0.03:
  --
  -- El monto histórico elegible usa
  -- sales.loyalty_eligible_total.
  -- ==========================================================

  if v_base_stamps > 0 then

    select exists (

      select 1

      from (

        select
          (
            ord.delivered_at
              at time zone v_timezone
          )::date
            as prior_business_date,

          sum(
            greatest(
              round(
                coalesce(
                  s.loyalty_eligible_total,
                  0
                )
              )::integer,
              0
            )
          )::integer
            as prior_daily_amount

        from sales s

        join lateral (
          select
            o.id,
            o.delivered_at

          from orders o

          where o.sale_id = s.id
            and o.status = 'delivered'
            and o.delivered_at is not null

          order by
            o.delivered_at desc,
            o.id desc

          limit 1
        ) ord on true

        where s.customer_id =
              p_customer_id

          and (
            ord.delivered_at
              at time zone v_timezone
          )::date <
              p_business_date

          and v_eligible_channels
            ? lower(
                coalesce(
                  nullif(
                    trim(s.channel),
                    ''
                  ),
                  'local'
                )
              )

        group by
          (
            ord.delivered_at
              at time zone v_timezone
          )::date

        having
          sum(
            greatest(
              round(
                coalesce(
                  s.loyalty_eligible_total,
                  0
                )
              )::integer,
              0
            )
          ) >=
          v_minimum_daily_amount

      ) prior_days

    )
    into v_has_previous_eligible_day;


    if not v_has_previous_eligible_day then
      v_first_purchase_bonus := 1;
    end if;

  end if;


  -- ==========================================================
  -- 8. PROMOCIONES DEL DÍA
  -- ==========================================================

  select
    greatest(
      coalesce(
        max(multiplier)
          filter (
            where effect_type =
                  'stamp_multiplier'
          ),
        1
      ),
      1
    ),

    coalesce(
      sum(
        fixed_stamp_bonus
      )
      filter (
        where effect_type =
              'fixed_stamp_bonus'
      ),
      0
    )::integer

  into
    v_multiplier,
    v_fixed_promotion_bonus

  from customer_daily_loyalty_promotions

  where daily_loyalty_id =
        v_daily_loyalty_id;


  v_multiplier_bonus :=
    greatest(
      floor(
        (
          v_base_stamps
          + v_amount_stamps
        )
        * (
            v_multiplier
            - 1
          )
      )::integer,
      0
    );


  v_promotion_bonus :=
    v_multiplier_bonus
    + v_fixed_promotion_bonus;


  -- ==========================================================
  -- 9. SELLOS ESPERADOS Y YA APLICADOS
  -- ==========================================================

  v_expected_stamps :=
    v_base_stamps
    + v_amount_stamps
    + v_first_purchase_bonus
    + v_promotion_bonus;


  select
    coalesce(
      sum(stamp_delta),
      0
    )::integer,

    max(id)

  into
    v_applied_stamps,
    v_last_loyalty_movement_id

  from loyalty_movements

  where customer_id =
        p_customer_id

    and source =
        'daily_loyalty'

    and source_reference =
        v_source_reference;


  v_pending_stamp_delta :=
    v_expected_stamps
    - v_applied_stamps;


  -- ==========================================================
  -- 10. EVENTOS FUENTE
  -- ==========================================================

  select
    coalesce(
      array_agg(
        distinct ce.id
      )
      filter (
        where ce.id is not null
      ),
      '{}'::bigint[]
    )

  into
    v_source_event_ids

  from customer_daily_loyalty_sales cdls

  left join customer_events ce
    on ce.sale_id =
       cdls.sale_id

   and ce.event_type =
       'sale.delivered'

  where cdls.daily_loyalty_id =
        v_daily_loyalty_id;


  -- ==========================================================
  -- 11. PREMIOS ESPERADOS
  -- ==========================================================

  select
    coalesce(
      current_stamp_balance,
      0
    )

  into
    v_current_account_balance

  from loyalty_accounts

  where customer_id =
        p_customer_id;


  v_current_account_balance :=
    coalesce(
      v_current_account_balance,
      0
    );


  v_rewards_expected :=
    greatest(
      floor(
        greatest(
          v_current_account_balance
          + v_pending_stamp_delta,
          0
        )::numeric
        / v_reward_threshold
      )::integer,
      0
    );


  select
    count(*)::integer

  into
    v_rewards_issued

  from customer_rewards

  where customer_id =
        p_customer_id

    and source_reference =
        v_source_reference;


  -- ==========================================================
  -- 12. ESTADO DE LA PROYECCIÓN
  -- ==========================================================

  v_projection_status :=
    case

      when v_pending_stamp_delta = 0
        then 'reconciled'

      else 'calculated'

    end;


  -- ==========================================================
  -- 13. ACTUALIZAR CABECERA
  -- ==========================================================

  update customer_daily_loyalty

  set
    timezone =
      v_timezone,

    projection_status =
      v_projection_status,

    eligible_sales_count =
      v_eligible_sales_count,

    ineligible_sales_count =
      v_ineligible_sales_count,

    gross_sales_amount =
      v_gross_sales_amount,

    discount_amount =
      v_discount_amount,

    refunded_amount =
      v_refunded_amount,

    eligible_net_amount =
      v_eligible_net_amount,

    base_stamps =
      v_base_stamps,

    amount_stamps =
      v_amount_stamps,

    first_purchase_bonus =
      v_first_purchase_bonus,

    promotion_bonus =
      v_promotion_bonus,

    expected_stamps =
      v_expected_stamps,

    applied_stamps =
      v_applied_stamps,

    pending_stamp_delta =
      v_pending_stamp_delta,

    rewards_expected =
      v_rewards_expected,

    rewards_issued =
      v_rewards_issued,

    last_sale_id =
      v_last_sale_id,

    last_loyalty_movement_id =
      v_last_loyalty_movement_id,

    source_event_ids =
      v_source_event_ids,

    metadata =
      jsonb_build_object(
        'customerValidated',
        v_customer_validated,

        'minimumDailyAmount',
        v_minimum_daily_amount,

        'amountPerAdditionalStamp',
        v_amount_per_stamp,

        'rewardThreshold',
        v_reward_threshold,

        'eligibleChannels',
        v_eligible_channels,

        'hasPreviousEligibleDay',
        v_has_previous_eligible_day,

        'promotionMultiplier',
        v_multiplier,

        'fixedPromotionBonus',
        v_fixed_promotion_bonus,

        'multiplierPromotionBonus',
        v_multiplier_bonus,

        'movementSourceReference',
        v_source_reference
      ),

    calculated_at =
      now(),

    applied_at =
      case

        when v_applied_stamps <> 0
          then coalesce(
            applied_at,
            now()
          )

        else null

      end,

    reconciled_at =
      case

        when v_projection_status =
             'reconciled'
          then now()

        else null

      end

  where id =
        v_daily_loyalty_id;


  -- ==========================================================
  -- 14. RESPUESTA
  -- ==========================================================

  return jsonb_build_object(
    'daily_loyalty_id',
    v_daily_loyalty_id,

    'customer_id',
    p_customer_id,

    'business_date',
    p_business_date,

    'timezone',
    v_timezone,

    'policy_code',
    trim(p_policy_code),

    'policy_version',
    p_policy_version,

    'customer_validated',
    v_customer_validated,

    'eligible_sales_count',
    v_eligible_sales_count,

    'ineligible_sales_count',
    v_ineligible_sales_count,

    'eligible_net_amount',
    v_eligible_net_amount,

    'base_stamps',
    v_base_stamps,

    'amount_stamps',
    v_amount_stamps,

    'first_purchase_bonus',
    v_first_purchase_bonus,

    'promotion_bonus',
    v_promotion_bonus,

    'expected_stamps',
    v_expected_stamps,

    'applied_stamps',
    v_applied_stamps,

    'pending_stamp_delta',
    v_pending_stamp_delta,

    'rewards_expected',
    v_rewards_expected,

    'rewards_issued',
    v_rewards_issued,

    'projection_status',
    v_projection_status,

    'movement_source_reference',
    v_source_reference
  );

end;
$function$;

-- =====================================================================
-- FIN P0.03
-- =====================================================================