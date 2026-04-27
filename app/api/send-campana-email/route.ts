import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, nombrePremio, descripcion, vencimiento } = await req.json();

    const response = await resend.emails.send({
        from: "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>",
        to,
        subject: "🎁 Tienes un nuevo premio en Nook",
        html: `
            <div style="font-family: Arial; padding: 20px;">
            <h2>🎉 Nuevo premio para ti</h2>
            <p><strong>${nombrePremio}</strong></p>
            <p>${descripcion}</p>
            <p>Válido hasta: ${new Date(vencimiento).toLocaleString()}</p>
            <a href="https://fidelidad.nookheladeria.cl/mi-cuenta/tarjeta">
                Ver mi tarjeta
            </a>
            </div>
        `,
    });

        console.log("RESEND RESPONSE:", response);
        if (response.error) {
            throw new Error(`Resend error: ${JSON.stringify(response.error)}`);
        }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Error enviando correo campaña:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}