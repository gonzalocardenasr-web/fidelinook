import { NextResponse } from "next/server";
import { sendRewardRedeemedEmail } from "../../../lib/email/sendRewardRedeemedEmail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nombre, premioNombre, publicToken } = body;

    if (!email || !nombre || !premioNombre || !publicToken) {
      return NextResponse.json(
        { error: "Faltan datos para enviar confirmación de canje" },
        { status: 400 }
      );
    }

    const result = await sendRewardRedeemedEmail(
      email,
      nombre,
      premioNombre,
      publicToken
    );

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Error en /api/send-reward-redeemed:", error);

    return NextResponse.json(
      { error: "No se pudo enviar el correo de canje" },
      { status: 500 }
    );
  }
}