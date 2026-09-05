/*
 * ============================================================
 * NOOK — EMAIL DISPATCH HEALTHCHECK
 * ============================================================
 *
 * Objetivo:
 * Revisar rápidamente el estado operacional del motor de email.
 *
 * IMPORTANTE:
 * - email_dispatch_attempts representa RESERVAS de presupuesto
 *   realizadas al hacer claim de un email.
 * - No representa necesariamente entregas exitosas del proveedor.
 * - El presupuesto diario actualmente se calcula usando fecha UTC.
 * ============================================================
 */


/*
 * ============================================================
 * 1. CONFIGURACIÓN Y PRESUPUESTO DEL DÍA
 * ============================================================
 */

with
settings as (
  select
    provider_daily_limit,
    crm_daily_limit,
    updated_at
  from public.email_dispatch_settings
  where id = 1
),

usage_today as (
  select
    count(*)::integer as provider_used,

    count(*) filter (
      where priority in (2, 3)
    )::integer as crm_used
  from public.email_dispatch_attempts
  where budget_date = (now() at time zone 'UTC')::date
)

select
  (now() at time zone 'UTC')::date as budget_date_utc,

  s.provider_daily_limit,
  u.provider_used,

  greatest(
    s.provider_daily_limit - u.provider_used,
    0
  ) as provider_remaining,

  s.crm_daily_limit,
  u.crm_used,

  greatest(
    s.crm_daily_limit - u.crm_used,
    0
  ) as crm_remaining,

  s.updated_at as settings_updated_at

from settings s
cross join usage_today u;


/*
 * ============================================================
 * 2. COLA POR PRIORIDAD Y ESTADO
 * ============================================================
 */

select
  priority,
  status,
  count(*) as emails
from public.email_queue
group by
  priority,
  status
order by
  priority asc,
  status asc;


/*
 * ============================================================
 * 3. PENDIENTES LISTOS PARA DESPACHAR
 * ============================================================
 *
 * Estos emails cumplen condiciones para ser reclamados
 * por el dispatcher, sujeto a presupuesto disponible.
 * ============================================================
 */

select
  priority,
  count(*) as due_pending,
  min(created_at) as oldest_created_at
from public.email_queue
where
  status = 'PENDING'
  and attempt_count < max_attempts
  and (
    next_attempt_at is null
    or next_attempt_at <= now()
  )
group by priority
order by priority asc;


/*
 * ============================================================
 * 4. PROCESSING ESTANCADOS
 * ============================================================
 *
 * Emails que permanecen PROCESSING por más de 15 minutos.
 *
 * Resultado esperado en operación normal:
 * 0 filas.
 * ============================================================
 */

select
  id,
  recipient_email,
  email_type,
  priority,
  attempt_count,
  max_attempts,
  locked_at,
  locked_by,
  now() - locked_at as processing_age
from public.email_queue
where
  status = 'PROCESSING'
  and locked_at is not null
  and locked_at < now() - interval '15 minutes'
order by locked_at asc;


/*
 * ============================================================
 * 5. FAILED TERMINALES
 * ============================================================
 */

select
  id,
  recipient_email,
  email_type,
  priority,
  attempt_count,
  max_attempts,
  last_attempt_at,
  last_error,
  created_at
from public.email_queue
where status = 'FAILED'
order by
  coalesce(last_attempt_at, created_at) desc
limit 50;


/*
 * ============================================================
 * 6. EMAIL PENDIENTE MÁS ANTIGUO
 * ============================================================
 */

select
  id,
  recipient_email,
  email_type,
  priority,
  status,
  attempt_count,
  max_attempts,
  created_at,
  next_attempt_at,
  now() - created_at as pending_age
from public.email_queue
where status = 'PENDING'
order by created_at asc
limit 1;


/*
 * ============================================================
 * 7. EMAILS MARCADOS SENT HOY
 * ============================================================
 *
 * Usa fecha UTC para mantener la misma referencia temporal
 * que el Budget Manager.
 * ============================================================
 */

select
  priority,
  email_type,
  count(*) as sent_today
from public.email_queue
where
  status = 'SENT'
  and sent_at is not null
  and (sent_at at time zone 'UTC')::date =
      (now() at time zone 'UTC')::date
group by
  priority,
  email_type
order by
  priority asc,
  email_type asc;


/*
 * ============================================================
 * 8. RESERVAS DE PRESUPUESTO DEL DÍA
 * ============================================================
 */

select
  priority,
  email_type,
  count(*) as reserved_attempts
from public.email_dispatch_attempts
where
  budget_date = (now() at time zone 'UTC')::date
group by
  priority,
  email_type
order by
  priority asc,
  email_type asc;


/*
 * ============================================================
 * 9. ERRORES RECIENTES
 * ============================================================
 *
 * Incluye tanto FAILED como emails que hayan registrado
 * last_error durante intentos/reintentos.
 * ============================================================
 */

select
  id,
  recipient_email,
  email_type,
  priority,
  status,
  attempt_count,
  max_attempts,
  last_attempt_at,
  next_attempt_at,
  last_error
from public.email_queue
where last_error is not null
order by
  coalesce(last_attempt_at, created_at) desc
limit 50;