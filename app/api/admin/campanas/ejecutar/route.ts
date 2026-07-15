import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "../../../../../lib/customer-events";

type LegacyReward = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: "activo";
  tipo: "campana" | "campana_prueba";
  campana_id: number;
  vencimiento: string;
  creado_en: string;
};

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const campanaId = Number(body.campanaId);
    const clienteCorreoPrueba = String(body.clienteCorreoPrueba || "")
      .trim()
      .toLowerCase();

    const esPrueba = Boolean(clienteCorreoPrueba);

    if (!Number.isInteger(campanaId) || campanaId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Falta un ID de campaña válido." },
        { status: 400 },
      );
    }

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .select(
        `
          id,
          estado,
          duracion_horas
        `,
      )
      .eq("id", campanaId)
      .single();

    if (campanaError || !campana) {
      return NextResponse.json(
        { ok: false, message: "No se encontró la campaña." },
        { status: 404 },
      );
    }

    if (
      esPrueba &&
      !["borrador", "programada", "fallida"].includes(campana.estado)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Solo se pueden probar campañas en estado borrador, programada o fallida.",
        },
        { status: 400 },
      );
    }

    if (!esPrueba && !["programada", "fallida"].includes(campana.estado)) {
      return NextResponse.json(
        {
          ok: false,
          message: "La campaña ya fue ejecutada o no está disponible.",
        },
        { status: 400 },
      );
    }

    const resultado = await aplicarCampana({
      campanaId: campana.id,
      duracionHoras: Number(campana.duracion_horas),
      clienteCorreoPrueba: esPrueba ? clienteCorreoPrueba : undefined,
      actorRole: session.role,
    });

    return NextResponse.json({
      ok: true,
      message: esPrueba
        ? "Prueba de campaña ejecutada correctamente."
        : "Campaña ejecutada correctamente.",
      resultado,
    });
  } catch (error) {
    console.error("Error ejecutando campaña:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al ejecutar la campaña.",
      },
      { status: 500 },
    );
  }
}

