import type { OperationRole, OperationSession } from "@/lib/operation-auth";

export type OperationPermission =
  | "sales.operate"
  | "orders.operate"
  | "customers.operate"
  | "loyalty.operate"
  | "cash.operate"
  | "catalog.read"
  | "catalog.manage"
  | "inventory.stock.read"
  | "inventory.movements.operate"
  | "inventory.receipts.manage"
  | "inventory.config.manage"
  | "campaigns.manage"
  | "subscriptions.operate"
  | "subscriptions.manage"
  | "subscriptions.delete"
  | "analytics.view"
  | "users.manage";

const CASHIER_PERMISSIONS: readonly OperationPermission[] = [
  "sales.operate",
  "orders.operate",
  "customers.operate",
  "loyalty.operate",
  "cash.operate",
  "catalog.read",
  "inventory.stock.read",
  "inventory.movements.operate",
  "subscriptions.operate",
];

const ADMIN_PERMISSIONS: readonly OperationPermission[] = [
  ...CASHIER_PERMISSIONS,
  "catalog.manage",
  "inventory.receipts.manage",
  "inventory.config.manage",
  "campaigns.manage",
  "subscriptions.manage",
  "analytics.view",
];

const SUPERADMIN_PERMISSIONS: readonly OperationPermission[] = [
  ...ADMIN_PERMISSIONS,
  "subscriptions.delete",
  "users.manage",
];

export const ROLE_PERMISSIONS: Readonly<
  Record<OperationRole, readonly OperationPermission[]>
> = {
  cashier: CASHIER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  superadmin: SUPERADMIN_PERMISSIONS,
};

export function hasOperationPermission(
  role: OperationRole,
  permission: OperationPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export type OperationAuthorizationResult =
  | {
      ok: true;
      session: Extract<OperationSession, { ok: true }>;
    }
  | {
      ok: false;
      status: 401 | 403;
      code: "UNAUTHENTICATED" | "FORBIDDEN";
      message: string;
    };

export function authorizeOperationSession(
  session: OperationSession,
  permission: OperationPermission,
): OperationAuthorizationResult {
  if (!session.ok) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHENTICATED",
      message: "No autenticado.",
    };
  }

  if (!hasOperationPermission(session.role, permission)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "No tienes permisos para realizar esta acción.",
    };
  }

  return {
    ok: true,
    session,
  };
}
