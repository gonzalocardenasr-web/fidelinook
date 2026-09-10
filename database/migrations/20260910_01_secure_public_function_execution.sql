-- SEC-P0-01
-- Harden execution privileges for functions in the public schema.
--
-- Security model:
-- - anon/authenticated must not invoke business/database functions directly.
-- - application execution is performed server-side through service_role.
-- - SECURITY DEFINER functions may continue calling internal functions as
--   their owner (postgres).
-- - trigger functions remain attached to their triggers; this only removes
--   direct public invocation privileges.
--
-- Also fixes postgres default privileges so future public functions do not
-- automatically recreate the same exposure.

-- ============================================================
-- 1. EXISTING FUNCTIONS
-- ============================================================

revoke execute on all functions in schema public
from public, anon, authenticated;

grant execute on all functions in schema public
to service_role;


-- ============================================================
-- 2. FUTURE FUNCTIONS CREATED BY postgres
-- ============================================================

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