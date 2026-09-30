import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getOperationalUserByAuthUserId } from "@/lib/operation-auth";

const OP_ACCESS_COOKIE = "nook_op_access_token";

const OP_REFRESH_COOKIE = "nook_op_refresh_token";

function setOperationalAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
) {
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
}

async function trySupabaseOperationalLogin(
  usuario: string,
  password: string,
): Promise<
  | {
      ok: true;
      operationalUser: {
        id: string;
        authUserId: string;
        displayName: string;
        role: "cashier" | "admin" | "superadmin" | "preparation";
      };
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }
  | { ok: false }
> {
  const email = usuario.toLowerCase();

  if (!email.includes("@")) {
    return { ok: false };
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

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    return { ok: false };
  }

  const operationalUser = await getOperationalUserByAuthUserId(data.user.id);

  if (!operationalUser) {
    await supabaseAuth.auth.signOut();
    return { ok: false };
  }

  return {
    ok: true,
    operationalUser,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const usuario = String(body.usuario || "").trim();
    const password = String(body.password || "");

    if (!usuario || !password) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes ingresar usuario y contraseña.",
        },
        { status: 400 },
      );
    }

    const supabaseLogin = await trySupabaseOperationalLogin(usuario, password);

    if (!supabaseLogin.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Credenciales inválidas.",
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      role: supabaseLogin.operationalUser.role,
      userId: supabaseLogin.operationalUser.id,
      displayName: supabaseLogin.operationalUser.displayName,
      authSource: "supabase",
    });

    setOperationalAuthCookies(
      response,
      supabaseLogin.accessToken,
      supabaseLogin.refreshToken,
      supabaseLogin.expiresIn,
    );

    return response;
  } catch (error) {
    console.error("Error en login operacional:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al validar credenciales.",
      },
      { status: 500 },
    );
  }
}
