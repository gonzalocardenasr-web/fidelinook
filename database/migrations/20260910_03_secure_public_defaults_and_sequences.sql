begin;

-- SEC-P0-01
-- Cierre de sequences actuales y endurecimiento de default privileges
-- controlables por el rol postgres en el schema public.
--
-- Objetivo:
--   - anon/authenticated sin acceso directo a sequences actuales
--   - service_role mantiene acceso server-side
--   - futuros objetos creados por postgres no reciben grants amplios
--
-- Nota:
-- Los default privileges cuyo owner es supabase_admin son administrados
-- por Supabase y el rol postgres del SQL Editor no puede modificarlos.
-- Esa superficie se controla mediante auditoría/healthcheck.

-- ============================================================
-- 1. SEQUENCES ACTUALES
-- ============================================================

revoke all privileges on all sequences in schema public
from public, anon, authenticated;

grant all privileges on all sequences in schema public
to service_role;

-- ============================================================
-- 2. DEFAULT PRIVILEGES — OBJETOS CREADOS POR postgres
-- ============================================================

alter default privileges
for role postgres
in schema public
revoke all privileges on tables
from public, anon, authenticated;

alter default privileges
for role postgres
in schema public
grant all privileges on tables
to service_role;

alter default privileges
for role postgres
in schema public
revoke all privileges on sequences
from public, anon, authenticated;

alter default privileges
for role postgres
in schema public
grant all privileges on sequences
to service_role;

alter default privileges
for role postgres
in schema public
revoke execute on functions
from public, anon, authenticated;

alter default privileges
for role postgres
in schema public
grant execute on functions
to service_role;

commit;