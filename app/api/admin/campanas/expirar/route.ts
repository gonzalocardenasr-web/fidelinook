import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
      "Error validando usuario operacional para expirar premios:",
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
      "Rol inconsistente expirando premios:",
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

export async function POST() {
  try {
    const validation = await validateOperationalUser();

    if (validation.error) {
      return validation.error;
    }

    const { data: clientes, error } = await supabaseAdmin
      .from("clientes")
      .select("id, premios");

    if (error) {
      return NextResponse.json(
        { message: "Error cargando clientes" },
        { status: 500 },
      );
    }

    let totalActualizados = 0;

    for (const cliente of clientes || []) {
      if (!Array.isArray(cliente.premios)) continue;

      let cambio = false;

      const premiosActualizados = cliente.premios.map((p: any) => {
        if (
          p.estado === "activo" &&
          p.vencimiento &&
          new Date(p.vencimiento) < new Date()
        ) {
          cambio = true;
          return { ...p, estado: "caducado" };
        }

        return p;
      });

      if (cambio) {
        await supabaseAdmin
          .from("clientes")
          .update({ premios: premiosActualizados })
          .eq("id", cliente.id);

        totalActualizados += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      totalActualizados,
    });
  } catch (error) {
    console.error("Error expirando premios:", error);

    return NextResponse.json(
      { message: "Error expirando premios" },
      { status: 500 },
    );
  }
}
