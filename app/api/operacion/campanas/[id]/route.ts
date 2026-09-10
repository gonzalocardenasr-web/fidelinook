import { NextRequest, NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function validateOperationalUser() {
  const session = await getOperationSession();

  if (!session.ok) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          message: "Tu sesión no se encuentra activa.",
        },
        { status: 401 },
      ),
    };
  }

  if (!session.userId) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          message:
            "Tu sesión debe renovarse para identificar al usuario. Cierra sesión e inicia sesión nuevamente.",
        },
        { status: 401 },
      ),
    };
  }

  const { data: operationalUser, error: operationalUserError } =
    await supabaseAdmin
      .from("operational_users")
      .select("id, role, is_active")
      .eq("id", session.userId)
      .maybeSingle();

  if (operationalUserError) {
    console.error(
      "Error validando usuario operacional para detalle de campaña:",
      operationalUserError,
    );

    return {
      error: NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar al usuario operacional.",
        },
        { status: 500 },
      ),
    };
  }

  if (!operationalUser || !operationalUser.is_active) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          message: "El usuario operacional no se encuentra activo.",
        },
        { status: 403 },
      ),
    };
  }

  if (operationalUser.role !== session.role) {
    console.error(
      "Rol inconsistente accediendo al detalle de campaña:",
      session.userId,
      session.role,
      operationalUser.role,
    );

    return {
      error: NextResponse.json(
        {
          ok: false,
          message: "La sesión operacional no es válida.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    error: null,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const validation = await validateOperationalUser();

    if (validation.error) {
      return validation.error;
    }

    const { id } = await context.params;
    const campanaId = Number(id);

    if (!Number.isInteger(campanaId) || campanaId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El identificador de la campaña no es válido.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("campanas")
      .select(
        "id, nombre_interno, premio_nombre, premio_descripcion, duracion_horas, fecha_lanzamiento, recurrencia, estado, total_objetivo, total_enviados, error_message, created_at, launched_at",
      )
      .eq("id", campanaId)
      .maybeSingle();

    if (error) {
      console.error("Error cargando detalle de campaña:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible cargar la campaña.",
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se encontró la campaña.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      campana: data,
    });
  } catch (error) {
    console.error("Error inesperado cargando detalle de campaña:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al cargar la campaña.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const validation = await validateOperationalUser();

    if (validation.error) {
      return validation.error;
    }

    const { id } = await context.params;
    const campanaId = Number(id);

    if (!Number.isInteger(campanaId) || campanaId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El identificador de la campaña no es válido.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const nombreInterno =
      typeof body.nombre_interno === "string" ? body.nombre_interno.trim() : "";

    const premioNombre =
      typeof body.premio_nombre === "string" ? body.premio_nombre.trim() : "";

    const premioDescripcion =
      typeof body.premio_descripcion === "string"
        ? body.premio_descripcion.trim()
        : "";

    const duracionHoras = Number(body.duracion_horas);
    const fechaLanzamiento =
      typeof body.fecha_lanzamiento === "string" ? body.fecha_lanzamiento : "";

    const recurrencia = body.recurrencia;

    if (!nombreInterno || !premioNombre || !premioDescripcion) {
      return NextResponse.json(
        {
          ok: false,
          message: "La configuración de la campaña está incompleta.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(duracionHoras) ||
      duracionHoras < 24 ||
      duracionHoras % 24 !== 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "La vigencia debe ser un múltiplo de 24 horas.",
        },
        { status: 400 },
      );
    }

    if (!fechaLanzamiento || Number.isNaN(Date.parse(fechaLanzamiento))) {
      return NextResponse.json(
        {
          ok: false,
          message: "La fecha de lanzamiento no es válida.",
        },
        { status: 400 },
      );
    }

    if (recurrencia !== "una_vez" && recurrencia !== "semanal") {
      return NextResponse.json(
        {
          ok: false,
          message: "La recurrencia de la campaña no es válida.",
        },
        { status: 400 },
      );
    }

    const { data: existingCampaign, error: existingCampaignError } =
      await supabaseAdmin
        .from("campanas")
        .select("id, estado")
        .eq("id", campanaId)
        .maybeSingle();

    if (existingCampaignError) {
      console.error(
        "Error validando campaña antes de actualizar:",
        existingCampaignError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar la campaña.",
        },
        { status: 500 },
      );
    }

    if (!existingCampaign) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se encontró la campaña.",
        },
        { status: 404 },
      );
    }

    if (
      existingCampaign.estado !== "borrador" &&
      existingCampaign.estado !== "programada" &&
      existingCampaign.estado !== "fallida"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "La campaña ya no se encuentra en un estado editable.",
        },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("campanas")
      .update({
        nombre_interno: nombreInterno,
        premio_nombre: premioNombre,
        premio_descripcion: premioDescripcion,
        duracion_horas: duracionHoras,
        fecha_lanzamiento: new Date(fechaLanzamiento).toISOString(),
        recurrencia,
      })
      .eq("id", campanaId);

    if (updateError) {
      console.error("Error actualizando campaña:", updateError);

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo actualizar la campaña.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Error inesperado actualizando campaña:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al actualizar la campaña.",
      },
      { status: 500 },
    );
  }
}
