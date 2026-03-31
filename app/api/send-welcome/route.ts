import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "../../../lib/email/sendWelcome";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Body recibido en /api/send-welcome:", body);

    const { email, nombre } = body;

    if (!email || !nombre) {
      console.error("Faltan datos:", { email, nombre });
      return NextResponse.json(
        { error: "Faltan datos para enviar correo" },
        { status: 400 }
      );
    }

    console.log("Antes de sendWelcomeEmail:", { email, nombre });

    const result = await sendWelcomeEmail(email, nombre);

    console.log("Resultado sendWelcomeEmail:", result);

    return NextResponse.json({
      ok: true,
      result
    });

  } catch (error) {
    console.error("Error en /api/send-welcome:", error);

    return NextResponse.json(
      { error: "No se pudo enviar el correo" },
      { status: 500 }
    );
  }
}