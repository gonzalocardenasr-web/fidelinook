import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const { to, nombrePremio, descripcion, vencimiento } = await req.json();

    await resend.emails.send({
      from: "Nook <fidelidad@nookheladeria.cl>",
      to,
      subject: "🎁 Tienes un nuevo premio en Nook",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>🎉 Nuevo premio para ti</h2>
          <p><strong>${nombrePremio}</strong></p>
          <p>${descripcion}</p>
          <p>Válido hasta: ${new Date(vencimiento).toLocaleString()}</p>
          <p>Revísalo en tu tarjeta de fidelidad 👇</p>
          <a href="https://fidelidad.nookheladeria.cl/mi-cuenta/tarjeta">
            Ver mi tarjeta
          </a>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Error enviando correo campaña:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}