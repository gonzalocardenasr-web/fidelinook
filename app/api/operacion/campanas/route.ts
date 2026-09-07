import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const session = await getOperationSession();

    if (!session.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Tu sesión no se encuentra activa.",
        },
        { status: 401 },
      );
    }

    if (!session.userId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tu sesión debe renovarse para identificar al usuario. Cierra sesión e inicia sesión nuevamente.",
        },
        { status: 401 },
      );
    }

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("id, role, is_active")
        .eq("id", session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error validando usuario operacional para campañas:",
        operationalUserError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar al usuario operacional.",
        },
        { status: 500 },
      );
    }

    if (!operationalUser || !operationalUser.is_active) {
      return NextResponse.json(
        {
          ok: false,
          message: "El usuario operacional no se encuentra activo.",
        },
        { status: 403 },
      );
    }

    if (operationalUser.role !== session.role) {
      console.error(
        "Rol inconsistente consultando campañas:",
        session.userId,
        session.role,
        operationalUser.role,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "La sesión operacional no es válida.",
        },
        { status: 403 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("campanas")
      .select(
        "id, nombre_interno, premio_nombre, duracion_horas, fecha_lanzamiento, recurrencia, estado, total_objetivo, total_enviados, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error cargando campañas operacionales:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible cargar las campañas.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      campanas: data || [],
    });
  } catch (error) {
    console.error("Error inesperado cargando campañas operacionales:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al cargar las campañas.",
      },
      { status: 500 },
    );
  }
}
