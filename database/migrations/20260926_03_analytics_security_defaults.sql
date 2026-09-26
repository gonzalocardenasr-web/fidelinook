-- ============================================================
-- DEV-ANL-01
-- Analytics security defaults
--
-- Objetivo:
-- Asegurar que nuevos objetos creados en analytics no queden
-- expuestos accidentalmente a PUBLIC / anon / authenticated.
-- ============================================================

REVOKE ALL ON SCHEMA analytics FROM PUBLIC;
REVOKE ALL ON SCHEMA analytics FROM anon;
REVOKE ALL ON SCHEMA analytics FROM authenticated;

GRANT USAGE ON SCHEMA analytics TO service_role;


ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
REVOKE ALL ON TABLES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
REVOKE ALL ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
REVOKE ALL ON TABLES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
GRANT SELECT ON TABLES TO service_role;


ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
REVOKE ALL ON SEQUENCES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
REVOKE ALL ON SEQUENCES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
REVOKE ALL ON SEQUENCES FROM authenticated;