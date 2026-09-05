import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const usuario = String(body.usuario || "").trim();
    const password = String(body.password || "").trim();

    if (!usuario || !password) {
      return NextResponse.json(
        { ok: false, message: "Debes ingresar usuario y contraseña." },
        { status: 400 },
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const superadminUsername = process.env.SUPERADMIN_USERNAME;
    const superadminPassword = process.env.SUPERADMIN_PASSWORD;

    if (
      !adminUsername ||
      !adminPassword ||
      !superadminUsername ||
      !superadminPassword
    ) {
      return NextResponse.json(
        { ok: false, message: "Faltan variables de entorno del login." },
        { status: 500 },
      );
    }

    let role: "admin" | "superadmin" | null = null;
    let legacyKey: "legacy_admin" | "legacy_superadmin" | null = null;

    if (usuario === superadminUsername && password === superadminPassword) {
      role = "superadmin";
      legacyKey = "legacy_superadmin";
    } else if (usuario === adminUsername && password === adminPassword) {
      role = "admin";
      legacyKey = "legacy_admin";
    }

    if (!role || !legacyKey) {
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas." },
        { status: 401 },
      );
    }

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("id, display_name, role, is_active")
        .eq("legacy_key", legacyKey)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error obteniendo usuario operacional:",
        operationalUserError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible identificar al usuario operacional.",
        },
        { status: 500 },
      );
    }

    if (!operationalUser || !operationalUser.is_active) {
      return NextResponse.json(
        {
          ok: false,
          message: "El usuario operacional no se encuentra activo.",
        },
        { status: 401 },
      );
    }

    if (operationalUser.role !== role) {
      console.error(
        "Rol operacional inconsistente:",
        operationalUser.id,
        operationalUser.role,
        role,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "La configuración del usuario operacional es inválida.",
        },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      role,
      userId: operationalUser.id,
      displayName: operationalUser.display_name,
    });

    response.cookies.set("fidelinook_user_id", operationalUser.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    response.cookies.set("fidelinook_role", role, {
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

    return response;
  } catch (error) {
    console.error("Error en login:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al validar credenciales." },
      { status: 500 },
    );
  }
}
