-- INC-EMAIL-01
-- Corregir el corte diario del presupuesto de emails para que use
-- America/Santiago en lugar de UTC.
--
-- Reglas preservadas:
-- - provider_daily_limit: límite total diario del proveedor.
-- - crm_daily_limit: límite diario compartido por prioridades P2/P3.
-- - P0/P1 tienen prioridad sobre P2/P3.
-- - El excedente permanece PENDING para días posteriores.
-- - Los claims de presupuesto continúan serializados mediante advisory lock.


create or replace function public.claim_pending_emails_with_budget(
  p_worker_id text,
  p_limit integer default 10
)
returns setof public.email_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_daily_limit integer;
  v_crm_daily_limit integer;

  v_budget_date date;

  v_provider_used integer;
  v_crm_used integer;

  v_provider_remaining integer;
  v_crm_remaining integer;

  v_claimed integer := 0;

  v_row public.email_queue%rowtype;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'p_worker_id is required';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;

  /*
   * Serializa la asignación de capacidad para evitar que dos workers
   * consuman simultáneamente el mismo presupuesto.
   */
  perform pg_advisory_xact_lock(
    hashtext('nook_email_dispatch_budget')
  );

  select
    provider_daily_limit,
    crm_daily_limit
  into
    v_provider_daily_limit,
    v_crm_daily_limit
  from public.email_dispatch_settings
  where id = 1;

  if not found then
    raise exception 'email_dispatch_settings row id=1 not found';
  end if;

  /*
   * El presupuesto diario de Nook sigue el día calendario de Chile.
   */
  v_budget_date := (now() at time zone 'America/Santiago')::date;

  select count(*)
  into v_provider_used
  from public.email_dispatch_attempts
  where budget_date = v_budget_date;

  select count(*)
  into v_crm_used
  from public.email_dispatch_attempts
  where budget_date = v_budget_date
    and priority in (2, 3);

  v_provider_remaining :=
    greatest(v_provider_daily_limit - v_provider_used, 0);

  v_crm_remaining :=
    greatest(v_crm_daily_limit - v_crm_used, 0);

  if v_provider_remaining <= 0 then
    return;
  end if;

  /*
   * Primero P0/P1.
   */
  for v_row in
    select eq.*
    from public.email_queue eq
    where
      eq.status = 'PENDING'
      and eq.priority in (0, 1)
      and eq.attempt_count < eq.max_attempts
      and (
        eq.next_attempt_at is null
        or eq.next_attempt_at <= now()
      )
    order by
      eq.priority asc,
      eq.created_at asc,
      eq.id asc
    for update skip locked
    limit least(
      p_limit,
      v_provider_remaining
    )
  loop
    update public.email_queue
    set
      status = 'PROCESSING',
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      locked_at = now(),
      locked_by = p_worker_id,
      last_error = null
    where id = v_row.id
    returning *
    into v_row;

    insert into public.email_dispatch_attempts (
      email_queue_id,
      attempt_number,
      worker_id,
      email_type,
      priority,
      budget_date,
      reserved_at
    )
    values (
      v_row.id,
      v_row.attempt_count,
      p_worker_id,
      v_row.email_type,
      v_row.priority,
      v_budget_date,
      now()
    );

    v_claimed := v_claimed + 1;
    v_provider_remaining := v_provider_remaining - 1;

    return next v_row;

    exit when
      v_claimed >= p_limit
      or v_provider_remaining <= 0;
  end loop;

  /*
   * Luego P2/P3, solo con capacidad residual y dentro del límite CRM.
   */
  if
    v_claimed < p_limit
    and v_provider_remaining > 0
    and v_crm_remaining > 0
  then
    for v_row in
      select eq.*
      from public.email_queue eq
      where
        eq.status = 'PENDING'
        and eq.priority in (2, 3)
        and eq.attempt_count < eq.max_attempts
        and (
          eq.next_attempt_at is null
          or eq.next_attempt_at <= now()
        )
      order by
        eq.priority asc,
        eq.created_at asc,
        eq.id asc
      for update skip locked
      limit least(
        p_limit - v_claimed,
        v_provider_remaining,
        v_crm_remaining
      )
    loop
      update public.email_queue
      set
        status = 'PROCESSING',
        attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        locked_at = now(),
        locked_by = p_worker_id,
        last_error = null
      where id = v_row.id
      returning *
      into v_row;

      insert into public.email_dispatch_attempts (
        email_queue_id,
        attempt_number,
        worker_id,
        email_type,
        priority,
        budget_date,
        reserved_at
      )
      values (
        v_row.id,
        v_row.attempt_count,
        p_worker_id,
        v_row.email_type,
        v_row.priority,
        v_budget_date,
        now()
      );

      v_claimed := v_claimed + 1;
      v_provider_remaining := v_provider_remaining - 1;
      v_crm_remaining := v_crm_remaining - 1;

      return next v_row;

      exit when
        v_claimed >= p_limit
        or v_provider_remaining <= 0
        or v_crm_remaining <= 0;
    end loop;
  end if;

  return;
