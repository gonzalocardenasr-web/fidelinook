import { resend } from "./resend";

export async function sendWelcomeEmail(email: string, nombre: string) {
  try {
    await resend.emails.send({
      from: "Nook Heladería de Autora <nookheladeria@nookheladeria.cl>",
      to: email,
      subject: "Bienvenido a Fideli-Nook 🍦",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Bienvenido ${nombre} 🍦</h2>
          
          <p>Ya eres parte de <strong>Fideli-Nook</strong>.</p>
          
          <p>Desde ahora podrás acumular sellos y ganar helados gratis.</p>

          <p><strong>¿Cómo funciona?</strong></p>
          <ul>
            <li>Tu primera compra ya tiene sellos 🎉</li>
            <li>Acumula hasta completar tu tarjeta</li>
            <li>¡Gana tu helado gratis!</li>
          </ul>

          <p>Nos vemos pronto,</p>

          <p>
          <strong>Nook Heladería de Autora</strong><br/>
          Helado artesanal premium en tu casa en menos de una hora 🍨
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error(error);
  }
}