import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

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

    const html = baseTemplate({
      titulo: `¡Hola ${nombre}! 🍦`,
      mensaje: `
        Acabas de sumar un nuevo sello en <strong>Fideli-NooK</strong>.<br/><br/>
        
        Actualmente tienes <strong>${sellosActuales} de ${metaSellos} sellos</strong>.<br/><br/>
        
        Te faltan <strong>${sellosRestantes}</strong> para ganar tu premio.<br/><br/>
        
        Gracias por elegir <strong>Nook Heladería de Autora</strong>.<br/><br/>
        
        Te esperamos en <strong>Tomás Moro 695, Local 4, Las Condes</strong> 🍨
      `,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "¡Sumaste un nuevo sello en Nook! 🍦",
      html,
      text: `
Hola ${nombre}

Acabas de sumar un nuevo sello en Fideli-NooK.

Actualmente tienes ${sellosActuales} de ${metaSellos} sellos.

Te faltan ${sellosRestantes} para ganar tu premio.

Te esperamos en Tomás Moro 695, Local 4, Las Condes

Nook Heladería de Autora
      `,
    });
  } catch (error) {
    console.error("Error enviando correo de sello:", error);
  }
}