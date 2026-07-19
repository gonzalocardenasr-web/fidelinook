import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import { getCustomerLoyalty } from "../../../../lib/loyalty";

export async function GET(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({ ok: true, clientes: [] });
  }

  const normalized = query.toLowerCase();

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nombre, correo, telefono, tarjeta_activa, email_verificado")
    .or(
      `nombre.ilike.%${normalized}%,correo.ilike.%${normalized}%,telefono.ilike.%${normalized}%`,
    )
    .limit(10);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const clientes = await Promise.all(
    (
      (data || []) as {
        id: number;
        nombre: string | null;
        correo: string | null;
        telefono: string | null;
        tarjeta_activa: boolean | null;
        email_verificado: boolean | null;
      }[]
    ).map(async (cliente) => {
      const loyalty = await getCustomerLoyalty(cliente.id);

      return {
        ...cliente,
        sellos: loyalty.currentStampBalance,
        premios: loyalty.activeRewards,
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    clientes,
  });
}
