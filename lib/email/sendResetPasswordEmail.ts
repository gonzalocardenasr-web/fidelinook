import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendResetPasswordEmail(
  email: string,
  resetUrl: string
) {
  const html = baseTemplate({
    titulo: "Restablece tu contraseña",
    mensaje: `
      Recibimos una solicitud para cambiar la contraseña de tu cuenta en <strong>Nook</strong>.<br/><br/>
      Haz clic en el botón para definir una nueva contraseña.<br/><br/>
      Si no solicitaste este cambio, puedes ignorar este correo.
    `,
    botonTexto: "Restablecer contraseña",
    botonUrl: resetUrl,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Restablece tu contraseña en Nook",
    html,
    text: `
Recibimos una solicitud para cambiar la contraseña de tu cuenta en Nook.

Restablece tu contraseña aquí:
${resetUrl}

Si no solicitaste este cambio, puedes ignorar este correo.

Nook Heladería de Autora
    `,
  });

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}