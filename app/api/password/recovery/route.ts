import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { sendResetPasswordEmail } from "../../../../lib/email/sendResetPasswordEmail";

export async function POST(req: Request) {
  try {
    const { correo } = await req.json();

    const email = String(correo || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Debes ingresar un correo." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://fidelidad.nookheladeria.cl/restablecer-contrasena",
      },
    });

    if (error) {
      console.error("Error generateLink recovery:", error);

      return NextResponse.json(
        { ok: false, message: "No se pudo generar el enlace de recuperación." },
        { status: 500 }
      );
    }

    const resetUrl = data?.properties?.action_link;

    if (!resetUrl) {
      return NextResponse.json(
        { ok: false, message: "No se pudo obtener el enlace de recuperación." },
        { status: 500 }
      );
    }

    await sendResetPasswordEmail(email, resetUrl);

    return NextResponse.json({
      ok: true,
      message:
        "Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.",
    });
  } catch (error) {
    console.error("Error en /api/password/recovery:", error);

    return NextResponse.json(
      { ok: false, message: "Ocurrió un error inesperado." },
      { status: 500 }
    );
  }
}