import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendReactivationEmail(
  email: string,
  nombre: string,
  sellosActuales: number,
  metaSellos: number,
  publicToken: string
) {
  const cardUrl = `https://fidelidad.nookheladeria.cl/t/${publicToken}`;
  const sellosFaltantes = Math.max(metaSellos - sellosActuales, 0);

  const html = baseTemplate({
    titulo: `Hola ${nombre}`,
    mensaje: `
      No te hemos visto hace un tiempito en Nook 😔<br/><br/>
      Queremos recordarte que ya llevas <strong>${sellosActuales} sello${sellosActuales === 1 ? "" : "s"}</strong>.<br/><br/>
      Te faltan solo <strong>${sellosFaltantes} sello${sellosFaltantes === 1 ? "" : "s"}</strong> para conseguir tu <strong>helado gratis</strong> 🍦<br/><br/>
      Tu tarjeta sigue esperándote en <strong>Nook Heladería de Autora</strong>.<br/>
      Te esperamos en <strong>Tomás Moro 695, Local 4, Las Condes</strong>.
    `,
    botonTexto: "Ver mi tarjeta",
    botonUrl: cardUrl,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Tu próximo helado gratis está más cerca de lo que crees 🍦",
    html,
    text: `
Hola ${nombre},

No te hemos visto hace un tiempito en Nook.

Queremos recordarte que ya llevas ${sellosActuales} sello${sellosActuales === 1 ? "" : "s"}.

Te faltan solo ${sellosFaltantes} sello${sellosFaltantes === 1 ? "" : "s"} para conseguir tu helado gratis.

Tu tarjeta sigue esperándote en Nook Heladería de Autora.
Te esperamos en Tomás Moro 695, Local 4, Las Condes.

Revísala aquí:
${cardUrl}

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}