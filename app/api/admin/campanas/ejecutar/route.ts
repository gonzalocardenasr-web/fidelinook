import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { aplicarCampana } from "@/lib/campaigns/campaignExecutor";

type LegacyReward = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: "activo";
  tipo: "campana" | "campana_prueba";
  campana_id: number;
  vencimiento: string;
  creado_en: string;
};

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
        role: null,
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
      "Error validando usuario operacional para ejecutar campaña:",
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
      "Rol inconsistente ejecutando campaña:",
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

  return {
    error: null,
    role: operationalUser.role,
  };
}

export async function POST(req: Request) {
  try {
    const validation = await validateOperationalUser();

    if (validation.error) {
      return validation.error;
    }
    const body = await req.json();

    const campanaId = Number(body.campanaId);
    const clienteCorreoPrueba = String(body.clienteCorreoPrueba || "")
      .trim()
      .toLowerCase();

    const esPrueba = Boolean(clienteCorreoPrueba);

    if (!Number.isInteger(campanaId) || campanaId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Falta un ID de campaña válido." },
        { status: 400 },
      );
    }

    const { data: campana, error: campanaError } = await supabaseAdmin
      .from("campanas")
      .select(
        `
          id,
          estado,
          duracion_horas
        `,
      )
      .eq("id", campanaId)
      .single();

    if (campanaError || !campana) {
      return NextResponse.json(
        { ok: false, message: "No se encontró la campaña." },
        { status: 404 },
      );
    }

    if (
      esPrueba &&
      !["borrador"].includes(campana.estado)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Solo se pueden probar campañas en estado borrador.",
        },
        { status: 400 },
      );
    }

    if (!esPrueba && !["programada", "fallida"].includes(campana.estado)) {
      return NextResponse.json(
        {
          ok: false,
          message: "La campaña ya fue ejecutada o no está disponible.",
        },
        { status: 400 },
      );
    }

    const resultado = await aplicarCampana({
      campanaId: campana.id,
      duracionHoras: Number(campana.duracion_horas),
      clienteCorreoPrueba: esPrueba ? clienteCorreoPrueba : undefined,
      actorRole: validation.role,
    });

    return NextResponse.json({
      ok: true,
      message: esPrueba
        ? "Prueba de campaña ejecutada correctamente."
        : "Campaña ejecutada correctamente.",
      resultado,
    });
  } catch (error) {
    console.error("Error ejecutando campaña:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al ejecutar la campaña.",
      },
      { status: 500 },
    );
  }
}
