import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const usuario = String(body.usuario || "").trim();
    const password = String(body.password || "").trim();

    if (!usuario || !password) {
      return NextResponse.json(
        { ok: false, message: "Debes ingresar usuario y contraseña." },
        { status: 400 }
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
        { status: 500 }
      );
    }

    if (usuario === superadminUsername && password === superadminPassword) {
      return NextResponse.json({
        ok: true,
        role: "superadmin",
      });
    }

    if (usuario === adminUsername && password === adminPassword) {
      return NextResponse.json({
        ok: true,
        role: "admin",
      });
    }

    return NextResponse.json(
      { ok: false, message: "Credenciales inválidas." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Error en login:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al validar credenciales." },
      { status: 500 }
    );
  }
}