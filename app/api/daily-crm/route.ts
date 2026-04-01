import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { sendPrizeExpiringReminderEmail } from "../../../lib/email/sendPrizeExpiringReminderEmail";
import { sendReactivationEmail } from "../../../lib/email/sendReactivationEmail";

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
  sellos: number | null;
  fecha_ultimo_sello?: string | null;
  fecha_ultimo_recordatorio_inactividad?: string | null;
};

const META_SELLOS = 7;
const VENTANA_PREMIO_DIAS = 3;
const INACTIVIDAD_DIAS = 14;
const RECORDATORIO_INACTIVIDAD_DIAS = 14;

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: clientes, error } = await supabase
      .from("clientes")
      .select(
        "id, nombre, correo, public_token, premios, sellos, fecha_ultimo_sello, fecha_ultimo_recordatorio_inactividad"
      );

    if (error) {
      console.error("Error cargando clientes:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los clientes" },
        { status: 500 }
      );
    }

    const ahora = new Date();

    const premiosEnviados: Array<{
      clienteId: number;
      correo: string;
      premio: string;
      vencimiento: string;
    }> = [];

    const reactivacionesEnviadas: Array<{
      clienteId: number;
      correo: string;
      sellosActuales: number;
      fechaUltimoSello: string;
    }> = [];

    for (const cliente of (clientes || []) as Cliente[]) {
      const premiosArray = Array.isArray(cliente.premios) ? cliente.premios : [];

      const premiosPorVencer = premiosArray.filter((premio) => {
        if (premio.estado !== "activo" || !premio.vencimiento) return false;

        const fechaVencimiento = new Date(premio.vencimiento);
        const diffMs = fechaVencimiento.getTime() - ahora.getTime();
        const diffDias = diffMs / (1000 * 60 * 60 * 24);

        return diffDias >= 0 && diffDias <= VENTANA_PREMIO_DIAS;
      });

      for (const premio of premiosPorVencer) {
        await sendPrizeExpiringReminderEmail(
          cliente.correo,
          cliente.nombre,
          premio.nombre,
          premio.vencimiento as string,
          cliente.public_token
        );

        premiosEnviados.push({
          clienteId: cliente.id,
          correo: cliente.correo,
          premio: premio.nombre,
          vencimiento: premio.vencimiento as string,
        });
      }

      const sellosActuales = cliente.sellos ?? 0;
      const fechaUltimoSello = cliente.fecha_ultimo_sello;

      if (!fechaUltimoSello) continue;
      if (sellosActuales <= 0 || sellosActuales >= META_SELLOS) continue;

      const fechaUltimoSelloDate = new Date(fechaUltimoSello);
      const diffUltimoSelloMs = ahora.getTime() - fechaUltimoSelloDate.getTime();
      const diffUltimoSelloDias = diffUltimoSelloMs / (1000 * 60 * 60 * 24);

      if (diffUltimoSelloDias < INACTIVIDAD_DIAS) continue;

      const fechaUltimoRecordatorio = cliente.fecha_ultimo_recordatorio_inactividad;

      if (fechaUltimoRecordatorio) {
        const fechaUltimoRecordatorioDate = new Date(fechaUltimoRecordatorio);
        const diffRecordatorioMs =
          ahora.getTime() - fechaUltimoRecordatorioDate.getTime();
        const diffRecordatorioDias = diffRecordatorioMs / (1000 * 60 * 60 * 24);

        if (diffRecordatorioDias < RECORDATORIO_INACTIVIDAD_DIAS) continue;
      }

      await sendReactivationEmail(
        cliente.correo,
        cliente.nombre,
        sellosActuales,
        META_SELLOS,
        cliente.public_token
      );

      const { error: updateError } = await supabase
        .from("clientes")
        .update({
          fecha_ultimo_recordatorio_inactividad: ahora.toISOString(),
        })
        .eq("id", cliente.id);

      if (updateError) {
        console.error(
          "Error actualizando fecha_ultimo_recordatorio_inactividad:",
          updateError
        );
      }

      reactivacionesEnviadas.push({
        clienteId: cliente.id,
        correo: cliente.correo,
        sellosActuales,
        fechaUltimoSello,
      });
    }

    return NextResponse.json({
      ok: true,
      resumen: {
        premiosPorVencer: premiosEnviados.length,
        reactivaciones: reactivacionesEnviadas.length,
      },
      premiosEnviados,
      reactivacionesEnviadas,
    });
  } catch (error) {
    console.error("Error en /api/daily-crm:", error);

    return NextResponse.json(
      { error: "No se pudo ejecutar el CRM diario" },
      { status: 500 }
    );
  }
}