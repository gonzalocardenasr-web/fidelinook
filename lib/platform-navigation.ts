import type { OperationRole } from "@/lib/operation-auth";
import {
  hasOperationPermission,
  type OperationPermission,
} from "@/lib/operation-rbac";

export type PlatformNavigationSection =
  | "operation"
  | "management"
  | "administration";

export type PlatformNavigationItem = {
  id: string;
  label: string;
  shortLabel: string;
  href: string;
  section: PlatformNavigationSection;
  permission: OperationPermission;
  icon:
    | "summary"
    | "pos"
    | "preparation"
    | "history"
    | "inventory"
    | "cash"
    | "analytics"
    | "customers"
    | "catalog"
    | "campaigns"
    | "subscriptions"
    | "users";
};

export const PLATFORM_SECTION_LABELS: Record<
  PlatformNavigationSection,
  string
> = {
  operation: "Operación",
  management: "Gestión",
  administration: "Administración",
};

const PLATFORM_NAVIGATION: readonly PlatformNavigationItem[] = [
  {
    id: "operation-summary",
    label: "Resumen Operativo",
    shortLabel: "Resumen",
    href: "/operacion/resumen",
    section: "operation",
    permission: "operation.summary.view",
    icon: "summary",
  },
  {
    id: "pos",
    label: "POS",
    shortLabel: "POS",
    href: "/operacion/pos",
    section: "operation",
    permission: "sales.operate",
    icon: "pos",
  },
  {
    id: "preparation",
    label: "Preparación",
    shortLabel: "Prep.",
    href: "/operacion/preparacion",
    section: "operation",
    permission: "orders.operate",
    icon: "preparation",
  },
  {
    id: "history",
    label: "Historial",
    shortLabel: "Hist.",
    href: "/operacion/historial",
    section: "operation",
    permission: "sales.operate",
    icon: "history",
  },
  {
    id: "inventory-operation",
    label: "Inventario",
    shortLabel: "Inv.",
    href: "/operacion/inventario",
    section: "operation",
    permission: "inventory.stock.read",
    icon: "inventory",
  },
  {
    id: "cash",
    label: "Caja",
    shortLabel: "Caja",
    href: "/operacion/caja",
    section: "operation",
    permission: "cash.operate",
    icon: "cash",
  },

  {
    id: "analytics",
    label: "Analytics",
    shortLabel: "Analyt.",
    href: "/gestion/analytics",
    section: "management",
    permission: "analytics.view",
    icon: "analytics",
  },
  {
    id: "customers",
    label: "Clientes",
    shortLabel: "Clientes",
    href: "/gestion/clientes",
    section: "management",
    permission: "customers.manage",
    icon: "customers",
  },
  {
    id: "catalog",
    label: "Catálogo",
    shortLabel: "Catálogo",
    href: "/gestion/catalogo",
    section: "management",
    permission: "catalog.manage",
    icon: "catalog",
  },
  {
    id: "inventory-management",
    label: "Inventario",
    shortLabel: "Inv.",
    href: "/operacion/inventario/recepciones",
    section: "management",
    permission: "inventory.receipts.manage",
    icon: "inventory",
  },
  {
    id: "campaigns",
    label: "Campañas",
    shortLabel: "Camp.",
    href: "/gestion/campanas",
    section: "management",
    permission: "campaigns.manage",
    icon: "campaigns",
  },
  {
    id: "subscriptions",
    label: "Suscripciones",
    shortLabel: "Suscrip.",
    href: "/gestion/suscripciones",
    section: "management",
    permission: "subscriptions.manage",
    icon: "subscriptions",
  },

  {
    id: "users",
    label: "Usuarios",
    shortLabel: "Usuarios",
    href: "/administracion/usuarios",
    section: "administration",
    permission: "users.manage",
    icon: "users",
  },
];

export function getPlatformNavigation(
  role: OperationRole,
): PlatformNavigationItem[] {
  return PLATFORM_NAVIGATION.filter((item) =>
    hasOperationPermission(role, item.permission),
  );
}

export function getRoleLabel(role: OperationRole): string {
  switch (role) {
    case "cashier":
      return "Cajer@";
    case "admin":
      return "Admin";
    case "superadmin":
      return "Superadmin";
    case "preparation":
      return "Preparación";
  }
}
