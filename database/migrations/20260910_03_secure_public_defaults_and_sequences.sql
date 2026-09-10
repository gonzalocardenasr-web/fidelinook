begin;

-- SEC-P0-01
-- Cierre de sequences actuales y endurecimiento de default privileges
-- para futuros objetos creados en el schema public.
--
-- Objetivo:
--   - anon/authenticated sin acceso directo
--   - service_role mantiene acceso server-side
--   - evitar que futuras migrations reintroduzcan grants amplios

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

-- ============================================================
-- 3. DEFAULT PRIVILEGES — OBJETOS CREADOS POR supabase_admin
-- ============================================================

alter default privileges
for role supabase_admin
in schema public
revoke all privileges on tables
from public, anon, authenticated;

alter default privileges
for role supabase_admin
in schema public
grant all privileges on tables
to service_role;

alter default privileges
for role supabase_admin
in schema public
revoke all privileges on sequences
from public, anon, authenticated;

alter default privileges
for role supabase_admin
in schema public
grant all privileges on sequences
to service_role;

alter default privileges
for role supabase_admin
in schema public
revoke execute on functions
from public, anon, authenticated;

alter default privileges
for role supabase_admin
in schema public
grant execute on functions
to service_role;

commit;