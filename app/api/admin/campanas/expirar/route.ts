import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const { data: clientes, error } = await supabaseAdmin
      .from("clientes")
      .select("id, premios");

    if (error) {
      return NextResponse.json(
        { message: "Error cargando clientes" },
        { status: 500 }
      );
    }

    let totalActualizados = 0;

    for (const cliente of clientes || []) {
      if (!Array.isArray(cliente.premios)) continue;

      let cambio = false;

      const premiosActualizados = cliente.premios.map((p: any) => {
        if (
          p.estado === "activo" &&
          p.vencimiento &&
          new Date(p.vencimiento) < new Date()
        ) {
          cambio = true;
          return { ...p, estado: "caducado" };
        }
        return p;
      });

      if (cambio) {
        await supabaseAdmin
          .from("clientes")
          .update({ premios: premiosActualizados })
          .eq("id", cliente.id);

        totalActualizados += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      totalActualizados,
    });

  } catch (error) {
    console.error("Error expirando premios:", error);
    return NextResponse.json(
      { message: "Error expirando premios" },
      { status: 500 }
    );
  }
}