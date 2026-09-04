import { resend } from "./resend";
import { baseTemplate } from "./baseTemplate";

const FROM_EMAIL =
  "Nook Heladería de Autora <fidelizacion@fidelidad.nookheladeria.cl>";

export async function sendCampaignRewardAssignedEmail(
  email: string,
  nombrePremio: string,
  descripcion: string | null,
  vencimiento: string,
  publicToken: string,
  idempotencyKey: string,
) {
  const tarjetaUrl = `https://fidelidad.nookheladeria.cl/t/${publicToken}`;

  const vencimientoFormateado = new Date(vencimiento).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = baseTemplate({
    titulo: "🎁 Tienes un nuevo premio",
    mensaje: `
      Te asignamos un nuevo premio en <strong>Nook</strong>.<br/><br/>
      <strong>${nombrePremio}</strong><br/>
      ${descripcion || ""}<br/><br/>
      Válido hasta: ${vencimientoFormateado}
    `,
    botonTexto: "Ver mi tarjeta",
    botonUrl: tarjetaUrl,
  });

  const result = await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: email,
      subject: "🎁 Tienes un nuevo premio en Nook",
      html,
      text: `
Tienes un nuevo premio en Nook

${nombrePremio}

${descripcion || ""}

Válido hasta: ${vencimientoFormateado}

Ver mi tarjeta:
${tarjetaUrl}
      `,
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
