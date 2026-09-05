/*
 * DEV-OPS-01.0
 * Fundación de usuarios operacionales.
 *
 * Objetivos:
 * - separar la identidad de operadores de clientes/auth.users;
 * - entregar un UUID estable a cada operador;
 * - mantener temporalmente los accesos legacy por variables de entorno;
 * - preparar administración de usuarios y permisos posteriores.
 */

create table if not exists public.operational_users (
    id uuid primary key default gen_random_uuid(),

    username text null,
    display_name text not null,

    role text not null
        check (role in ('superadmin', 'admin', 'cashier')),

    is_active boolean not null default true,

    /*
     * Solo se utiliza durante la transición desde los dos accesos
     * actuales definidos mediante variables de entorno.
     *
     * Los usuarios futuros no dependerán de este campo.
     */
    legacy_key text null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint operational_users_username_unique
        unique (username),

    constraint operational_users_legacy_key_unique
        unique (legacy_key)
);


/*
 * La tabla no debe quedar accesible directamente desde el cliente.
 * Toda administración se realizará server-side.
 */
alter table public.operational_users enable row level security;

revoke all on table public.operational_users from anon;
revoke all on table public.operational_users from authenticated;

grant all on table public.operational_users to service_role;


/*
 * Usuarios transitorios para los dos accesos operacionales existentes.
 *
 * Más adelante podrán ser reemplazados por usuarios individuales
 * administrados desde Nook.
 */
insert into public.operational_users (
    display_name,
    role,
    legacy_key
)
values
    (
        'Super Administrador',
        'superadmin',
        'legacy_superadmin'
    ),
    (
        'Administrador',
        'admin',
        'legacy_admin'
    )
on conflict (legacy_key)
do update set
    display_name = excluded.display_name,
    role = excluded.role,
    is_active = true,
    updated_at = now();