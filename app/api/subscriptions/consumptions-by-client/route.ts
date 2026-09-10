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

  return { error: null };
}

export async function GET(req: Request) {
  const validation = await validateOperationalUser();

  if (validation.error) {
    return validation.error;
  }

  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");

    if (!clienteId) {
      return NextResponse.json(
        { message: "Falta clienteId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subscription_consumptions")
      .select(`
        id,
        potes,
        toppings,
        barquillos,
        galletas,
        created_at,
        subscriptions (
            subscription_templates (
            name
            )
        )
      `)
      .eq("cliente_id", Number(clienteId))
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { message: "Error al obtener consumos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      consumptions: data || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error inesperado" },
      { status: 500 }
    );
  }
}