async function aplicarCampana({
  campanaId,
  duracionHoras,
  clienteCorreoPrueba,
  actorRole,
}: {
  campanaId: number;
  duracionHoras: number;
  clienteCorreoPrueba?: string;
  actorRole?: string | null;
}) {
  const esPrueba = Boolean(clienteCorreoPrueba);

  const { data: campana, error: campanaError } = await supabaseAdmin
    .from("campanas")
    .select(
      `
        id,
        estado,
        premio_nombre,
        premio_descripcion,
        duracion_horas
      `,
    )
    .eq("id", campanaId)
    .single();

  if (campanaError || !campana) {
    throw new Error("No se encontró la campaña.");
  }

  if (!esPrueba) {
    const { error: launchingError } = await supabaseAdmin
      .from("campanas")
      .update({
        estado: "lanzando",
        error_message: null,
      })
      .eq("id", campana.id);

    if (launchingError) {
      throw new Error("No se pudo marcar la campaña como en ejecución.");
    }
  }

  try {
    let clientesQuery = supabaseAdmin.from("clientes").select(
      `
        id,
        correo,
        premios,
        acepta_marketing,
        marketing_preferencia_definida
      `,
    );

    if (esPrueba) {
      clientesQuery = clientesQuery.eq("correo", clienteCorreoPrueba!).limit(1);
    } else {
      clientesQuery = clientesQuery.or(
        "acepta_marketing.eq.true,marketing_preferencia_definida.eq.false",
      );
    }

    const { data: clientes, error: clientesError } = await clientesQuery;

    if (clientesError) {
      throw clientesError;
    }

    const clientesObjetivo = clientes || [];

    if (esPrueba && clientesObjetivo.length === 0) {
      throw new Error(
        "No se encontró un cliente con el correo de prueba indicado.",
      );
    }

    let totalElegibles = 0;
    let totalAplicados = 0;
    let totalErrores = 0;

    const fechaAsignacion = new Date();
    const fechaExpiracion = new Date(fechaAsignacion);

    fechaExpiracion.setHours(fechaExpiracion.getHours() + duracionHoras);

    for (const cliente of clientesObjetivo) {
      const premiosAnteriores = Array.isArray(cliente.premios)
        ? [...cliente.premios]
        : [];

      const yaTieneCampana = premiosAnteriores.some(
        (premio: any) => Number(premio?.campana_id) === Number(campana.id),
      );

      if (yaTieneCampana) {
        continue;
      }

      totalElegibles += 1;

      const premioId = crypto.randomUUID();

      const nuevoPremio: LegacyReward = {
        id: premioId,
        nombre: campana.premio_nombre,
        descripcion: campana.premio_descripcion || null,
        estado: "activo",
        tipo: esPrueba ? "campana_prueba" : "campana",
        campana_id: campana.id,
        vencimiento: fechaExpiracion.toISOString(),
        creado_en: fechaAsignacion.toISOString(),
      };

      const premiosActualizados = [...premiosAnteriores, nuevoPremio];

      /*
       * 1. Mantenemos actualizado el modelo legado, porque todavía
       *    es utilizado por la tarjeta pública y la operación actual.
       */
      const { error: updateCustomerError } = await supabaseAdmin
        .from("clientes")
        .update({
          premios: premiosActualizados,
        })
        .eq("id", cliente.id);

      if (updateCustomerError) {
        console.error(
          "Error asignando premio al cliente:",
          cliente.id,
          updateCustomerError,
        );

        totalErrores += 1;
        continue;
      }

      /*
       * 2. Registramos el tracking operacional antes de emitir
       *    el evento y antes de enviar el correo.
       */
      const { data: campaignTracking, error: trackingError } =
        await supabaseAdmin
          .from("campana_clientes")
          .insert({
            campana_id: campana.id,
            cliente_id: cliente.id,
            premio_id: premioId,
            estado: "asignado",
            asignado_at: fechaAsignacion.toISOString(),
            vencimiento: fechaExpiracion.toISOString(),
            email_enviado: false,
          })
          .select("id, asignado_at")
          .single();

      if (trackingError || !campaignTracking) {
        console.error(
          "Error registrando tracking de campaña:",
          cliente.id,
          trackingError,
        );

        await revertirPremioLegado(cliente.id, premiosAnteriores);

        totalErrores += 1;
        continue;
      }

      /*
       * 3. Emitimos el hecho de negocio en el Event Bus.
       */
      try {
        await recordCustomerEvent({
          customerId: cliente.id,
          eventType: "campaign.reward_assigned",
          sourceModule: "campaigns",
          sourceEntityType: "campaign_customer",
          sourceEntityId: campaignTracking.id,
          actorRole,
          occurredAt: campaignTracking.asignado_at || fechaAsignacion,
          idempotencyKey: buildCustomerEventIdempotencyKey([
            "campaign-reward-assigned",
            campaignTracking.id,
          ]),
          metadata: {
            campaignId: campana.id,
            campaignTrackingId: campaignTracking.id,
            legacyRewardId: premioId,
            rewardName: campana.premio_nombre,
            rewardDescription: campana.premio_descripcion || null,
            expiresAt: fechaExpiracion.toISOString(),
            testMode: esPrueba,
          },
        });
      } catch (eventError) {
        console.error(
          "Premio asignado, pero falló su evento:",
          cliente.id,
          eventError,
        );

        await supabaseAdmin
          .from("campana_clientes")
          .delete()
          .eq("id", campaignTracking.id);

        await revertirPremioLegado(cliente.id, premiosAnteriores);

        totalErrores += 1;
        continue;
      }

      /*
       * 4. El correo es un efecto posterior. Su falla no elimina
       *    el premio ni el evento, porque el hecho ya ocurrió.
       */
      let emailEnviado = false;

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");

        if (!baseUrl) {
          console.error("NEXT_PUBLIC_BASE_URL no está configurada.");
        } else {
          const emailResponse = await fetch(
            `${baseUrl}/api/send-campana-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: cliente.correo,
                nombrePremio: campana.premio_nombre,
                descripcion: campana.premio_descripcion,
                vencimiento: fechaExpiracion.toISOString(),
              }),
            },
          );

          emailEnviado = emailResponse.ok;
        }
      } catch (emailError) {
        console.error(
          "Error enviando correo de campaña:",
          cliente.id,
          emailError,
        );
      }

      const { error: emailTrackingError } = await supabaseAdmin
        .from("campana_clientes")
        .update({
          email_enviado: emailEnviado,
        })
        .eq("id", campaignTracking.id);

      if (emailTrackingError) {
        console.error(
          "Error actualizando estado del correo:",
          cliente.id,
          emailTrackingError,
        );
      }

      totalAplicados += 1;
    }

    if (!esPrueba) {
      const finalStatus =
        totalErrores > 0 && totalAplicados === 0 ? "fallida" : "lanzada";

      const { error: finalCampaignError } = await supabaseAdmin
        .from("campanas")
        .update({
          estado: finalStatus,
          launched_at: new Date().toISOString(),
          total_objetivo: totalElegibles,
          total_enviados: totalAplicados,
          error_message:
            totalErrores > 0
              ? `${totalErrores} asignación(es) no pudieron completarse.`
              : null,
        })
        .eq("id", campana.id);

      if (finalCampaignError) {
        throw new Error(
          "La campaña terminó, pero no se pudo actualizar su resumen.",
        );
      }
    }

    return {
      modoPrueba: esPrueba,
      totalObjetivo: totalElegibles,
      totalAplicados,
      totalErrores,
    };
  } catch (error) {
    if (!esPrueba) {
      await supabaseAdmin
        .from("campanas")
        .update({
          estado: "fallida",
          error_message:
            error instanceof Error ? error.message : "Error en ejecución",
        })
        .eq("id", campana.id);
    }

    throw error;
  }
}

async function revertirPremioLegado(
  clienteId: number,
  premiosAnteriores: unknown[],
) {
  const { error } = await supabaseAdmin
    .from("clientes")
    .update({
      premios: premiosAnteriores,
    })
    .eq("id", clienteId);

  if (error) {
    console.error(
      "No se pudo revertir el premio legado del cliente:",
      clienteId,
      error,
    );
  }
}
