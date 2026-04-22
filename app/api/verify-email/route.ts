import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { sendCardActivatedEmail } from "../../../lib/email/sendCardActivatedEmail";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token no encontrado" },
        { status: 400 }
      );
    }

    const { data: cliente, error: errorBusqueda } = await supabase
      .from("clientes")
      .select("*")
      .eq("token_verificacion", token)
      .single();

    if (errorBusqueda || !cliente) {
      return NextResponse.json(
        { error: "Token inválido o cliente no encontrado" },
        { status: 404 }
      );
    }

    if (cliente.email_verificado && cliente.tarjeta_activa) {
      return NextResponse.json({
        ok: true,
        ya_verificado: true,
        public_token: cliente.public_token,
      });
    }

    const { error: errorUpdate } = await supabase
      .from("clientes")
      .update({
        email_verificado: true,
        tarjeta_activa: true,
        fecha_activacion: new Date().toISOString(),
        token_verificacion: null,
      })
      .eq("id", cliente.id);

    if (errorUpdate) {
      console.error("Error actualizando cliente:", errorUpdate);

      return NextResponse.json(
        { error: "No se pudo activar la tarjeta" },
        { status: 500 }
      );
    }

    try {
      await sendCardActivatedEmail(
        cliente.correo,
        cliente.nombre,
        cliente.public_token
      );
    } catch (emailError) {
      console.error("Error enviando correo de tarjeta activa:", emailError);
    }

    return NextResponse.json({
      ok: true,
      public_token: cliente.public_token,
      correo: cliente.correo,
    });
  } catch (error) {
    console.error("Error en /api/verify-email:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al verificar el correo" },
      { status: 500 }
    );
  }
}