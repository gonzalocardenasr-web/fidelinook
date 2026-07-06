import { cookies } from "next/headers";

export type OperationRole = "admin" | "superadmin";

export async function getOperationSession(): Promise<{
  ok: boolean;
  role: OperationRole | null;
}> {
  const cookieStore = await cookies();

  const auth = cookieStore.get("fidelinook_auth")?.value;
  const role = cookieStore.get("fidelinook_role")?.value;

  if (auth !== "ok") {
    return { ok: false, role: null };
  }

  if (role !== "admin" && role !== "superadmin") {
    return { ok: false, role: null };
  }

  return { ok: true, role };
}
