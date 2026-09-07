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
        "Error validando usuario operacional para clientes:",
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
        "Rol inconsistente consultando clientes:",
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
      .from("clientes")
      .select(
        "id, nombre, correo, telefono, public_token, tarjeta_activa, email_verificado, created_At, fecha_activacion",
      )
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando clientes operacionales:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible cargar los clientes.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      clientes: data || [],
    });
  } catch (error) {
    console.error("Error inesperado cargando clientes operacionales:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al cargar los clientes.",
      },
      { status: 500 },
    );
  }
}
