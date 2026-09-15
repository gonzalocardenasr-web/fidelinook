-- ============================================================
-- DEV-LOY-RED-01
-- Registrar el tipo de evento utilizado para representar
-- la reversa de un canje cuando su venta es cancelada.
-- ============================================================

insert into public.customer_event_types (
  code,
  name,
  description,
  domain,
  is_active
)
values (
  'loyalty.reward_redemption_reversed',
  'Canje de premio revertido',
  'Canje de premio revertido por cancelación de la venta asociada.',
  'loyalty',
  true
)
on conflict (code)
do update set
  name = excluded.name,
  description = excluded.description,
  domain = excluded.domain,
  is_active = true;