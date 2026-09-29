import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const OP_ACCESS_COOKIE = "nook_op_access_token";
const OP_REFRESH_COOKIE = "nook_op_refresh_token";

function createAuthClient() {
  return createClient(
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
}

function setOperationalCookies(
  request: NextRequest,
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
) {
  request.cookies.set(OP_ACCESS_COOKIE, accessToken);
  request.cookies.set(OP_REFRESH_COOKIE, refreshToken);

  response.cookies.set(OP_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });

  response.cookies.set(OP_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  response.headers.set("Cache-Control", "private, no-store");
}

async function refreshOperationalSession(
  request: NextRequest,
): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get(OP_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return null;
  }

  const supabaseAuth = createAuthClient();

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    console.warn("AUTH_REFRESH_REJECTED", {
      status: error?.status,
      code: error?.code,
    });

    return null;
  }

  const response = NextResponse.next({
    request,
  });

  setOperationalCookies(
    request,
    response,
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_in,
  );

  console.info("AUTH_REFRESH_OK");

  return response;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(OP_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(OP_REFRESH_COOKIE)?.value;

  /*
   * Sesión normal:
   * no hacemos ninguna llamada adicional a Supabase.
   * La identidad y RBAC se validan donde corresponda mediante
   * getOperationSession().
   */
  if (accessToken) {
    return NextResponse.next();
  }

  /*
   * Sin access token y sin refresh token:
   * no existe una sesión operacional recuperable.
   */
  if (!refreshToken) {
    return NextResponse.next();
  }

  /*
   * El access token ya no está disponible, pero todavía existe
   * refresh token. Intentamos UNA renovación.
   */
  const refreshedResponse = await refreshOperationalSession(request);

  if (refreshedResponse) {
    return refreshedResponse;
  }

  /*
   * Un refresh fallido nunca concede acceso y tampoco destruye
   * las cookies. Las APIs continuarán rechazando una identidad
   * que no puedan verificar.
   */
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/operacion/:path*",
    "/admin/:path*",
    "/api/operacion/:path*",
    "/api/admin/:path*",
    "/api/session",
    "/api/catalogo/:path*",
    "/api/subscriptions/:path*",
  ],
};
