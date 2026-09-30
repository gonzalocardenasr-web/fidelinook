import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type OperationRole = "cashier" | "admin" | "superadmin" | "preparation";

export type OperationUser = {
  id: string;
  authUserId: string;
  displayName: string;
  role: OperationRole;
};

export type OperationSession =
  | {
      ok: true;
      role: OperationRole;
      userId: string;
      authUserId: string | null;
      displayName: string | null;
      source: "supabase";
    }
  | {
      ok: false;
      role: null;
      userId: null;
      authUserId: null;
      displayName: null;
      source: null;
    };

const OP_ACCESS_COOKIE = "nook_op_access_token";

export class OperationAuthUnavailableError extends Error {
  constructor(message = "Operational authentication temporarily unavailable") {
    super(message);
    this.name = "OperationAuthUnavailableError";
  }
}

function emptyOperationSession(): OperationSession {
  return {
    ok: false,
    role: null,
    userId: null,
    authUserId: null,
    displayName: null,
    source: null,
  };
}

function isOperationRole(value: unknown): value is OperationRole {
  return (
    value === "cashier" ||
    value === "admin" ||
    value === "superadmin" ||
    value === "preparation"
  );
}

export async function getOperationalUserByAuthUserId(
  authUserId: string,
): Promise<OperationUser | null> {
  const normalizedAuthUserId = String(authUserId || "").trim();

  if (!normalizedAuthUserId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("operational_users")
    .select("id, auth_user_id, display_name, role, is_active")
    .eq("auth_user_id", normalizedAuthUserId)
    .maybeSingle();

  if (error) {
    console.error("AUTH_OPERATIONAL_USER_LOOKUP_ERROR", {
      code: error.code,
    });

    throw new OperationAuthUnavailableError();
  }

  if (!data) {
    console.warn("AUTH_OPERATIONAL_USER_NOT_FOUND");
    return null;
  }

  if (!data.is_active) {
    console.warn("AUTH_OPERATIONAL_USER_INACTIVE");
    return null;
  }

  if (!data.auth_user_id || !isOperationRole(data.role)) {
    console.warn("AUTH_OPERATIONAL_USER_INVALID");
    return null;
  }

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    displayName: data.display_name,
    role: data.role,
  };
}

async function resolveSupabaseAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(OP_ACCESS_COOKIE)?.value;

  if (!accessToken) {
    console.warn("AUTH_ACCESS_COOKIE_MISSING");
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getClaims(accessToken);

  if (error) {
    console.warn("AUTH_CLAIMS_REJECTED", {
      status: error.status,
      code: error.code,
    });
    return null;
  }

  const authUserId = data?.claims?.sub;

  if (!authUserId || typeof authUserId !== "string") {
    console.warn("AUTH_CLAIMS_SUB_MISSING");
    return null;
  }

  return authUserId;
}

async function getSupabaseOperationSession(): Promise<OperationSession> {
  const authUserId = await resolveSupabaseAuthUserId();

  if (!authUserId) {
    return emptyOperationSession();
  }

  const operationalUser = await getOperationalUserByAuthUserId(authUserId);

  if (!operationalUser) {
    return emptyOperationSession();
  }

  return {
    ok: true,
    role: operationalUser.role,
    userId: operationalUser.id,
    authUserId: operationalUser.authUserId,
    displayName: operationalUser.displayName,
    source: "supabase",
  };
}

export async function getOperationSession(): Promise<OperationSession> {
  return getSupabaseOperationSession();
}
