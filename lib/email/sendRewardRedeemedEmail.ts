import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendRewardRedeemedEmail(
  email: string,
  nombre: string,
  premioNombre: string
) {
  const html = baseTemplate({
    titulo: `¡Hola ${nombre}!`,
    mensaje: `
      Confirmamos que tu premio de <strong>Fideli-NooK</strong> fue canjeado correctamente.<br/><br/>
      <strong>Premio canjeado:</strong> ${premioNombre}<br/><br/>
      Gracias por visitarnos. Te esperamos pronto para que sigas acumulando sellos.<br/><br/>
      Ven a vernos a <strong>Tomás Moro 695, Local 4, Las Condes</strong>.
    `,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Tu premio Fideli-NooK fue canjeado correctamente",
    html,
    text: `
Hola ${nombre},

Confirmamos que tu premio de Fideli-NooK fue canjeado correctamente.

Premio canjeado: ${premioNombre}

Gracias por visitarnos. Te esperamos pronto para que sigas acumulando sellos.

Tomás Moro 695, Local 4, Las Condes.

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}