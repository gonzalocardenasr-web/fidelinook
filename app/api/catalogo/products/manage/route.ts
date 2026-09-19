import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

const OPERATIONAL_TYPES = new Set(["directo", "servido", "preparado"]);

function parseNonNegativeInteger(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `${fieldName} debe ser un número entero mayor o igual a 0.`,
    );
  }

  return parsed;
}

function parseNonNegativeNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} debe ser un número mayor o igual a 0.`);
  }

  return parsed;
}

function normalizeProductBody(body: Record<string, unknown>) {
  const sku = String(body.sku || "")
    .trim()
    .toUpperCase();

  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const subcategoryRaw = String(body.subcategory || "").trim();
  const operationalType = String(body.operationalType || "").trim();

  if (!sku) {
    throw new Error("El SKU es obligatorio.");
  }

  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  if (!category) {
    throw new Error("La categoría es obligatoria.");
  }

  if (!OPERATIONAL_TYPES.has(operationalType)) {
    throw new Error("El tipo operacional es inválido.");
  }

  const hasFlavors = Boolean(body.hasFlavors);
  const allowsToppings = Boolean(body.allowsToppings);

  return {
    sku,
    name,
    category,
    subcategory: subcategoryRaw || null,
    operational_type: operationalType,
    portion_quantity: parseNonNegativeNumber(
      body.portionQuantity ?? 0,
      "La cantidad de porciones",
    ),
    has_flavors: hasFlavors,
    max_flavors: hasFlavors
      ? parseNonNegativeInteger(body.maxFlavors ?? 0, "Máximo de sabores")
      : 0,
    allow_repeat_flavor: hasFlavors ? Boolean(body.allowRepeatFlavor) : true,
    allows_toppings: allowsToppings,
    max_toppings: allowsToppings
      ? parseNonNegativeInteger(body.maxToppings ?? 0, "Máximo de toppings")
      : 0,
    allows_chocolate_dip: Boolean(body.allowsChocolateDip),
    requires_preparation: Boolean(body.requiresPreparation),
    sort_order: parseNonNegativeInteger(body.sortOrder ?? 0, "El orden"),
  };
}

function isUniqueViolation(error: { code?: string | null } | null) {
  return error?.code === "23505";
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
    const product = normalizeProductBody(body);

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        ...product,
        is_active: false,
      })
      .select("id, sku")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un producto con ese SKU." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const { error: channelError } = await supabaseAdmin
      .from("product_channels")
      .insert({
        product_id: data.id,
        channel_code: "local",
        is_enabled: false,
      });

    if (channelError) {
      await supabaseAdmin.from("products").delete().eq("id", data.id);

      return NextResponse.json(
        {
          ok: false,
          message: `No fue posible inicializar el canal local: ${channelError.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      product: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Datos de producto inválidos.",
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

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const productId = Number(body.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Producto inválido." },
        { status: 400 },
      );
    }

    const product = normalizeProductBody(body);

    const { error } = await supabaseAdmin
      .from("products")
      .update(product)
      .eq("id", productId);

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { ok: false, message: "Ya existe un producto con ese SKU." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Datos de producto inválidos.",
      },
      { status: 400 },
    );
  }
}
