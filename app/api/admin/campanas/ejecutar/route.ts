import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { campanaId, clienteCorreoPrueba } = await req.json();

    if (!campanaId) {
      return NextResponse.json(
        { message: "Falta el ID de la campaña." },
        { status: 400 }
      );
    }

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .select("*")
      .eq("id", campanaId)
      .single();

    if (campanaError || !campana) {
      return NextResponse.json(
        { message: "No se encontró la campaña." },
        { status: 404 }
      );
    }

    if (!["programada", "fallida"].includes(campana.estado)) {
      return NextResponse.json(
        { message: "Solo se pueden ejecutar campañas programadas o fallidas." },
        { status: 400 }
      );
    }

    const resultado = await aplicarCampana(
        campana.id,
        campana.duracion_horas,
        clienteCorreoPrueba
    );

    return NextResponse.json({
      ok: true,
      message: "Campaña ejecutada correctamente.",
      resultado,
    });
  } catch (error) {
    console.error("Error ejecutando campaña:", error);
    return NextResponse.json(
      { message: "Ocurrió un error al ejecutar la campaña." },
      { status: 500 }
    );
  }
}

async function aplicarCampana(
  campanaId: number,
  duracionHoras: number,
  clienteCorreoPrueba?: string
) {
  const { data: campana, error: campanaError } = await supabaseAdmin
    .from("campanas")
    .select("*")
    .eq("id", campanaId)
    .single();

  if (campanaError || !campana) {
    throw new Error("No se encontró la campaña.");
  }

  await supabaseAdmin
    .from("campanas")
    .update({
      estado: "lanzando",
      error_message: null,
    })
    .eq("id", campana.id);

  const esPrueba = Boolean(clienteCorreoPrueba?.trim());

    const queryClientes = supabaseAdmin
    .from("clientes")
    .select("id, correo, premios, acepta_marketing, marketing_preferencia_definida");

    const { data: clientes, error: clientesError } = esPrueba
    ? await queryClientes
        .eq("correo", clienteCorreoPrueba.trim().toLowerCase())
        .limit(1)
    : await queryClientes.or(
        "acepta_marketing.eq.true,marketing_preferencia_definida.eq.false"
        );

  if (clientesError) {
    await supabaseAdmin
      .from("campanas")
      .update({
        estado: "fallida",
        error_message: "No se pudieron obtener clientes objetivo.",
      })
      .eq("id", campana.id);

    throw clientesError;
  }

  const clientesObjetivo = clientes || [];

  if (esPrueba && clientesObjetivo.length === 0) {
    throw new Error("No se encontró un cliente con el correo de prueba indicado.");
  }

  const fechaExpiracion = new Date();
  fechaExpiracion.setHours(fechaExpiracion.getHours() + duracionHoras);

  let totalAplicados = 0;

  for (const cliente of clientesObjetivo) {
    const premiosActuales = Array.isArray(cliente.premios)
      ? [...cliente.premios]
      : [];

    const yaTieneCampana = premiosActuales.some(
      (premio: any) => premio.campana_id === campana.id
    );

    if (yaTieneCampana) continue;

    const premioId = crypto.randomUUID();

    premiosActuales.push({
        id: premioId,
        nombre: campana.premio_nombre,
        descripcion: campana.premio_descripcion,
        estado: "activo",
        tipo: esPrueba ? "campana_prueba" : "campana",
        campana_id: campana.id,
        vencimiento: fechaExpiracion.toISOString(),
        creado_en: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseAdmin
      .from("clientes")
      .update({ premios: premiosActuales })
      .eq("id", cliente.id);

    if (!updateError) {
      const { error: trackingError } = await supabaseAdmin
        .from("campana_clientes")
        .insert({
          campana_id: campana.id,
          cliente_id: cliente.id,
          premio_id: premioId,
          estado: "asignado",
          asignado_at: new Date().toISOString(),
          vencimiento: fechaExpiracion.toISOString(),
          email_enviado: false,
        });

      if (trackingError) {
        console.error("Error creando trazabilidad:", cliente.id, trackingError);
      }

      totalAplicados += 1;
    } else {
      console.error("Error aplicando premio a cliente:", cliente.id, updateError);
    }
  }

  if (!esPrueba) {
    const { error: updateCampanaError } = await supabaseAdmin
        .from("campanas")
        .update({
        estado: "lanzada",
        launched_at: new Date().toISOString(),
        total_objetivo: clientesObjetivo.length,
        total_enviados: totalAplicados,
        error_message: null,
        })
        .eq("id", campana.id);

    if (updateCampanaError) {
        throw updateCampanaError;
    }
  }

    return {
        modoPrueba: esPrueba,
        totalObjetivo: clientesObjetivo.length,
        totalAplicados,
    };
}