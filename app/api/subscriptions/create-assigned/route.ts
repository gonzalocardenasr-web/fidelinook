import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

type BillingPeriod = "mensual" | "trimestral" | "semestral" | "anual";

function getDurationMonths(billingPeriod: BillingPeriod) {
  const map: Record<BillingPeriod, number> = {
    mensual: 1,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };

  return map[billingPeriod];
}

function buildTemplateName(params: {
  billingPeriod: BillingPeriod;
  potsPerCycle: number;
  toppingsPerCycle: number;
  waferPacksPerCycle: number;
  cookiePacksPerCycle: number;
}) {
  const periodMap: Record<BillingPeriod, string> = {
    mensual: "MEN",
    trimestral: "TRIM",
    semestral: "SEM",
    anual: "AN",
  };

  const parts: string[] = [periodMap[params.billingPeriod]];

  if (params.potsPerCycle > 0) parts.push(`${params.potsPerCycle}POT`);
  if (params.toppingsPerCycle > 0) parts.push(`${params.toppingsPerCycle}TOPP`);
  if (params.waferPacksPerCycle > 0) parts.push(`${params.waferPacksPerCycle}PBAR`);
  if (params.cookiePacksPerCycle > 0) parts.push(`${params.cookiePacksPerCycle}PGAL`);

  return parts.join("-");
}

async function getOrCreateTemplate(params: {
  billingPeriod: BillingPeriod;
  potsPerCycle: number;
  toppingsPerCycle: number;
  waferPacksPerCycle: number;
  cookiePacksPerCycle: number;
}) {
  const {
    billingPeriod,
    potsPerCycle,
    toppingsPerCycle,
    waferPacksPerCycle,
    cookiePacksPerCycle,
  } = params;

  const durationMonths = getDurationMonths(billingPeriod);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("subscription_templates")
    .select("id")
    .eq("billing_period", billingPeriod)
    .eq("duration_months", durationMonths)
    .eq("pots_per_cycle", potsPerCycle)
    .eq("toppings_per_cycle", toppingsPerCycle)
    .eq("wafer_packs_per_cycle", waferPacksPerCycle)
    .eq("cookie_packs_per_cycle", cookiePacksPerCycle)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing.id;
  }

  const nombre = buildTemplateName(params);

  const { data: created, error: createError } = await supabaseAdmin
    .from("subscription_templates")
    .insert({
      name: nombre,
      billing_period: billingPeriod,
      duration_months: durationMonths,
      pots_per_cycle: potsPerCycle,
      toppings_per_cycle: toppingsPerCycle,
      wafer_packs_per_cycle: waferPacksPerCycle,
      cookie_packs_per_cycle: cookiePacksPerCycle,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "No se pudo crear la suscripción.");
  }

  return created.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clienteId,
      billingPeriod,
      potsPerCycle,
      toppingsPerCycle,
      waferPacksPerCycle,
      cookiePacksPerCycle,
    } = body as {
      clienteId?: number;
      billingPeriod?: BillingPeriod;
      potsPerCycle?: number;
      toppingsPerCycle?: number;
      waferPacksPerCycle?: number;
      cookiePacksPerCycle?: number;
    };

    if (!clienteId || !billingPeriod) {
      return NextResponse.json(
        { message: "Faltan datos para asignar la suscripción." },
        { status: 400 }
      );
    }

    const cantidades = [
      potsPerCycle ?? 0,
      toppingsPerCycle ?? 0,
      waferPacksPerCycle ?? 0,
      cookiePacksPerCycle ?? 0,
    ];

    if (!cantidades.some((valor) => valor > 0)) {
      return NextResponse.json(
        { message: "Debes configurar al menos un producto." },
        { status: 400 }
      );
    }

    const templateId = await getOrCreateTemplate({
      billingPeriod,
      potsPerCycle: potsPerCycle ?? 0,
      toppingsPerCycle: toppingsPerCycle ?? 0,
      waferPacksPerCycle: waferPacksPerCycle ?? 0,
      cookiePacksPerCycle: cookiePacksPerCycle ?? 0,
    });

    const { error } = await supabaseAdmin
      .from("subscription_claims")
      .insert({
        source: "admin_assigned",
        status: "pending",
        template_id: templateId,
        assigned_cliente_id: clienteId,
        created_by_admin: "superadmin",
      });

    if (error) {
      return NextResponse.json(
        {
          message: "Error creando la asignación.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción asignada correctamente.",
    });
   } catch (error) {
    console.error("[create-assigned] unexpected error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al asignar la suscripción.",
      },
      { status: 500 }
    );
  }
}