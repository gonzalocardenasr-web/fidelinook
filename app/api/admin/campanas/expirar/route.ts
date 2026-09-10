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

  if (operationalUser.role !== "superadmin") {
    return {
      error: NextResponse.json(
        {
          ok: false,
          message: "No tienes permisos para expirar premios globalmente.",
        },
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

    const session = await getOperationSession();

    if (!session.ok || !session.userId) {
      return NextResponse.json(
        { ok: false, message: "Tu sesión no se encuentra activa." },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("expire_customer_rewards", {
      p_customer_id: null,
      p_actor_role: session.role,
      p_actor_identifier: String(session.userId),
    });

    if (error) {
      console.error("Error expirando premios:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible expirar los premios vencidos.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      totalExpirados: Number(data || 0),
    });
  } catch (error) {
    console.error("Error expirando premios:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error expirando premios.",
      },
      { status: 500 },
    );
  }
}
