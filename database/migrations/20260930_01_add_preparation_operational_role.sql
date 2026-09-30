-- DEV-UX-ARCH-01.3B.1
-- Incorporar el rol operacional restringido "preparation".

alter table public.operational_users
    drop constraint if exists operational_users_role_check;

alter table public.operational_users
    add constraint operational_users_role_check
    check (
        role = any (
            array[
                'superadmin'::text,
                'admin'::text,
                'cashier'::text,
                'preparation'::text
            ]
        )
    );