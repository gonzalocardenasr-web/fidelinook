import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendPrizeEmail(
  email: string,
  nombre: string,
  premioNombre: string,
  vencimiento?: string
) {
  try {
    const html = baseTemplate({
      titulo: `¡Felicitaciones ${nombre}! 🎉`,
      mensaje: `
        Completaste tu tarjeta en <strong>Fideli-NooK</strong> y ya tienes un premio disponible.<br/><br/>
        
        <strong>Premio:</strong> ${premioNombre}<br/>
        <strong>Vencimiento:</strong> ${vencimiento || "Sin definir"}<br/><br/>
        
        Muéstralo en nuestro local para canjearlo.<br/><br/>
        
        Te esperamos en <strong>Tomás Moro 695, Local 4, Las Condes</strong> 🍨
      `,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "¡Ganaste un helado gratis en Nook! 🎉",
      html,
      text: `
Hola ${nombre}

Completaste tu tarjeta en Fideli-NooK y ya tienes un premio disponible.

Premio: ${premioNombre}
Vencimiento: ${vencimiento || "Sin definir"}

Puedes canjearlo en Tomás Moro 695, Local 4, Las Condes

Nook Heladería de Autora
      `,
    });
  } catch (error) {
    console.error("Error enviando correo de premio:", error);
  }
}