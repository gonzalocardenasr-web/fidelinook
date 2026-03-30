import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "../../../lib/email/sendWelcome";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nombre } = body;

    if (!email || !nombre) {
      return NextResponse.json(
        { error: "Faltan datos para enviar correo" },
        { status: 400 }
      );
    }

    await sendWelcomeEmail(email, nombre);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/send-welcome:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el correo" },
      { status: 500 }
    );
  }
}