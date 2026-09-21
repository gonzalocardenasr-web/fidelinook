import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

const MANAGEABLE_GROUPS = new Set([
  "flavor",
  "topping",
  "brownie_variety",
  "mineral_water_type",
  "coffee_type",
]);

function normalizeCodePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, " ")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildOptionCode(groupCode: string, name: string) {
  const normalized = normalizeCodePart(name);

  if (!normalized) {
    throw new Error("No fue posible generar un código para la opción.");
  }

  if (groupCode === "flavor" || groupCode === "topping") {
    return normalized;
  }

  const prefixes: Record<string, string> = {
    brownie_variety: "brownie",
    mineral_water_type: "mineral_water",
    coffee_type: "coffee",
  };

  const prefix = prefixes[groupCode];

  if (!prefix) {
    throw new Error("Grupo de opciones no administrable.");
  }

  return `${prefix}_${normalized.toLowerCase().replace(/-/g, "_")}`;
}

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const groupId = Number(body.groupId);
    const name = String(body.name || "").trim();

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Grupo de opciones inválido." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("catalog_option_groups")
      .select("id, code, is_active")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { ok: false, message: "Grupo de opciones no encontrado." },
        { status: 404 },
      );
    }

    if (!group.is_active || !MANAGEABLE_GROUPS.has(group.code)) {
      return NextResponse.json(
        { ok: false, message: "Grupo de opciones no administrable." },
        { status: 400 },
      );
    }

    const { data: existingValues, error: existingError } = await supabaseAdmin
      .from("catalog_option_values")
      .select("id, code, name, sort_order")
      .eq("group_id", groupId);

    if (existingError) {
      return NextResponse.json(
        { ok: false, message: existingError.message },
        { status: 500 },
      );
    }

    const normalizedName = name.toLocaleLowerCase("es");

    const duplicateName = (existingValues || []).some(
      (option) =>
        String(option.name).trim().toLocaleLowerCase("es") === normalizedName,
    );

    if (duplicateName) {
      return NextResponse.json(
        {
          ok: false,
          message: "Ya existe una opción con ese nombre en este grupo.",
        },
        { status: 409 },
      );
    }

    const code = buildOptionCode(group.code, name);

    const duplicateCode = (existingValues || []).some(
      (option) => option.code === code,
    );

    if (duplicateCode) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Ya existe una opción equivalente en este grupo. Revisa el nombre ingresado.",
        },
        { status: 409 },
      );
    }

    const currentMaxSortOrder = Math.max(
      0,
      ...(existingValues || []).map((option) => Number(option.sort_order) || 0),
    );

    const sortStep =
      group.code === "flavor" || group.code === "topping" ? 1 : 10;

    const { data: option, error: insertError } = await supabaseAdmin
      .from("catalog_option_values")
      .insert({
        group_id: groupId,
        code,
        name,
        is_active: true,
        sort_order: currentMaxSortOrder + sortStep,
      })
      .select("id, code, name, is_active, sort_order")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            message: "Ya existe una opción equivalente en este grupo.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { ok: false, message: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        option,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible crear la opción.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const body = await req.json();

  const optionValueId = Number(body.optionValueId);
  const name = String(body.name || "").trim();
  const isActive = Boolean(body.isActive);

  if (!optionValueId || Number.isNaN(optionValueId)) {
    return NextResponse.json(
      { ok: false, message: "Opción inválida." },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "El nombre es obligatorio." },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("catalog_option_values")
    .update({
      name,
      is_active: isActive,
    })
    .eq("id", optionValueId);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const optionValueId = Number(body.optionValueId);

    if (!Number.isInteger(optionValueId) || optionValueId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Opción inválida." },
        { status: 400 },
      );
    }

    const { data: option, error: optionError } = await supabaseAdmin
      .from("catalog_option_values")
      .select(
        `
        id,
        name,
        group_id,
        catalog_option_groups!inner (
          code,
          is_active
        )
      `,
      )
      .eq("id", optionValueId)
      .single();

    if (optionError || !option) {
      return NextResponse.json(
        { ok: false, message: "Opción no encontrada." },
        { status: 404 },
      );
    }

    const groupRelation = Array.isArray(option.catalog_option_groups)
      ? option.catalog_option_groups[0]
      : option.catalog_option_groups;

    if (
      !groupRelation?.is_active ||
      !MANAGEABLE_GROUPS.has(groupRelation.code)
    ) {
      return NextResponse.json(
        { ok: false, message: "Grupo de opciones no administrable." },
        { status: 400 },
      );
    }

    const [
      inventoryBatchesResult,
      inventoryItemsResult,
      optionPricesResult,
      saleItemOptionsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("inventory_batches")
        .select("id", { count: "exact", head: true })
        .eq("catalog_option_value_id", optionValueId),

      supabaseAdmin
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("option_value_id", optionValueId),

      supabaseAdmin
        .from("product_option_prices")
        .select("id", { count: "exact", head: true })
        .eq("option_value_id", optionValueId),

      supabaseAdmin
        .from("sale_item_options")
        .select("id", { count: "exact", head: true })
        .eq("option_value_id", optionValueId),
    ]);

    const dependencyResults = [
      inventoryBatchesResult,
      inventoryItemsResult,
      optionPricesResult,
      saleItemOptionsResult,
    ];

    const dependencyError = dependencyResults.find((result) => result.error);

    if (dependencyError?.error) {
      return NextResponse.json(
        { ok: false, message: dependencyError.error.message },
        { status: 500 },
      );
    }

    const hasDependencies = dependencyResults.some(
      (result) => Number(result.count || 0) > 0,
    );

    if (hasDependencies) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No se puede eliminar esta opción porque tiene información asociada. Puedes mantenerla desactivada.",
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("catalog_option_values")
      .delete()
      .eq("id", optionValueId);

    if (deleteError) {
      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            ok: false,
            message:
              "No se puede eliminar esta opción porque tiene información asociada. Puedes mantenerla desactivada.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { ok: false, message: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      deletedOptionValueId: optionValueId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible eliminar la opción.",
      },
      { status: 400 },
    );
  }
}
