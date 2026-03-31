import { NextResponse } from "next/server";
import { sendPrizeEmail } from "../../../lib/email/sendPrizeEmail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nombre, premioNombre, vencimiento, publicToken } = body;

    if (!email || !nombre || !premioNombre || !publicToken) {
      return NextResponse.json(
        { error: "Faltan datos para enviar correo de premio" },
        { status: 400 }
      );
    }

    await sendPrizeEmail(
      email,
      nombre,
      premioNombre,
      vencimiento,
      publicToken
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/send-prize:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el correo de premio" },
      { status: 500 }
    );
  }
}