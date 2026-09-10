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
      "Error validando usuario operacional en dashboard campañas:",
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

  return { error: null };
}

export async function GET() {
  const validation = await validateOperationalUser();

  if (validation.error) {
    return validation.error;
  }

  try {
    const { data: campanas } = await supabaseAdmin
      .from("campanas")
      .select("id, nombre_interno, estado, total_enviados");

    const { data: tracking } = await supabaseAdmin
      .from("campana_clientes")
      .select("campana_id, estado");

    const resumen = (campanas || []).map((c) => {
      const registros = (tracking || []).filter((t) => t.campana_id === c.id);

      const enviados = c.total_enviados || 0;
      const canjeados = registros.filter((r) => r.estado === "canjeado").length;
      const caducados = registros.filter((r) => r.estado === "caducado").length;

      const conversion =
        enviados > 0 ? ((canjeados / enviados) * 100).toFixed(1) : "0";

      return {
        nombre: c.nombre_interno,
        estado: c.estado,
        enviados,
        canjeados,
        caducados,
        conversion: `${conversion}%`,
      };
    });

    return NextResponse.json({ ok: true, data: resumen });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
