import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

type ClienteRow = {
  id: number;
  nombre: string;
  email_verificado: boolean | null;
  tarjeta_activa: boolean | null;
  premios: any;
  created_At?: string | null;
};

type SubscriptionRow = {
  id: number;
  cliente_id: number;
  template_id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  activated_at: string | null;
  created_at: string | null;
  next_cycle_date: string | null;
  clientes?: {
    nombre: string;
  } | null;
  subscription_templates?: {
    name: string;
  } | null;
};

type ConsumptionRow = {
  id: number;
  cliente_id: number;
  subscription_id: number;
  cycle_number: number;
  potes: number;
  toppings: number;
  barquillos: number;
  galletas: number;
  created_at: string;
  clientes?: {
    nombre: string;
  } | null;
  subscriptions?: {
    subscription_templates?: {
      name: string;
    } | null;
  } | null;
};

function getMonthKey(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getDayKey(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countPremios(premios: any, estado: "activo" | "usado") {
  if (!Array.isArray(premios)) return 0;
  return premios.filter((p) => p?.estado === estado).length;
}

export async function GET() {
  try {
    const today = new Date();
    const plus7 = new Date();
    plus7.setDate(today.getDate() + 7);

    const plus30 = new Date();
    plus30.setDate(today.getDate() + 30);

    const [
      clientesRes,
      subscriptionsRes,
      consumptionsRes,
      activeSubscriptionsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("clientes")
        .select("id, nombre, email_verificado, tarjeta_activa, premios, created_At"),
      supabaseAdmin
        .from("subscriptions")
        .select(`
          id,
          cliente_id,
          template_id,
          status,
          start_date,
          end_date,
          activated_at,
          created_at,
          next_cycle_date
        `),
      supabaseAdmin
        .from("subscription_consumptions")
        .select(`
          id,
          cliente_id,
          subscription_id,
          cycle_number,
          potes,
          toppings,
          barquillos,
          galletas,
          created_at,
          clientes ( nombre ),
          subscriptions (
            subscription_templates ( name )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("subscriptions")
        .select(`
          id,
          cliente_id,
          template_id,
          status,
          start_date,
          end_date,
          activated_at,
          created_at,
          next_cycle_date,
          clientes ( nombre ),
          subscription_templates ( name )
        `)
        .eq("status", "active")
        .order("start_date", { ascending: false }),
    ]);

    if (clientesRes.error) {
      return NextResponse.json(
        { message: "Error cargando clientes para dashboard." },
        { status: 500 }
      );
    }

    if (subscriptionsRes.error) {
      return NextResponse.json(
        { message: "Error cargando suscripciones para dashboard." },
        { status: 500 }
      );
    }

    if (consumptionsRes.error) {
      return NextResponse.json(
        { message: "Error cargando consumos para dashboard." },
        { status: 500 }
      );
    }

    if (activeSubscriptionsRes.error) {
      return NextResponse.json(
        { message: "Error cargando suscripciones activas para dashboard." },
        { status: 500 }
      );
    }

    const clientes = (clientesRes.data || []) as ClienteRow[];
    const subscriptions = (subscriptionsRes.data || []) as SubscriptionRow[];
    const consumptions = (consumptionsRes.data || []) as ConsumptionRow[];
    const activeSubscriptions =
      (activeSubscriptionsRes.data || []) as SubscriptionRow[];

    const clientesTotales = clientes.length;
    const clientesConTarjetaActiva = clientes.filter(
      (c) => c.tarjeta_activa
    ).length;
    const clientesConEmailVerificado = clientes.filter(
      (c) => c.email_verificado
    ).length;

    const premiosActivos = clientes.reduce(
      (acc, c) => acc + countPremios(c.premios, "activo"),
      0
    );
    const premiosUsados = clientes.reduce(
      (acc, c) => acc + countPremios(c.premios, "usado"),
      0
    );

    const suscripcionesActivas = activeSubscriptions.length;
    const clientesConSuscripcionActiva = new Set(
      activeSubscriptions.map((s) => s.cliente_id)
    ).size;

    const clientesConMasDeUnaSuscripcionActiva = Object.values(
      activeSubscriptions.reduce<Record<string, number>>((acc, s) => {
        const key = String(s.cliente_id);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).filter((count) => count > 1).length;

    const suscripcionesPorVencer7Dias = activeSubscriptions.filter((s) => {
      if (!s.end_date) return false;
      const end = new Date(s.end_date);
      return end >= today && end <= plus7;
    }).length;

    const suscripcionesPorVencer30Dias = activeSubscriptions.filter((s) => {
      if (!s.end_date) return false;
      const end = new Date(s.end_date);
      return end >= today && end <= plus30;
    }).length;

    const consumosDelMes = consumptions.filter((c) => {
      const d = new Date(c.created_at);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth()
      );
    }).length;

    const clientesPorMesMap = clientes.reduce<Record<string, number>>(
      (acc, c) => {
        const key = getMonthKey(c.created_At);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    const clientesPorMes = Object.entries(clientesPorMesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total], index, arr) => {
        const acumulado =
          total +
          arr
            .slice(0, index)
            .reduce((sum, [, prevTotal]) => sum + Number(prevTotal), 0);

        return {
          mes,
          nuevosUsuarios: total,
          acumulado,
        };
      });

    const suscripcionesPorMesMap = subscriptions.reduce<Record<string, number>>(
      (acc, s) => {
        const key = getMonthKey(s.activated_at || s.start_date || s.created_at);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    const suscripcionesPorMes = Object.entries(suscripcionesPorMesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({
        mes,
        nuevasSuscripciones: total,
      }));

    const consumosPorDiaMap = consumptions.reduce<
      Record<
        string,
        {
          fecha: string;
          movimientos: number;
          potes: number;
          toppings: number;
          barquillos: number;
          galletas: number;
        }
      >
    >((acc, c) => {
      const key = getDayKey(c.created_at);
      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = {
          fecha: key,
          movimientos: 0,
          potes: 0,
          toppings: 0,
          barquillos: 0,
          galletas: 0,
        };
      }

      acc[key].movimientos += 1;
      acc[key].potes += c.potes || 0;
      acc[key].toppings += c.toppings || 0;
      acc[key].barquillos += c.barquillos || 0;
      acc[key].galletas += c.galletas || 0;

      return acc;
    }, {});

    const consumosPorDia = Object.values(consumosPorDiaMap)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30);

    const tablaSuscripcionesActivas = activeSubscriptions.map((s) => {
      const endDate = s.end_date ? new Date(s.end_date) : null;
      const diasParaVencer = endDate
        ? Math.ceil(
            (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        id: s.id,
        cliente: s.clientes?.nombre || "-",
        suscripcion: s.subscription_templates?.name || "-",
        inicio: s.start_date,
        fin: s.end_date,
        estado: s.status,
        proximoCiclo: s.next_cycle_date,
        diasParaVencer,
      };
    });

    const tablaConsumoReciente = consumptions.map((c) => ({
      id: c.id,
      fecha: c.created_at,
      cliente: c.clientes?.nombre || "-",
      suscripcion: c.subscriptions?.subscription_templates?.name || "-",
      ciclo: c.cycle_number,
      potes: c.potes,
      toppings: c.toppings,
      barquillos: c.barquillos,
      galletas: c.galletas,
    }));

    return NextResponse.json({
      ok: true,
      kpis: {
        clientesTotales,
        clientesConTarjetaActiva,
        clientesConEmailVerificado,
        premiosActivos,
        premiosUsados,
        suscripcionesActivas,
        clientesConSuscripcionActiva,
        clientesConMasDeUnaSuscripcionActiva,
        suscripcionesPorVencer7Dias,
        suscripcionesPorVencer30Dias,
        consumosDelMes,
      },
      clientesPorMes,
      suscripcionesPorMes,
      consumosPorDia,
      tablaSuscripcionesActivas,
      tablaConsumoReciente,
    });
  } catch (error) {
    console.error("[dashboard/overview]", error);

    return NextResponse.json(
      { message: "Ocurrió un error inesperado al cargar el dashboard." },
      { status: 500 }
    );
  }
}