-- SEC-P0-01
-- Remove direct public execution of privileged inventory receipt RPCs.
--
-- These functions are SECURITY DEFINER and are now consumed exclusively
-- through protected server-side operational APIs using service_role.

revoke execute on function public.create_inventory_transaction(
  text,
  bigint,
  text,
  text,
  timestamp with time zone,
  text
) from public, anon, authenticated;

revoke execute on function public.add_inventory_transaction_item(
  bigint,
  text,
  numeric,
  numeric,
  text
) from public, anon, authenticated;

revoke execute on function public.delete_inventory_transaction_item(
  bigint
) from public, anon, authenticated;

revoke execute on function public.cancel_inventory_transaction(
  bigint
) from public, anon, authenticated;

grant execute on function public.create_inventory_transaction(
  text,
  bigint,
  text,
  text,
  timestamp with time zone,
  text
) to service_role;

grant execute on function public.add_inventory_transaction_item(
  bigint,
  text,
  numeric,
  numeric,
  text
) to service_role;

grant execute on function public.delete_inventory_transaction_item(
  bigint
) to service_role;

grant execute on function public.cancel_inventory_transaction(
  bigint
) to service_role;