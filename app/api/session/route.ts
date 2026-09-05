import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.cookies.get("fidelinook_auth")?.value;
  const role = req.cookies.get("fidelinook_role")?.value;
  const userId = req.cookies.get("fidelinook_user_id")?.value ?? null;

  if (auth !== "ok" || (role !== "admin" && role !== "superadmin")) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    role,
    userId,
  });
}
