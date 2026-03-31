import { NextResponse } from "next/server";
import { sendVerificationEmail } from "../../../lib/email/sendVerificationEmail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nombre, token } = body;

    if (!email || !nombre || !token) {
      return NextResponse.json(
        { error: "Faltan datos para enviar verificación" },
        { status: 400 }
      );
    }

    const result = await sendVerificationEmail(email, nombre, token);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Error en /api/send-verification:", error);

    return NextResponse.json(
      { error: "No se pudo enviar el correo de verificación" },
      { status: 500 }
    );
  }
}