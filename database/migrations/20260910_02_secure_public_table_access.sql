begin;

-- SEC-P0-01
-- Cierre estructural del acceso directo a tablas del schema public.
--
-- Modelo adoptado:
--   Browser / cliente
--       -> API controlada de Nook
--       -> service_role
--       -> PostgreSQL
--
-- anon y authenticated no deben acceder directamente a las tablas
-- de negocio del schema public.
--
-- RLS se habilita como defensa adicional, incluso cuando los grants
-- directos también son revocados.

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'alter table public.%I enable row level security',
      r.relname
    );
  end loop;
end
$$;

-- Eliminar acceso directo de los roles expuestos por Supabase.
revoke all privileges on all tables in schema public
from public, anon, authenticated;

-- Mantener el acceso de los componentes server-side controlados.
grant all privileges on all tables in schema public
to service_role;

commit;