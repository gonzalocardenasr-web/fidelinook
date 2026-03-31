import { resend } from "./resend";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendStampEmail(
  email: string,
  nombre: string,
  sellosActuales: number,
  metaSellos: number
) {
  try {
    const sellosRestantes = Math.max(metaSellos - sellosActuales, 0);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "¡Sumaste un nuevo sello en Nook! 🍦",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>¡Hola ${nombre}! 🍦</h2>

          <p>
            Acabas de sumar un nuevo sello en <strong>Fideli-Nook</strong>.
          </p>

          <p>
            Actualmente tienes <strong>${sellosActuales} de ${metaSellos} sellos</strong>.
          </p>

          <p>
            Te faltan <strong>${sellosRestantes}</strong> para ganar tu premio.
          </p>

          <hr style="margin: 20px 0;" />

          <p>
            Gracias por elegir <strong>Nook Heladería de Autora</strong>.
          </p>

          <p>
            Nos vemos pronto en Tomás Moro 695, Local 4, Las Condes 🍨
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error enviando correo de sello:", error);
  }
}