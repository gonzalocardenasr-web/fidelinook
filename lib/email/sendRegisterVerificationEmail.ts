import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendRegisterVerificationEmail(
  email: string,
  nombre: string,
  token: string
) {
  const verifyUrl = `https://fidelidad.nookheladeria.cl/api/register/verify?token=${token}`;

  const html = baseTemplate({
    titulo: `Hola ${nombre}`,
    mensaje: `
      Tu cuenta en <strong>Nook</strong> ya casi está lista.<br/><br/>
      Solo debes confirmar tu correo para comenzar a usar tu cuenta.
    `,
    botonTexto: "Confirmar mi cuenta",
    botonUrl: verifyUrl,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirma tu cuenta en Nook",
    html,
    text: `
Hola ${nombre},

Confirma tu cuenta aquí:
${verifyUrl}

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}