import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type OperationRole = "cashier" | "admin" | "superadmin";

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
  return value === "cashier" || value === "admin" || value === "superadmin";
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
    console.error(
      "Error resolving operational user from Supabase Auth:",
      error,
    );
    return null;
  }

  if (
    !data ||
    !data.is_active ||
    !data.auth_user_id ||
    !isOperationRole(data.role)
  ) {
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
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user.id;
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