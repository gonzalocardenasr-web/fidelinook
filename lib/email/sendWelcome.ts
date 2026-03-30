import { resend } from "./resend";

export async function sendWelcomeEmail(email: string, nombre: string) {
  try {
    await resend.emails.send({
      from: "Nook Heladería de Autora <nookheladeria@nookheladeria.cl>",
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
            Nos vemos pronto 🍨
          </p>

          <p>
            <strong>Nook Heladería de Autora</strong><br/>
            Helado artesanal premium en tu casa en menos de una hora
          </p>

        </div>
      `,
    });
  } catch (error) {
    console.error("Error enviando correo de bienvenida:", error);
  }
}