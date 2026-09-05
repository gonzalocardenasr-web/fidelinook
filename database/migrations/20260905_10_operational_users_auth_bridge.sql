/*
 * DEV-OPS-01.0
 * Puente temporal entre usuarios operacionales y auth.users.
 *
 * inventory_transactions.posted_by mantiene actualmente una FK hacia
 * auth.users(id). No modificamos esa relación todavía para preservar
 * trazabilidad histórica.
 *
 * operational_users sigue siendo la identidad operacional canónica.
 * auth_user_id se utiliza únicamente donde una función legacy todavía
 * requiere un UUID de auth.users.
 */

alter table public.operational_users
add column if not exists auth_user_id uuid null;


/*
 * Evita que dos identidades operacionales queden asociadas al mismo
 * usuario de Auth.
 */
create unique index if not exists operational_users_auth_user_id_unique
on public.operational_users (auth_user_id)
where auth_user_id is not null;


/*
 * Vinculamos el Super Administrador actual con el usuario de Auth que
 * históricamente ha publicado las transacciones de inventario.
 */
update public.operational_users
set
    auth_user_id = '3dfdd4e0-52e2-4c7a-b6c8-b3106a6d4566',
    updated_at = now()
where legacy_key = 'legacy_superadmin';