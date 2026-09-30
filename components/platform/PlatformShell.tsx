"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  type SVGProps,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { OperationRole } from "@/lib/operation-auth";
import {
  getPlatformNavigation,
  getRoleLabel,
  PLATFORM_SECTION_LABELS,
  type PlatformNavigationItem,
  type PlatformNavigationSection,
} from "@/lib/platform-navigation";

type SessionPayload = {
  role?: OperationRole | null;
  displayName?: string | null;
};

type ShellSession = {
  role: OperationRole;
  displayName: string | null;
};

type PlatformShellProps = {
  children: ReactNode;
};

const SECTION_ORDER: PlatformNavigationSection[] = [
  "operation",
  "management",
  "administration",
];

function isOperationRole(value: unknown): value is OperationRole {
  return value === "cashier" || value === "admin" || value === "superadmin";
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/operacion/ventas") {
    return (
      pathname === "/operacion/ventas" ||
      (pathname.startsWith("/operacion/ventas/") &&
        !pathname.startsWith("/operacion/ventas/nueva") &&
        !pathname.includes("/imprimir") &&
        !pathname.includes("/ticket"))
    );
  }

  if (href === "/operacion/inventario") {
    return (
      pathname === "/operacion/inventario" ||
      pathname.startsWith("/operacion/inventario/stock") ||
      pathname.startsWith("/operacion/inventario/bachas") ||
      pathname.startsWith("/operacion/inventario/movimientos") ||
      pathname.startsWith("/operacion/inventario/ajustes")
    );
  }

  if (href === "/operacion/inventario/recepciones") {
    return pathname.startsWith("/operacion/inventario/recepciones");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getBreadcrumbs(pathname: string): string[] {
  if (pathname === "/operacion") {
    return ["Operación"];
  }

  if (pathname.startsWith("/operacion/ventas/nueva")) {
    return ["Operación", "POS"];
  }

  if (pathname.startsWith("/operacion/cola")) {
    return ["Operación", "Preparación"];
  }

  if (pathname.startsWith("/operacion/ventas")) {
    return ["Operación", "Historial"];
  }

  if (pathname.startsWith("/operacion/caja")) {
    return ["Operación", "Caja"];
  }

  if (pathname.startsWith("/operacion/inventario/recepciones")) {
    return ["Gestión", "Inventario", "Recepciones"];
  }

  if (pathname.startsWith("/operacion/inventario/stock")) {
    return ["Operación", "Inventario", "Stock"];
  }

  if (pathname.startsWith("/operacion/inventario/bachas")) {
    return ["Operación", "Inventario", "Bachas"];
  }

  if (pathname.startsWith("/operacion/inventario/movimientos")) {
    return ["Operación", "Inventario", "Movimientos"];
  }

  if (pathname.startsWith("/operacion/inventario/ajustes")) {
    return ["Operación", "Inventario", "Ajustes"];
  }

  if (pathname.startsWith("/operacion/inventario")) {
    return ["Operación", "Inventario"];
  }

  if (pathname.startsWith("/operacion/catalogo")) {
    return ["Gestión", "Catálogo"];
  }

  if (pathname.startsWith("/dashboard")) {
    return ["Gestión", "Analytics"];
  }

  if (pathname.startsWith("/clientes")) {
    return ["Gestión", "Clientes"];
  }

  if (pathname.startsWith("/campanas/")) {
    return ["Gestión", "Campañas", "Detalle"];
  }

  if (pathname.startsWith("/campanas")) {
    return ["Gestión", "Campañas"];
  }

  if (pathname.startsWith("/suscripciones")) {
    return ["Gestión", "Suscripciones"];
  }

  if (pathname.startsWith("/admin/usuarios")) {
    return ["Administración", "Usuarios"];
  }

  return ["Plataforma Nook"];
}

function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: PlatformNavigationItem["icon"] | "logout" | "user";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "pos":
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h3M15 13h1M8 17h8" />
        </svg>
      );

    case "preparation":
      return (
        <svg {...common}>
          <path d="M7 4h10l2 4v11H5V8l2-4Z" />
          <path d="M5 8h14M9 12h6M9 16h4" />
        </svg>
      );

    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 4v4h4M12 7v5l3 2" />
        </svg>
      );

    case "inventory":
      return (
        <svg {...common}>
          <path d="m4 7 8-4 8 4-8 4-8-4Z" />
          <path d="m4 7 8 4 8-4M4 7v10l8 4 8-4V7M12 11v10" />
        </svg>
      );

    case "cash":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M7 10h.01M17 14h.01" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );

    case "analytics":
      return (
        <svg {...common}>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      );

    case "customers":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c.6-3.3 2.6-5 6-5s5.4 1.7 6 5" />
          <path d="M16 6.5a2.5 2.5 0 0 1 0 5M17 14c2.3.4 3.6 2 4 5" />
        </svg>
      );

    case "catalog":
      return (
        <svg {...common}>
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      );

    case "campaigns":
      return (
        <svg {...common}>
          <path d="M4 13V9l11-4v12L4 13Z" />
          <path d="M15 9h3a2 2 0 0 1 0 4h-3M6 14l1 5h4l-2-5" />
        </svg>
      );

    case "subscriptions":
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 20c.7-4 2.7-6 6-6s5.3 2 6 6" />
        </svg>
      );
  }
}

