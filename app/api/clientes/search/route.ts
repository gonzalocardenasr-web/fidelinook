import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import { getCustomerLoyalty } from "../../../../lib/loyalty";

type Cliente = {
  id: number;
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
  tarjeta_activa: boolean | null;
  email_verificado: boolean | null;
};

function normalizarTexto(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
      "Error validando usuario operacional en búsqueda de clientes:",
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

export async function GET(req: Request) {
  const validation = await validateOperationalUser();

  if (validation.error) {
    return validation.error;
  }

  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({ ok: true, clientes: [] });
  }

  const queryNormalizada = normalizarTexto(query);

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nombre, correo, telefono, tarjeta_activa, email_verificado")
    .order("nombre", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const clientes = await Promise.all(
    ((data || []) as Cliente[])
      .filter((cliente) => {
        const nombre = normalizarTexto(cliente.nombre);
        const correo = normalizarTexto(cliente.correo);
        const telefono = normalizarTexto(cliente.telefono);

        return (
          nombre.includes(queryNormalizada) ||
          correo.includes(queryNormalizada) ||
          telefono.includes(queryNormalizada)
        );
      })
      .slice(0, 10)
      .map(async (cliente) => {
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
