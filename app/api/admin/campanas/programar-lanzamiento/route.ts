import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

async function validateOperationalUser() {
  const session = await getOperationSession();

  if (!session.ok) {
    return {
      error: NextResponse.json(
        { ok: false, message: "Tu sesión no se encuentra activa." },
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
      "Error validando usuario operacional para programar campaña:",
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
      "Rol inconsistente programando campaña:",
      session.userId,
      session.role,
      operationalUser.role,
    );

    return {
      error: NextResponse.json(
        { ok: false, message: "La sesión operacional no es válida." },
        { status: 403 },
      ),
    };
  }

  return { error: null };
}

export async function POST(req: Request) {
  try {
    const validation = await validateOperationalUser();

    if (validation.error) {
      return validation.error;
    }

    const { campanaId } = await req.json();

    if (!campanaId) {
      return NextResponse.json(
        { message: "Falta el ID de la campaña." },
        { status: 400 },
      );
    }

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .select("id, estado")
      .eq("id", campanaId)
      .single();

    if (campanaError || !campana) {
      return NextResponse.json(
        { message: "No se encontró la campaña." },
        { status: 404 },
      );
    }

    if (!["borrador", "fallida"].includes(campana.estado)) {
      return NextResponse.json(
        {
          message:
            "Solo se pueden lanzar campañas en estado borrador o fallida.",
        },
        { status: 400 },
      );
    }

    const fechaLanzamiento = new Date();
    fechaLanzamiento.setMinutes(fechaLanzamiento.getMinutes() + 5);

    const { error: updateError } = await supabaseAdmin
      .from("campanas")
      .update({
        estado: "programada",
        fecha_lanzamiento: fechaLanzamiento.toISOString(),
        error_message: null,
      })
      .eq("id", campana.id);

    if (updateError) {
      console.error("Error programando lanzamiento:", updateError);

      return NextResponse.json(
        { message: "No se pudo programar el lanzamiento." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Campaña programada para lanzarse en 5 minutos.",
      fechaLanzamiento: fechaLanzamiento.toISOString(),
    });
  } catch (error) {
    console.error("Error en programar-lanzamiento:", error);

    return NextResponse.json(
      { message: "Ocurrió un error al programar la campaña." },
      { status: 500 },
    );
  }
}
