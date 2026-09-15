-- ============================================================
-- DEV-LOY-RED-01
-- Revertir canjes de premios cuando se cancela su venta.
--
-- Extiende cancel_order_and_sale para mantener atómicamente:
--   pedido
--   venta/pago
--   inventario
--   customer_rewards
--   customer_events
--   loyalty account / legacy projections
--   clientes.fecha_ultimo_canje
-- ============================================================

create or replace function public.cancel_order_and_sale(
  p_order_id bigint,
  p_actor_role text default null::text,
  p_notes text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
  v_sale public.sales%rowtype;

  v_inventory_result jsonb;
  v_event_notes text;

  v_reward public.customer_rewards%rowtype;
  v_reward_new_status text;
  v_rewards_reversed integer := 0;
begin
  -- ==========================================================
  -- 1. VALIDAR IDENTIFICADOR
  -- ==========================================================

  if p_order_id is null or p_order_id <= 0 then
    raise exception
      'El identificador del pedido no es válido.';
  end if;


  -- ==========================================================
  -- 2. BLOQUEAR Y VALIDAR PEDIDO
  -- ==========================================================

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception
      'El pedido % no existe.',
      p_order_id;
  end if;

  if v_order.sale_id is null then
    raise exception
      'El pedido % no tiene una venta asociada.',
      p_order_id;
  end if;


  -- ==========================================================
  -- 3. BLOQUEAR Y VALIDAR VENTA
  -- ==========================================================

  select *
  into v_sale
  from public.sales
  where id = v_order.sale_id
  for update;

  if not found then
    raise exception
      'La venta asociada al pedido % no existe.',
      p_order_id;
  end if;


  -- ==========================================================
  -- 4. DETECTAR CANCELACIÓN YA COMPLETADA
  -- ==========================================================
  --
  -- No retornamos todavía.
  --
  -- Aunque pedido, venta y pago ya estén cancelados, pueden
  -- existir efectos asociados que todavía requieran
  -- reconciliación (inventario o rewards).
  -- ==========================================================

  if lower(coalesce(v_order.status, '')) = 'cancelled'
     and lower(coalesce(v_sale.status, '')) = 'cancelled'
     and lower(coalesce(v_sale.payment_status, '')) = 'cancelled'
  then
    v_inventory_result :=
      public.reverse_sale_inventory(v_sale.id);

    -- Reconciliar cualquier reward que todavía permanezca
    -- canjeado contra esta venta.
    for v_reward in
      select cr.*
      from public.customer_rewards cr
      where cr.redeemed_sale_id = v_sale.id
        and cr.status = 'redeemed'
      order by cr.id
      for update
    loop
      v_reward_new_status :=
        case
          when v_reward.expires_at is not null
               and v_reward.expires_at < now()
            then 'expired'
          else 'active'
        end;

      update public.customer_rewards
      set
        status = v_reward_new_status,
        redeemed_at = null,
        redeemed_sale_id = null
      where id = v_reward.id;

      perform public.record_customer_event(
        p_customer_id := v_reward.customer_id,
        p_event_type := 'loyalty.reward_redemption_reversed',
        p_source_module := 'loyalty',
        p_source_entity_type := 'customer_reward',
        p_source_entity_id := v_reward.id::text,
        p_sale_id := v_sale.id,
        p_reward_id := v_reward.id,
        p_loyalty_movement_id := null,
        p_actor_role := nullif(btrim(coalesce(p_actor_role, '')), ''),
        p_actor_identifier := null,
        p_occurred_at := now(),
        p_idempotency_key :=
          'loyalty-reward-redemption-reversed:'
          || v_reward.id
          || ':sale:'
          || v_sale.id,
        p_metadata :=
          jsonb_build_object(
            'reason', 'sale_cancelled',
            'previousStatus', v_reward.status,
            'newStatus', v_reward_new_status,
            'originalRedeemedAt', v_reward.redeemed_at,
            'saleId', v_sale.id,
            'orderId', v_order.id
          )
      );

      perform public.rebuild_loyalty_account(
        v_reward.customer_id
      );

      perform public.sync_legacy_customer_rewards(
        v_reward.customer_id
      );

      update public.clientes c
      set fecha_ultimo_canje = (
        select max(cr.redeemed_at)
        from public.customer_rewards cr
        where cr.customer_id = v_reward.customer_id
          and cr.status = 'redeemed'
          and cr.redeemed_at is not null
      )
      where c.id = v_reward.customer_id;

      v_rewards_reversed :=
        v_rewards_reversed + 1;
    end loop;

    return jsonb_build_object(
      'order_id', v_order.id,
      'sale_id', v_sale.id,
      'previous_order_status', v_order.status,
      'previous_sale_status', v_sale.status,
      'previous_payment_status', v_sale.payment_status,
      'new_order_status', 'cancelled',
      'new_sale_status', 'cancelled',
      'new_payment_status', 'cancelled',
      'inventory', v_inventory_result,
      'rewards_reversed', v_rewards_reversed,
      'cancelled', false,
      'already_cancelled', true
    );
  end if;
  
  -- ==========================================================
  -- 5. IMPEDIR CANCELACIÓN DE PEDIDOS ENTREGADOS
  -- ==========================================================

  if lower(coalesce(v_order.status, '')) = 'delivered' then
    raise exception
      'No se puede cancelar un pedido entregado mediante esta operación.';
  end if;


  -- ==========================================================
  -- 6. CANCELAR PEDIDO
  -- ==========================================================

  update public.orders
  set
    status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now())
  where id = v_order.id;


  -- ==========================================================
  -- 7. CANCELAR VENTA Y PAGO
  -- ==========================================================

  update public.sales
  set
    status = 'cancelled',
    payment_status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now())
  where id = v_sale.id;


  -- ==========================================================
  -- 8. REVERTIR INVENTARIO
  -- ==========================================================

  v_inventory_result :=
    public.reverse_sale_inventory(v_sale.id);


  -- ==========================================================
  -- 9. REVERTIR PREMIOS CANJEADOS EN ESTA VENTA
  -- ==========================================================
  --
  -- Un premio vigente vuelve a active.
  -- Un premio cuya vigencia original ya terminó queda expired.
  --
  -- No se borra loyalty.reward_redeemed:
  -- se registra un nuevo evento que representa la reversa.
  -- ==========================================================

  for v_reward in
    select cr.*
    from public.customer_rewards cr
    where cr.redeemed_sale_id = v_sale.id
      and cr.status = 'redeemed'
    order by cr.id
    for update
  loop
    v_reward_new_status :=
      case
        when v_reward.expires_at is not null
             and v_reward.expires_at < now()
          then 'expired'
        else 'active'
      end;

    update public.customer_rewards
    set
      status = v_reward_new_status,
      redeemed_at = null,
      redeemed_sale_id = null
    where id = v_reward.id;

    perform public.record_customer_event(
      p_customer_id :=
        v_reward.customer_id,

      p_event_type :=
        'loyalty.reward_redemption_reversed',

      p_source_module :=
        'loyalty',

      p_source_entity_type :=
        'customer_reward',

      p_source_entity_id :=
        v_reward.id::text,

      p_sale_id :=
        v_sale.id,

      p_reward_id :=
        v_reward.id,

      p_loyalty_movement_id :=
        null,

      p_actor_role :=
        nullif(btrim(coalesce(p_actor_role, '')), ''),

      p_actor_identifier :=
        null,

      p_occurred_at :=
        now(),

      p_idempotency_key :=
        'loyalty-reward-redemption-reversed:'
        || v_reward.id
        || ':sale:'
        || v_sale.id,

      p_metadata :=
        jsonb_build_object(
          'reason',
            'sale_cancelled',

          'previousStatus',
            v_reward.status,

          'newStatus',
            v_reward_new_status,

          'originalRedeemedAt',
            v_reward.redeemed_at,

          'saleId',
            v_sale.id,

          'orderId',
            v_order.id
        )
    );

    perform public.rebuild_loyalty_account(
      v_reward.customer_id
    );

    perform public.sync_legacy_customer_rewards(
      v_reward.customer_id
    );

    update public.clientes c
    set fecha_ultimo_canje = (
      select max(cr.redeemed_at)
      from public.customer_rewards cr
      where cr.customer_id = v_reward.customer_id
        and cr.status = 'redeemed'
        and cr.redeemed_at is not null
    )
    where c.id = v_reward.customer_id;

    v_rewards_reversed :=
      v_rewards_reversed + 1;
  end loop;


  -- ==========================================================
  -- 10. REGISTRAR EVENTO OPERACIONAL
  -- ==========================================================

  v_event_notes :=
    coalesce(
      nullif(btrim(coalesce(p_notes, '')), ''),
      'Pedido y venta cancelados en conjunto.'
    );

  insert into public.order_events (
    order_id,
    event_type,
    previous_status,
    new_status,
    actor_role,
    notes
  )
  values (
    v_order.id,
    'order_and_sale_cancelled',
    v_order.status,
    'cancelled',
    nullif(btrim(coalesce(p_actor_role, '')), ''),
    v_event_notes
  );


  -- ==========================================================
  -- 11. RESPUESTA
  -- ==========================================================

  return jsonb_build_object(
    'order_id',
    v_order.id,

    'sale_id',
    v_sale.id,

    'previous_order_status',
    v_order.status,

    'previous_sale_status',
    v_sale.status,

    'previous_payment_status',
    v_sale.payment_status,

    'new_order_status',
    'cancelled',

    'new_sale_status',
    'cancelled',

    'new_payment_status',
    'cancelled',

    'inventory',
    v_inventory_result,

    'rewards_reversed',
    v_rewards_reversed,

    'cancelled',
    true,

    'already_cancelled',
    false
  );
end;
$function$;