import { cookies } from "next/headers";

export type OperationRole = "admin" | "superadmin";

export type OperationSession =
  | {
      ok: true;
      role: OperationRole;
      userId: string | null;
    }
  | {
      ok: false;
      role: null;
      userId: null;
    };

export async function getOperationSession(): Promise<OperationSession> {
  const cookieStore = await cookies();

  const auth = cookieStore.get("fidelinook_auth")?.value;
  const role = cookieStore.get("fidelinook_role")?.value;
  const userId = cookieStore.get("fidelinook_user_id")?.value ?? null;

  if (auth !== "ok") {
    return {
      ok: false,
      role: null,
      userId: null,
    };
  }

  if (role !== "admin" && role !== "superadmin") {
    return {
      ok: false,
      role: null,
      userId: null,
    };
  }

  return {
    ok: true,
    role,
    userId,
  };
}
