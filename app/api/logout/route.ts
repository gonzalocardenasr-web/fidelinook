import { NextResponse } from "next/server";

const COOKIES_TO_CLEAR = [
  "nook_op_access_token",
  "nook_op_refresh_token",
  "fidelinook_user_id",
  "fidelinook_role",
  "fidelinook_auth",
];

export async function POST() {
  const response = NextResponse.json({ ok: true });

  for (const cookieName of COOKIES_TO_CLEAR) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
