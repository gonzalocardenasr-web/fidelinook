import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { sendPrizeExpiringReminderEmail } from "../../../lib/email/sendPrizeExpiringReminderEmail";

type Premio = {
  id: number;
  nombre: string;
  estado: "activo" | "usado";
  vencimiento?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  public_token: string;
  premios: Premio[] | number | null;
};

export async function POST() {
  try {
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("id, nombre, correo, public_token, premios");

    if (error) {
      console.error("Error cargando clientes:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los clientes" },
        { status: 500 }
      );
    }

    const hoy = new Date();
    const ventanaDias = 3;

    const enviados: Array<{
      clienteId: number;
      nombre: string;
      correo: string;
      premio: string;
      vencimiento: string;
    }> = [];

    for (const cliente of (clientes || []) as Cliente[]) {
      const premiosArray = Array.isArray(cliente.premios) ? cliente.premios : [];

      const premiosPorVencer = premiosArray.filter((premio) => {
        if (premio.estado !== "activo" || !premio.vencimiento) return false;

        const fechaVencimiento = new Date(premio.vencimiento);
        const diffMs = fechaVencimiento.getTime() - hoy.getTime();
        const diffDias = diffMs / (1000 * 60 * 60 * 24);

        return diffDias >= 0 && diffDias <= ventanaDias;
      });

      for (const premio of premiosPorVencer) {
        await sendPrizeExpiringReminderEmail(
          cliente.correo,
          cliente.nombre,
          premio.nombre,
          premio.vencimiento as string,
          cliente.public_token
        );

        enviados.push({
          clienteId: cliente.id,
          nombre: cliente.nombre,
          correo: cliente.correo,
          premio: premio.nombre,
          vencimiento: premio.vencimiento as string,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: enviados.length,
      enviados,
    });
  } catch (error) {
    console.error("Error en /api/reminder-expiring-rewards:", error);

    return NextResponse.json(
      { error: "No se pudieron enviar los recordatorios" },
      { status: 500 }
    );
  }
}