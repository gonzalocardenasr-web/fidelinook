import { resend } from "./resend";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendVerificationEmail(
  email: string,
  nombre: string,
  token: string
) {
  const verifyUrl = `https://fidelidad.nookheladeria.cl/verificar?token=${token}`;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirma tu correo para activar tu tarjeta Fideli-Nook 🍦",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Hola ${nombre} 🍦</h2>

        <p>
          Gracias por registrarte en <strong>Fideli-Nook</strong>.
        </p>

        <p>
          Para activar tu tarjeta digital, primero debes confirmar tu correo electrónico.
        </p>

        <p style="margin: 30px 0;">
          <a
            href="${verifyUrl}"
            style="
              background-color: #4A3B2F;
              color: #ffffff;
              padding: 12px 20px;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              font-weight: bold;
            "
          >
            Confirmar mi correo
          </a>
        </p>

        <p>
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>

        <p>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>

        <hr style="margin: 20px 0;" />

        <p>
          <strong>Nook Heladería de Autora</strong><br/>
          Helado artesanal premium en tu casa en menos de una hora
        </p>
      </div>
    `,
    text: `
Hola ${nombre},

Gracias por registrarte en Fideli-Nook.

Para activar tu tarjeta digital, primero debes confirmar tu correo electrónico.

Confirma tu correo aquí:
${verifyUrl}

Nook Heladería de Autora
Helado artesanal premium en tu casa en menos de una hora
    `,
  });

  console.log("Respuesta de Resend en sendVerificationEmail:", result);

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}