end;
$$;

revoke all on function public.claim_pending_emails_with_budget(
  text,
  integer
) from public;

grant execute on function public.claim_pending_emails_with_budget(
  text,
  integer
) to service_role;


create or replace function public.claim_pending_email_by_id_with_budget(
  p_email_id bigint,
  p_worker_id text
)
returns public.email_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_daily_limit integer;
  v_crm_daily_limit integer;

  v_budget_date date;

  v_provider_used integer;
  v_crm_used integer;

  v_row public.email_queue%rowtype;
begin
  if p_email_id is null then
    raise exception 'p_email_id is required';
  end if;

  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'p_worker_id is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('nook_email_dispatch_budget')
  );

  select
    provider_daily_limit,
    crm_daily_limit
  into
    v_provider_daily_limit,
    v_crm_daily_limit
  from public.email_dispatch_settings
  where id = 1;

  if not found then
    raise exception 'email_dispatch_settings row id=1 not found';
  end if;

  /*
   * El presupuesto diario de Nook sigue el día calendario de Chile.
   */
  v_budget_date := (now() at time zone 'America/Santiago')::date;

  select count(*)
  into v_provider_used
  from public.email_dispatch_attempts
  where budget_date = v_budget_date;

  if v_provider_used >= v_provider_daily_limit then
    return null;
  end if;

  select *
  into v_row
  from public.email_queue
  where
    id = p_email_id
    and status = 'PENDING'
    and attempt_count < max_attempts
    and (
      next_attempt_at is null
      or next_attempt_at <= now()
    )
  for update skip locked;

  if not found then
    return null;
  end if;

  if v_row.priority in (2, 3) then
    select count(*)
    into v_crm_used
    from public.email_dispatch_attempts
    where budget_date = v_budget_date
      and priority in (2, 3);

    if v_crm_used >= v_crm_daily_limit then
      return null;
    end if;
  end if;

  update public.email_queue
  set
    status = 'PROCESSING',
    attempt_count = attempt_count + 1,
    last_attempt_at = now(),
    locked_at = now(),
    locked_by = p_worker_id,
    last_error = null
  where id = p_email_id
  returning *
  into v_row;

  insert into public.email_dispatch_attempts (
    email_queue_id,
    attempt_number,
    worker_id,
    email_type,
    priority,
    budget_date,
    reserved_at
  )
  values (
    v_row.id,
    v_row.attempt_count,
    p_worker_id,
    v_row.email_type,
    v_row.priority,
    v_budget_date,
    now()
  );

  return v_row;
end;
$$;

revoke all on function public.claim_pending_email_by_id_with_budget(
  bigint,
  text
) from public;

grant execute on function public.claim_pending_email_by_id_with_budget(
  bigint,
  text
) to service_role;