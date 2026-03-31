import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendCardActivatedEmail(email: string, nombre: string) {
  const html = baseTemplate({
    titulo: `¡Hola ${nombre}!`,
    mensaje: `
      Tu tarjeta de <strong>Fideli-NooK</strong> ya está activa.<br/><br/>
      Desde ahora puedes comenzar a acumular sellos con tus compras presenciales en Nook.<br/><br/>
      <strong>¿Cómo funciona?</strong><br/>
      • Acumulas sellos en cada compra presencial<br/>
      • Completa tu ciclo<br/>
      • Obtén tu premio automáticamente 🍦<br/><br/>
      Te esperamos en <strong>Tomás Moro 695, Local 4, Las Condes</strong>.
    `,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Tu tarjeta Fideli-NooK ya está activa",
    html,
    text: `
Hola ${nombre},

Tu tarjeta de Fideli-NooK ya está activa.

Desde ahora puedes comenzar a acumular sellos con tus compras presenciales en Nook.

¿Cómo funciona?
- Acumulas sellos en cada compra presencial
- Completa tu ciclo
- Obtén tu premio automáticamente

Te esperamos en Tomás Moro 695, Local 4, Las Condes.

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}