import { NextResponse } from "next/server";
import { sendStampEmail } from "../../../lib/email/sendStampEmail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nombre, sellosActuales, metaSellos } = body;

    if (!email || !nombre || sellosActuales == null || !metaSellos) {
      return NextResponse.json(
        { error: "Faltan datos para enviar correo de sello" },
        { status: 400 }
      );
    }

    await sendStampEmail(email, nombre, sellosActuales, metaSellos);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/send-stamp:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el correo de sello" },
      { status: 500 }
    );
  }
}