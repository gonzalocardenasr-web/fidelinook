import { NextResponse } from "next/server";
import { Resend } from "resend";
import { baseTemplate } from "@/lib/email/baseTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, nombrePremio, descripcion, vencimiento } = await req.json();

    const html = baseTemplate({
      titulo: "🎁 Tienes un nuevo premio",
      mensaje: `
        Te asignamos un nuevo premio en <strong>Nook</strong>.<br/><br/>
        <strong>${nombrePremio}</strong><br/>
        ${descripcion}<br/><br/>
        Válido hasta: ${new Date(vencimiento).toLocaleString("es-CL", {
            timeZone: "America/Santiago",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })}
      `,
      botonTexto: "Ver mi tarjeta",
      botonUrl: "https://fidelidad.nookheladeria.cl/mi-cuenta/tarjeta",
    });

    const response = await resend.emails.send({
      from: "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>",
      to,
      subject: "🎁 Tienes un nuevo premio en Nook",
      html,
      text: `
Tienes un nuevo premio en Nook

${nombrePremio}

${descripcion}

Válido hasta: ${new Date(vencimiento).toLocaleString("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})}

Ver mi tarjeta:
https://fidelidad.nookheladeria.cl/mi-cuenta/tarjeta
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