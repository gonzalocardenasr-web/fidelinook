import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../../lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

async function validateOperationalUser() {
  const session = await getOperationSession();

    const authorization = authorizeOperationSession(
      session,
      "campaigns.manage",
    );

    if (!authorization.ok) {
      return {
        error: NextResponse.json(
          { ok: false, message: authorization.message },
          { status: authorization.status },
        ),
      };
    }

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
      "Error validando usuario operacional para crear campaña:",
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
      "Rol inconsistente creando campaña:",
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

    if (
      !nombreInterno ||
      !premioNombre ||
      !premioDescripcion ||
      !duracionHoras ||
      !fechaLanzamiento
    ) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios para crear la campaña." },
        { status: 400 },
      );
    }

    const duracion = Number(duracionHoras);

    if (!Number.isFinite(duracion) || duracion < 24 || duracion % 24 !== 0) {
      return NextResponse.json(
        { message: "La duración debe ser un múltiplo de 24 horas." },
        { status: 400 },
      );
    }

    const fecha = new Date(fechaLanzamiento);

    if (Number.isNaN(fecha.getTime())) {
      return NextResponse.json(
        { message: "La fecha de lanzamiento no es válida." },
        { status: 400 },
      );
    }

    const recurrenciaFinal = recurrencia === "semanal" ? "semanal" : "una_vez";

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .insert({
        nombre_interno: nombreInterno,
        premio_nombre: premioNombre,
        premio_descripcion: premioDescripcion,
        duracion_horas: duracion,
        fecha_lanzamiento: fecha.toISOString(),
        recurrencia: recurrenciaFinal,
        estado: "borrador",
        creado_por: creadoPor || "superadmin",
        launched_at: null,
      })
      .select()
      .single();

    if (campanaError || !campana) {
      console.error("Error creando campaña:", campanaError);
      return NextResponse.json(
        { message: "No se pudo crear la campaña." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Campaña creada correctamente. Podrás lanzarla desde Operación local.",
      campana,
    });
  } catch (error) {
    console.error("Error en /api/admin/campanas/lanzar:", error);
    return NextResponse.json(
      { message: "Ocurrió un error al lanzar la campaña." },
      { status: 500 },
    );
  }
}
