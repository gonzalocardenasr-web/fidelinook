import { NextResponse } from "next/server";
import { getOperationSession } from "../../../lib/operation-auth";
import { supabaseAdmin } from "../../../lib/supabase-admin";

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
        "Error validando usuario operacional para consultar suscripciones:",
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
        "Rol inconsistente consultando suscripciones:",
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

    const [
      { data: clientes, error: clientesError },
      { data: claims, error: claimsError },
      { data: subscriptions, error: subscriptionsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("clientes")
        .select("id, nombre, correo, telefono")
        .order("nombre"),

      supabaseAdmin
        .from("subscription_claims")
        .select(
          `
          id,
          source,
          status,
          claim_code,
          created_at,
          assigned_cliente_id,
          template_id,
          clientes:assigned_cliente_id ( nombre ),
          subscription_templates:template_id ( name )
        `,
        )
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("subscriptions")
        .select(
          `
          id,
          status,
          start_date,
          end_date,
          next_cycle_date,
          activated_at,
          created_at,
          cliente_id,
          template_id,
          clientes:cliente_id ( nombre ),
          subscription_templates:template_id ( name )
        `,
        )
        .order("created_at", { ascending: false }),
    ]);

    if (clientesError || claimsError || subscriptionsError) {
      console.error("Error consultando suscripciones:", {
        clientesError,
        claimsError,
        subscriptionsError,
      });

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible cargar la información de suscripciones.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      clientes: clientes || [],
      claims: claims || [],
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    console.error("[subscriptions] unexpected error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al cargar las suscripciones.",
      },
      { status: 500 },
    );
  }
}
