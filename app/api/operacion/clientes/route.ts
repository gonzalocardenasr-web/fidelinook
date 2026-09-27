import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authorizeOperationSession } from "@/lib/operation-rbac";

export async function GET() {
  try {
    const session = await getOperationSession();

    const authorization = authorizeOperationSession(
      session,
      "customers.operate",
    );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: authorization.message,
        },
        { status: authorization.status },
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
