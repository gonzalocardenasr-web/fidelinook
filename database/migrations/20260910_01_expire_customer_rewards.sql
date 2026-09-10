create or replace function public.expire_customer_rewards(
  p_customer_id bigint default null,
  p_actor_role text default 'system',
  p_actor_identifier text default 'expire_customer_rewards'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_customer_id bigint;
  v_expired_count integer := 0;
  v_affected_customer_ids bigint[] := array[]::bigint[];
begin
  if p_customer_id is not null and p_customer_id <= 0 then
    raise exception 'El cliente no es válido.';
  end if;

  for v_reward in
    select
      cr.id,
      cr.customer_id,
      cr.expires_at
    from public.customer_rewards cr
    where cr.status = 'active'
      and cr.expires_at is not null
      and cr.expires_at < now()
      and (
        p_customer_id is null
        or cr.customer_id = p_customer_id
      )
    order by cr.id
    for update
  loop
    update public.customer_rewards
    set status = 'expired'
    where id = v_reward.id
      and status = 'active';

    if found then
  if not exists (
    select 1
    from public.customer_events ce
    where ce.reward_id = v_reward.id
      and ce.event_type = 'loyalty.reward_expired'
  ) then
    perform public.record_customer_event(
      p_customer_id := v_reward.customer_id,
      p_event_type := 'loyalty.reward_expired',
      p_source_module := 'loyalty',
      p_source_entity_type := 'customer_reward',
      p_source_entity_id := v_reward.id::text,
      p_sale_id := null,
      p_reward_id := v_reward.id,
      p_loyalty_movement_id := null,
      p_actor_role := p_actor_role,
      p_actor_identifier := p_actor_identifier,
      p_occurred_at := v_reward.expires_at,
      p_idempotency_key := 'loyalty-reward-expired:' || v_reward.id,
      p_metadata := jsonb_build_object(
        'expiresAt', v_reward.expires_at,
        'processedAt', now(),
        'automaticExpiration', true
      )
    );
  end if;

  v_affected_customer_ids :=
        array_append(v_affected_customer_ids, v_reward.customer_id);

      v_expired_count := v_expired_count + 1;
    end if;
  end loop;

  for v_customer_id in
    select distinct customer_id
    from unnest(v_affected_customer_ids) as affected(customer_id)
  loop
    perform public.rebuild_loyalty_account(v_customer_id);
    perform public.sync_legacy_customer_rewards(v_customer_id);
  end loop;

  return v_expired_count;
end;
$$;

revoke all
on function public.expire_customer_rewards(bigint, text, text)
from public;

revoke all
on function public.expire_customer_rewards(bigint, text, text)
from anon;

revoke all
on function public.expire_customer_rewards(bigint, text, text)
from authenticated;

grant execute
on function public.expire_customer_rewards(bigint, text, text)
to service_role;

-- Regularización inicial:
-- expira todos los rewards que todavía estén activos
-- aunque su fecha de vencimiento ya haya pasado.
select public.expire_customer_rewards(
  null,
  'system',
  'DEV-LOY-EXP-01:migration'
);