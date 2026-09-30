"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { OperationRole } from "@/lib/operation-auth";
import type { OperationPermission } from "@/lib/operation-rbac";

export type PlatformSession = {
  role: OperationRole;
  displayName: string | null;
  permissions: OperationPermission[];
};

type PlatformSessionContextValue = {
  session: PlatformSession;
  hasPermission: (permission: OperationPermission) => boolean;
};

const PlatformSessionContext =
  createContext<PlatformSessionContextValue | null>(null);

export function PlatformSessionProvider({
  session,
  children,
}: {
  session: PlatformSession;
  children: ReactNode;
}) {
  const value = useMemo<PlatformSessionContextValue>(
    () => ({
      session,
      hasPermission: (permission) => session.permissions.includes(permission),
    }),
    [session],
  );

  return (
    <PlatformSessionContext.Provider value={value}>
      {children}
    </PlatformSessionContext.Provider>
  );
}

export function usePlatformSession(): PlatformSessionContextValue {
  const context = useContext(PlatformSessionContext);

  if (!context) {
    throw new Error(
      "usePlatformSession must be used within PlatformSessionProvider.",
    );
  }

  return context;
}
