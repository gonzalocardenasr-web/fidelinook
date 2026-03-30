import { resend } from "./resend";

export async function sendPrizeEmail(
  email: string,
  nombre: string,
  premioNombre: string,
  vencimiento?: string
) {
  try {
    await resend.emails.send({
      from: "Nook Heladería de Autora <nookheladeria@nookheladeria.cl>",
      to: email,
      subject: "🎉 ¡Ganaste un helado gratis en Nook!",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>¡Felicitaciones ${nombre}! 🎉</h2>

          <p>
            Completaste tu tarjeta en <strong>Fideli-Nook</strong> y ya tienes un premio disponible.
          </p>

          <p>
            <strong>Premio:</strong> ${premioNombre}
          </p>

          <p>
            <strong>Vencimiento:</strong> ${vencimiento || "Sin definir"}
          </p>

          <hr style="margin: 20px 0;" />

          <p>
            Muéstralo en el local para canjearlo.
          </p>

          <p>
            Gracias por elegir <strong>Nook Heladería de Autora</strong> 🍨
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error enviando correo de premio:", error);
  }
}