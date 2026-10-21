import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "@/lib/customer-events";

export async function reconcileCampaignEvents({
  campanaId,
  actorRole = "system",
}: {
  campanaId: number;
  actorRole?: string | null;
}) {
  if (!Number.isInteger(campanaId) || campanaId <= 0) {
    throw new Error("El identificador de campaña no es válido.");
  }

  // Las campañas 14-19 son históricas y quedan fuera de esta reconciliación.
  if (campanaId >= 14 && campanaId <= 19) {
    throw new Error(
      "Esta campaña es histórica y requiere una migración de eventos independiente.",
    );
  }

  const { data: campana, error: campanaError } = await supabaseAdmin
    .from("campanas")
    .select("id, premio_nombre, premio_descripcion")
    .eq("id", campanaId)
    .single();

  if (campanaError || !campana) {
    throw new Error("No se encontró la campaña para reconciliación.");
  }

  let revisados = 0;
  let recuperados = 0;
  let existentes = 0;
  let errores = 0;
  let desde = 0;
  const tamanoPagina = 500;

  while (true) {
    const { data: asignaciones, error: asignacionesError } =
      await supabaseAdmin
        .from("campana_clientes")
        .select(
          "id, cliente_id, premio_id, asignado_at, vencimiento, estado",
        )
        .eq("campana_id", campanaId)
        .order("id", { ascending: true })
        .range(desde, desde + tamanoPagina - 1);

    if (asignacionesError) {
      throw new Error(
        `No se pudieron consultar las asignaciones: ${asignacionesError.message}`,
      );
    }

    const pagina = asignaciones || [];

    for (const asignacion of pagina) {
      revisados += 1;

      const idempotencyKey = buildCustomerEventIdempotencyKey([
        "campaign-reward-assigned",
        asignacion.id,
      ]);

      try {
        const resultado = await recordCustomerEvent({
          customerId: asignacion.cliente_id,
          eventType: "campaign.reward_assigned",
          sourceModule: "campaigns",
          sourceEntityType: "campaign_customer",
          sourceEntityId: asignacion.id,
          actorRole,
          occurredAt: asignacion.asignado_at,
          idempotencyKey,
          metadata: {
            campaignId: campanaId,
            campaignTrackingId: asignacion.id,
            legacyRewardId: asignacion.premio_id,
            rewardName: campana.premio_nombre,
            rewardDescription: campana.premio_descripcion || null,
            expiresAt: asignacion.vencimiento,
          },
        });

        if (resultado.created) {
          recuperados += 1;
        } else {
          existentes += 1;
        }
      } catch (error) {
        errores += 1;
        console.error(
          "Error reconciliando evento de campaña:",
          asignacion.id,
          error,
        );
      }
    }

    if (pagina.length < tamanoPagina) {
      break;
    }

    desde += tamanoPagina;
  }

  return {
    campanaId,
    revisados,
    recuperados,
    existentes,
    errores,
  };
}