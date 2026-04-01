import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendPrizeExpiringReminderEmail(
  email: string,
  nombre: string,
  premioNombre: string,
  vencimiento: string,
  publicToken: string
) {
  const cardUrl = `https://fidelidad.nookheladeria.cl/t/${publicToken}`;

  const html = baseTemplate({
    titulo: `Hola ${nombre}`,
    mensaje: `
      Tu premio <strong>${premioNombre}</strong> está próximo a vencer.<br/><br/>
      Fecha de vencimiento: <strong>${new Date(vencimiento).toLocaleDateString("es-CL")}</strong>.<br/><br/>
      Revísalo en tu tarjeta digital y úsalo antes de que expire.
    `,
    botonTexto: "Ver mi tarjeta",
    botonUrl: cardUrl,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Tu premio Fideli-NooK está por vencer",
    html,
    text: `
Hola ${nombre},

Tu premio ${premioNombre} está próximo a vencer.

Fecha de vencimiento: ${new Date(vencimiento).toLocaleDateString("es-CL")}.

Revísalo aquí:
${cardUrl}

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}