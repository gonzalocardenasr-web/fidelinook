import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const OP_ACCESS_COOKIE = "nook_op_access_token";
const OP_REFRESH_COOKIE = "nook_op_refresh_token";

function clearOperationalAuthCookies(response: NextResponse) {
  for (const cookieName of [OP_ACCESS_COOKIE, OP_REFRESH_COOKIE]) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(OP_REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "La sesión no puede renovarse.",
        },
        { status: 401 },
      );
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      console.error("Operational session refresh failed:", error);

      const response = NextResponse.json(
        {
          ok: false,
          message: "La sesión expiró. Debes iniciar sesión nuevamente.",
        },
        { status: 401 },
      );

      clearOperationalAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(OP_ACCESS_COOKIE, data.session.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in,
    });

    response.cookies.set(OP_REFRESH_COOKIE, data.session.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Unexpected operational session refresh error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo renovar la sesión.",
      },
      { status: 500 },
    );
  }
}
