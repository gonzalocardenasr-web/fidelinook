import { resend } from "./resend";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendCardActivatedEmail(email: string, nombre: string) {
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Tu tarjeta Fideli-Nook ya está activa 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>¡Hola ${nombre}! 🎉</h2>

        <p>
          Tu tarjeta de <strong>Fideli-Nook</strong> ya está activa.
        </p>

        <p>
          Desde ahora puedes comenzar a acumular sellos con tus compras presenciales en Nook.
        </p>

        <h3>¿Cómo funciona?</h3>

        <ul>
          <li>Acumulas sellos en cada compra presencial</li>
          <li>Completa tu ciclo</li>
          <li>Obtén tu premio automáticamente 🍦</li>
        </ul>

        <p>
          Te esperamos en <strong>Tomás Moro 695, Local 4</strong>.
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

Tu tarjeta de Fideli-Nook ya está activa.

Desde ahora puedes comenzar a acumular sellos con tus compras presenciales en Nook.

¿Cómo funciona?
- Acumulas sellos en cada compra presencial
- Completa tu ciclo
- Obtén tu premio automáticamente

Te esperamos en Tomás Moro 695, Local 4.

Nook Heladería de Autora
Helado artesanal premium en tu casa en menos de una hora
    `,
  });

  console.log("Respuesta de Resend en sendCardActivatedEmail:", result);

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}