export default function PlatformShell({ children }: PlatformShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<ShellSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }

        if (!response.ok) {
          console.error("PLATFORM_SHELL_SESSION_UNAVAILABLE", {
            status: response.status,
          });

          setSessionUnavailable(true);
          return;
        }

        const data = (await response.json()) as SessionPayload;

        if (!isOperationRole(data.role)) {
          router.replace("/admin/login");
          return;
        }

        setSession({
          role: data.role,
          displayName: data.displayName ?? null,
        });
        setSessionUnavailable(false);
      } catch (error) {
        if (cancelled) return;

        console.error("PLATFORM_SHELL_SESSION_ERROR", error);
        setSessionUnavailable(true);
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const navigation = useMemo(
    () => (session ? getPlatformNavigation(session.role) : []),
    [session],
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(pathname), [pathname]);

  const initials = useMemo(() => {
    const name = session?.displayName?.trim();

    if (!name) return "N";

    const parts = name.split(/\s+/).filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [session?.displayName]);

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        console.error("PLATFORM_SHELL_LOGOUT_FAILED", {
          status: response.status,
        });
      }
    } catch (error) {
      console.error("PLATFORM_SHELL_LOGOUT_ERROR", error);
    } finally {
      window.location.href = "/admin/login";
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <aside
        className="
          group fixed inset-y-0 left-0 z-50
          w-16 overflow-hidden border-r border-neutral-200 bg-white
          shadow-[2px_0_12px_rgba(0,0,0,0.04)]
          transition-[width,box-shadow] duration-200 ease-out
          hover:w-60 hover:shadow-[8px_0_28px_rgba(0,0,0,0.12)]
        "
      >
        <div className="flex h-14 items-center border-b border-neutral-200 px-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4C00F7] text-sm font-bold text-white">
            N
          </div>

          <div className="ml-3 min-w-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <p className="whitespace-nowrap text-sm font-semibold text-neutral-950">
              Plataforma Nook
            </p>
            <p className="whitespace-nowrap text-xs text-neutral-500">
              Operación y gestión
            </p>
          </div>
        </div>

        <nav className="h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden py-3">
          {SECTION_ORDER.map((section) => {
            const items = navigation.filter((item) => item.section === section);

            if (items.length === 0) return null;

            return (
              <div key={section} className="mb-4">
                <div className="mb-1 h-6 px-4">
                  <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100">
                    {PLATFORM_SECTION_LABELS[section]}
                  </p>
                </div>

                <div className="space-y-1 px-2">
                  {items.map((item) => {
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        title={item.label}
                        className={[
                          "flex h-11 items-center rounded-xl transition",
                          active
                            ? "bg-violet-50 text-[#4C00F7]"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
                        ].join(" ")}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                          <Icon name={item.icon} className="h-5 w-5" />
                        </span>

                        <span className="ml-1 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-screen pl-16">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur md:px-5">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {breadcrumbs.map((breadcrumb, index) => (
                <div
                  key={`${breadcrumb}-${index}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  {index > 0 && <span className="text-neutral-300">/</span>}

                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? "truncate font-semibold text-neutral-900"
                        : "truncate text-neutral-500"
                    }
                  >
                    {breadcrumb}
                  </span>
                </div>
              ))}
            </div>

            {sessionUnavailable && (
              <p className="mt-0.5 text-[11px] text-amber-700">
                No fue posible actualizar temporalmente la información de
                sesión.
              </p>
            )}
          </div>

          <div className="relative ml-4 flex shrink-0 items-center gap-3">
            {sessionLoading ? (
              <div className="h-8 w-32 animate-pulse rounded-lg bg-neutral-100" />
            ) : session ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="max-w-44 truncate text-sm font-medium text-neutral-900">
                    {session.displayName || "Usuario Nook"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {getRoleLabel(session.role)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setUserMenuOpen((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4C00F7] text-xs font-semibold text-white transition hover:bg-[#3F00CC]"
                  aria-label="Abrir menú de usuario"
                  aria-expanded={userMenuOpen}
                >
                  {initials}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
                    <div className="border-b border-neutral-100 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#4C00F7]">
                          <Icon name="user" className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-950">
                            {session.displayName || "Usuario Nook"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {getRoleLabel(session.role)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="logout" className="h-5 w-5" />
                        {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </header>

        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </div>
    </div>
  );
}
