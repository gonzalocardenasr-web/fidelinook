import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { campanaId, clienteCorreoPrueba } = await req.json();

    const esPrueba = Boolean(clienteCorreoPrueba?.trim());

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

    if (
        esPrueba &&
        !["borrador", "programada", "fallida"].includes(campana.estado)
    ) {
        return NextResponse.json(
            { message: "Solo se pueden probar campañas en estado borrador, programada o fallida." },
            { status: 400 }
        );
    }

    if (
        !esPrueba &&
        !["programada", "fallida"].includes(campana.estado)
    ) {
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

  const esPrueba = Boolean(clienteCorreoPrueba?.trim());
  const { data: campana, error: campanaError } = await supabaseAdmin
    .from("campanas")
    .select("*")
    .eq("id", campanaId)
    .single();

  if (campanaError || !campana) {
    throw new Error("No se encontró la campaña.");
  }

  if (!esPrueba) {
  await supabaseAdmin
    .from("campanas")
    .update({
      estado: "lanzando",
      error_message: null,
    })
    .eq("id", campana.id);
}

try {

  const queryClientes = supabaseAdmin
    .from("clientes")
    .select("id, correo, premios, acepta_marketing, marketing_preferencia_definida");

  const { data: clientes, error: clientesError } = esPrueba
    ? await queryClientes
        .eq("correo", clienteCorreoPrueba.trim().toLowerCase())
        .limit(1)
    : await queryClientes.or(
        "acepta_marketing.eq.true,marketing_preferencia_definida.is.null"
      );

  if (clientesError) throw clientesError;

  const clientesObjetivo = clientes || [];
  let totalElegibles = 0;

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

    totalElegibles += 1;

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
      
      console.log("Intentando enviar correo campaña a:", cliente.correo);
        console.log("BASE URL:", process.env.NEXT_PUBLIC_BASE_URL);

        const emailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/send-campana-email`,
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
        }
        );

        console.log("Respuesta correo campaña status:", emailResponse.status);

        const emailResult = await emailResponse.json().catch(() => null);

        console.log("Respuesta correo campaña body:", emailResult);

      await supabaseAdmin
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

      totalAplicados += 1;
    } else {
      console.error("Error aplicando premio:", cliente.id, updateError);
    }
  }

  if (!esPrueba) {
    await supabaseAdmin
      .from("campanas")
      .update({
        estado: "lanzada",
        launched_at: new Date().toISOString(),
        total_objetivo: totalElegibles,
        total_enviados: totalAplicados,
        error_message: null,
      })
      .eq("id", campana.id);
  }

  return {
    modoPrueba: esPrueba,
    totalObjetivo: clientesObjetivo.length,
    totalAplicados,
  };

} catch (error: any) {

  if (!esPrueba) {
    await supabaseAdmin
      .from("campanas")
      .update({
        estado: "fallida",
        error_message: error?.message || "Error en ejecución",
      })
      .eq("id", campana.id);
  }

  throw error;
}
}