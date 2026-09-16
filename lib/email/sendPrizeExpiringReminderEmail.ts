import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendPrizeExpiringReminderEmail(
  email: string,
  nombre: string,
  premioNombre: string,
  vencimiento: string,
  publicToken: string,
  reminderDays: number,
  idempotencyKey: string,
) {
  if (reminderDays !== 5 && reminderDays !== 1) {
    throw new Error("reminderDays must be 5 or 1");
  }

  const cardUrl = `https://fidelidad.nookheladeria.cl/t/${publicToken}`;
  const expirationDate = new Date(vencimiento).toLocaleDateString("es-CL");

  const isLastReminder = reminderDays === 1;

  const subject = isLastReminder
    ? "Tu premio Fideli-NooK vence mañana"
    : "Tienes un premio Fideli-NooK por usar";

  const message = isLastReminder
    ? `
      Tu premio <strong>${premioNombre}</strong> vence mañana.<br/><br/>
      Fecha de vencimiento: <strong>${expirationDate}</strong>.<br/><br/>
      Revísalo en tu tarjeta digital y úsalo antes de que expire.
    `
    : `
      Recuerda que tienes disponible tu premio <strong>${premioNombre}</strong>.<br/><br/>
      Te quedan 5 días para usarlo. Fecha de vencimiento: <strong>${expirationDate}</strong>.<br/><br/>
      Revísalo en tu tarjeta digital y disfruta tu premio antes de que expire.
    `;

  const text = isLastReminder
    ? `
Hola ${nombre},

Tu premio ${premioNombre} vence mañana.

Fecha de vencimiento: ${expirationDate}.

Revísalo aquí:
${cardUrl}

Nook Heladería de Autora
    `
    : `
Hola ${nombre},

Recuerda que tienes disponible tu premio ${premioNombre}.

Te quedan 5 días para usarlo. Fecha de vencimiento: ${expirationDate}.

Revísalo aquí:
${cardUrl}

Nook Heladería de Autora
    `;

  const html = baseTemplate({
    titulo: isLastReminder
      ? `¡${nombre}, tu premio vence mañana!`
      : `Hola ${nombre}`,
    mensaje: message,
    botonTexto: "Ver mi tarjeta",
    botonUrl: cardUrl,
  });

  const result = await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      text,
    },
    {
      idempotencyKey,
    },
  );

  if (result.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }

  return result;
}
