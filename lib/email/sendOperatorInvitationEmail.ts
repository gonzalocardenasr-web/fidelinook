import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendOperatorInvitationEmail(
  email: string,
  displayName: string,
  activationUrl: string,
  idempotencyKey: string,
) {
  const html = baseTemplate({
    titulo: "Activa tu acceso a Plataforma Nook",
    mensaje: `
      Hola <strong>${displayName}</strong>.<br/><br/>
      Se creó un acceso para ti en <strong>Plataforma Nook</strong>.<br/><br/>
      Haz clic en el botón para definir tu contraseña y activar tu acceso.
    `,
    botonTexto: "Activar mi acceso",
    botonUrl: activationUrl,
  });

  const result = await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: email,
      subject: "Activa tu acceso a Plataforma Nook",
      html,
      text: `
Hola ${displayName}.

Se creó un acceso para ti en Plataforma Nook.

Define tu contraseña aquí:
${activationUrl}

Nook Heladería de Autora
      `,
    },
    {
      idempotencyKey,
    },
  );

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}
