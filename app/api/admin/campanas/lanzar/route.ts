import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nombreInterno,
      premioNombre,
      premioDescripcion,
      duracionHoras,
      fechaLanzamiento,
      recurrencia,
      creadoPor,
    } = body;

    if (!nombreInterno || !premioNombre || !premioDescripcion || !duracionHoras || !fechaLanzamiento) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios para crear la campaña." },
        { status: 400 }
      );
    }

    const duracion = Number(duracionHoras);

    if (!Number.isFinite(duracion) || duracion < 24 || duracion % 24 !== 0) {
      return NextResponse.json(
        { message: "La duración debe ser un múltiplo de 24 horas." },
        { status: 400 }
      );
    }

    const fecha = new Date(fechaLanzamiento);

    if (Number.isNaN(fecha.getTime())) {
      return NextResponse.json(
        { message: "La fecha de lanzamiento no es válida." },
        { status: 400 }
      );
    }

    const recurrenciaFinal = recurrencia === "semanal" ? "semanal" : "una_vez";
    const ahora = new Date();
    const estadoInicial = fecha <= ahora ? "lanzada" : "programada";

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .insert({
        nombre_interno: nombreInterno,
        premio_nombre: premioNombre,
        premio_descripcion: premioDescripcion,
        duracion_horas: duracion,
        fecha_lanzamiento: fecha.toISOString(),
        recurrencia: recurrenciaFinal,
        estado: estadoInicial,
        creado_por: creadoPor || "superadmin",
        launched_at: estadoInicial === "lanzada" ? ahora.toISOString() : null,
      })
      .select()
      .single();

    if (campanaError || !campana) {
      console.error("Error creando campaña:", campanaError);
      return NextResponse.json(
        { message: "No se pudo crear la campaña." },
        { status: 500 }
      );
    }

    if (estadoInicial === "programada") {
      return NextResponse.json({
        ok: true,
        message: "Campaña programada correctamente.",
        campana,
      });
    }

    const resultado = await aplicarCampana(campana.id, duracion);

    return NextResponse.json({
      ok: true,
      message: "Campaña lanzada correctamente.",
      campana,
      resultado,
    });
  } catch (error) {
    console.error("Error en /api/admin/campanas/lanzar:", error);
    return NextResponse.json(
      { message: "Ocurrió un error al lanzar la campaña." },
      { status: 500 }
    );
  }
}

async function aplicarCampana(campanaId: number, duracionHoras: number) {
  const { data: campana, error: campanaError } = await supabaseAdmin
    .from("campanas")
    .select("*")
    .eq("id", campanaId)
    .single();

  if (campanaError || !campana) {
    throw new Error("No se encontró la campaña.");
  }

  const { data: clientes, error: clientesError } = await supabaseAdmin
    .from("clientes")
    .select("id, premios, acepta_marketing, marketing_preferencia_definida")
    .or("acepta_marketing.eq.true,marketing_preferencia_definida.eq.false");

  if (clientesError) {
    throw clientesError;
  }

  const clientesObjetivo = clientes || [];
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
    tipo: "campana",
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
        console.error(
        "Error creando trazabilidad de campaña:",
        cliente.id,
        trackingError
        );
    }

    totalAplicados += 1;
    } else {
    console.error("Error aplicando premio a cliente:", cliente.id, updateError);
    }
  }

  const { error: updateCampanaError } = await supabaseAdmin
    .from("campanas")
    .update({
      estado: "lanzada",
      launched_at: new Date().toISOString(),
      total_objetivo: clientesObjetivo.length,
      total_enviados: totalAplicados,
    })
    .eq("id", campana.id);

  if (updateCampanaError) {
    console.error("Error actualizando campaña:", updateCampanaError);
  }

  return {
    totalObjetivo: clientesObjetivo.length,
    totalAplicados,
  };
}