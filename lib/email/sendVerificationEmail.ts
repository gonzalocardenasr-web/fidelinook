import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendVerificationEmail(
  email: string,
  nombre: string,
  token: string
) {
  const verifyUrl = `https://fidelidad.nookheladeria.cl/api/verify-email?token=${token}`;

  const html = baseTemplate({
    titulo: `Hola ${nombre}`,
    mensaje: `
      Gracias por registrarte en <strong>Fideli-NooK</strong>.<br/><br/>
      Para activar tu tarjeta digital, primero debes confirmar tu correo electrónico.<br/><br/>
      Te esperamos en <strong>Tomás Moro 695, Local 4, Las Condes</strong>.
    `,
    botonTexto: "Confirmar mi correo",
    botonUrl: verifyUrl,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirma tu correo para activar tu tarjeta Fideli-NooK",
    html,
    text: `
Hola ${nombre},

Gracias por registrarte en Fideli-NooK.

Para activar tu tarjeta digital, primero debes confirmar tu correo electrónico.

Confirma tu correo aquí:
${verifyUrl}

Te esperamos en Tomás Moro 695, Local 4, Las Condes.

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}