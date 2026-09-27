import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import { getCustomerLoyalty } from "../../../../lib/loyalty";
import { authorizeOperationSession } from "@/lib/operation-rbac";

type Cliente = {
  id: number;
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
  tarjeta_activa: boolean | null;
  email_verificado: boolean | null;
};

export async function GET(req: Request) {
  const session = await getOperationSession();

  const authorization = authorizeOperationSession(session, "customers.operate");

  if (!authorization.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: authorization.message,
      },
      { status: authorization.status },
    );
  }

  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({ ok: true, clientes: [] });
  }

  const escapedQuery = query
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  const searchPattern = `%${escapedQuery}%`;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nombre, correo, telefono, tarjeta_activa, email_verificado")
    .or(
      `nombre.ilike.${searchPattern},correo.ilike.${searchPattern},telefono.ilike.${searchPattern}`,
    )
    .order("nombre", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const clientes = await Promise.all(
    ((data || []) as Cliente[]).map(async (cliente) => {
      const loyalty = await getCustomerLoyalty(cliente.id);

      return {
        ...cliente,
        loyalty: {
          currentStampBalance: loyalty.currentStampBalance,
          activeRewards: loyalty.activeRewards,
          activeRewardsCount: loyalty.activeRewards.length,
        },
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
