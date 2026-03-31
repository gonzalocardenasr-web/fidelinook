import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.cookies.get("fidelinook_auth")?.value;
  const role = req.cookies.get("fidelinook_role")?.value;

  if (auth !== "ok" || !role) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    role,
  });
}