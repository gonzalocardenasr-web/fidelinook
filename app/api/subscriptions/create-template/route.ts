import { NextResponse } from "next/server";
import { getOperationSession } from "../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

async function validateOperationalUser() {
  const session = await getOperationSession();

  if (!session.ok || !session.userId) {
    return {
      error: NextResponse.json(
        { ok: false, message: "No autenticado." },
        { status: 401 }
      ),
    };
  }

  const { data: operationalUser, error } = await supabaseAdmin
    .from("operational_users")
    .select("id, role, is_active")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json(
        { ok: false, message: "No fue posible validar al usuario operacional." },
        { status: 500 }
      ),
    };
  }

  if (
    !operationalUser ||
    !operationalUser.is_active ||
    operationalUser.role !== session.role
  ) {
    return {
      error: NextResponse.json(
        { ok: false, message: "Usuario operacional no autorizado." },
        { status: 403 }
      ),
    };
  }

  if (
    operationalUser.role !== "admin" &&
    operationalUser.role !== "superadmin"
  ) {
    return {
      error: NextResponse.json(
        { ok: false, message: "No tienes permisos para crear suscripciones." },
        { status: 403 }
      ),
    };
  }

  return { error: null };
}

export async function POST(req: Request) {
  const validation = await validateOperationalUser();

  if (validation.error) {
    return validation.error;
  }

  try {
    const body = await req.json();

    const {
      name,
      durationMonths,
      potsPerCycle,
      toppingsPerCycle,
      waferPacksPerCycle,
      cookiePacksPerCycle,
    } = body as {
      name?: string;
      durationMonths?: number;
      potsPerCycle?: number;
      toppingsPerCycle?: number;
      waferPacksPerCycle?: number;
      cookiePacksPerCycle?: number;
    };

    const nombreLimpio = (name || "").trim();

    if (!nombreLimpio) {
      return NextResponse.json(
        { message: "Debes ingresar un nombre para la suscripción." },
        { status: 400 }
      );
    }

    if (!durationMonths || durationMonths < 1) {
      return NextResponse.json(
        { message: "La duración debe ser al menos de 1 mes." },
        { status: 400 }
      );
    }

    const cantidades = [
      potsPerCycle ?? 0,
      toppingsPerCycle ?? 0,
      waferPacksPerCycle ?? 0,
      cookiePacksPerCycle ?? 0,
    ];

    const algunaCantidad = cantidades.some((valor) => valor > 0);

    if (!algunaCantidad) {
      return NextResponse.json(
        { message: "Debes configurar al menos un producto en la suscripción." },
        { status: 400 }
      );
    }

    const { data: existente, error: existenteError } = await supabaseAdmin
      .from("subscription_templates")
      .select("id")
      .eq("name", nombreLimpio)
      .maybeSingle();

    if (existenteError) {
      return NextResponse.json(
        {
          message: "No se pudo validar si la suscripción ya existe.",
          detail: existenteError.message,
        },
        { status: 500 }
      );
    }

    if (existente) {
      return NextResponse.json(
        { message: "Ya existe una suscripción con ese nombre." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subscription_templates")
      .insert({
        name: nombreLimpio,
        duration_months: durationMonths,
        pots_per_cycle: potsPerCycle ?? 0,
        toppings_per_cycle: toppingsPerCycle ?? 0,
        wafer_packs_per_cycle: waferPacksPerCycle ?? 0,
        cookie_packs_per_cycle: cookiePacksPerCycle ?? 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          message: "No se pudo crear la suscripción.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción creada correctamente.",
      template: data,
    });
  } catch (error) {
    console.error("[create-template] unexpected error:", error);

    return NextResponse.json(
      { message: "Ocurrió un error inesperado al crear la suscripción." },
      { status: 500 }
    );
  }
}