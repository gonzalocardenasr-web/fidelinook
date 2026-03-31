import { resend } from "./resend";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendRewardRedeemedEmail(
  email: string,
  nombre: string,
  premioNombre: string
) {
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Tu premio Fideli-Nook fue canjeado correctamente 🍦",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>¡Hola ${nombre}! 🍦</h2>

        <p>
          Confirmamos que tu premio de <strong>Fideli-Nook</strong> fue canjeado correctamente.
        </p>

        <p>
          <strong>Premio canjeado:</strong> ${premioNombre}
        </p>

        <p>
          Gracias por visitarnos. Te esperamos pronto para que sigas acumulando sellos.
        </p>

        <p>
          <strong>Nook Heladería de Autora</strong><br/>
          Tomás Moro 695, Local 4
        </p>
      </div>
    `,
    text: `
Hola ${nombre},

Confirmamos que tu premio de Fideli-Nook fue canjeado correctamente.

Premio canjeado: ${premioNombre}

Gracias por visitarnos. Te esperamos pronto para que sigas acumulando sellos.

Nook Heladería de Autora
Tomás Moro 695, Local 4
    `,
  });

  console.log("Respuesta de Resend en sendRewardRedeemedEmail:", result);

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}