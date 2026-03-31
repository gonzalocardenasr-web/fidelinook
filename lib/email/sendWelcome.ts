import { resend } from "./resend";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendWelcomeEmail(email: string, nombre: string) {
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Bienvenido a Fideli-Nook 🍦",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        
        <h2>¡Bienvenido ${nombre}! 🍦</h2>
        
        <p>
          Ya eres parte de <strong>Fideli-Nook</strong>, el programa de fidelización de 
          <strong>Nook Heladería de Autora</strong>.
        </p>

        <p>
          Desde ahora podrás acumular sellos y ganar helados gratis.
        </p>

        <hr style="margin: 20px 0;" />

        <h3>¿Cómo funciona?</h3>

        <ul>
          <li>Acumula sellos en cada compra</li>
          <li>Completa tu tarjeta</li>
          <li>¡Gana tu helado gratis! 🎉</li>
        </ul>

        <hr style="margin: 20px 0;" />

        <p>
          Nos vemos pronto en Tomás Moro 695, Local 4, Las Condes 🍨
        </p>

        <p>
          <strong>Nook Heladería de Autora</strong><br/>
          Helado artesanal premium en tu casa en menos de una hora
        </p>

      </div>
    `,
  });

  console.log("Respuesta de Resend en sendWelcomeEmail:", result);

  if (result.error) {
    throw new Error(
      `Resend error: ${JSON.stringify(result.error)}`
    );
  }

  return result;
}