import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getOperationalUserByAuthUserId } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const OP_ACCESS_COOKIE = "nook_op_access_token";

function setOperationalAuthCookies(
  response: NextResponse,
  accessToken: string,
) {
  response.cookies.set(OP_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

function setLegacyCookies(
  response: NextResponse,
  operationalUser: {
    id: string;
    role: "admin" | "superadmin";
  },
) {
  response.cookies.set("fidelinook_user_id", operationalUser.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  response.cookies.set("fidelinook_role", operationalUser.role, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  response.cookies.set("fidelinook_auth", "ok", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
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
        role: "cashier" | "admin" | "superadmin";
      };
      accessToken: string;
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
  };
}

async function tryLegacyOperationalLogin(usuario: string, password: string) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const superadminUsername = process.env.SUPERADMIN_USERNAME;
  const superadminPassword = process.env.SUPERADMIN_PASSWORD;

  let role: "admin" | "superadmin" | null = null;
  let legacyKey: "legacy_admin" | "legacy_superadmin" | null = null;

  if (
    superadminUsername &&
    superadminPassword &&
    usuario === superadminUsername &&
    password === superadminPassword
  ) {
    role = "superadmin";
    legacyKey = "legacy_superadmin";
  } else if (
    adminUsername &&
    adminPassword &&
    usuario === adminUsername &&
    password === adminPassword
  ) {
    role = "admin";
    legacyKey = "legacy_admin";
  }

  if (!role || !legacyKey) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("operational_users")
    .select("id, display_name, role, is_active")
    .eq("legacy_key", legacyKey)
    .maybeSingle();

  if (error || !data || !data.is_active || data.role !== role) {
    return null;
  }

  return {
    id: data.id,
    displayName: data.display_name,
    role,
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

    if (supabaseLogin.ok) {
      const response = NextResponse.json({
        ok: true,
        role: supabaseLogin.operationalUser.role,
        userId: supabaseLogin.operationalUser.id,
        displayName: supabaseLogin.operationalUser.displayName,
        authSource: "supabase",
      });

      setOperationalAuthCookies(response, supabaseLogin.accessToken);

      return response;
    }

    const legacyUser = await tryLegacyOperationalLogin(usuario, password);

    if (!legacyUser) {
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
      role: legacyUser.role,
      userId: legacyUser.id,
      displayName: legacyUser.displayName,
      authSource: "legacy",
    });

    setLegacyCookies(response, legacyUser);

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
