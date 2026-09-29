create extension if not exists pg_trgm;

create index if not exists idx_clientes_nombre_trgm
on public.clientes
using gin (nombre gin_trgm_ops);

create index if not exists idx_clientes_correo_trgm
on public.clientes
using gin (correo gin_trgm_ops);

create index if not exists idx_clientes_telefono_trgm
on public.clientes
using gin (telefono gin_trgm_ops);