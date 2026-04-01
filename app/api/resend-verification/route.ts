import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";
import { sendVerificationEmail } from "../../../lib/email/sendVerificationEmail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Falta el correo" },
        { status: 400 }
      );
    }

    const { data: cliente, error: errorBusqueda } = await supabase
      .from("clientes")
      .select("id, nombre, correo, email_verificado, tarjeta_activa")
      .eq("correo", email)
      .single();

    if (errorBusqueda || !cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (cliente.email_verificado && cliente.tarjeta_activa) {
      return NextResponse.json(
        { error: "Este correo ya fue verificado" },
        { status: 400 }
      );
    }

    const nuevoToken = generateVerificationToken();

    const { error: errorUpdate } = await supabase
      .from("clientes")
      .update({
        token_verificacion: nuevoToken,
        token_verificacion_creado_en: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    if (errorUpdate) {
      console.error("Error actualizando token:", errorUpdate);

      return NextResponse.json(
        { error: "No se pudo generar un nuevo token" },
        { status: 500 }
      );
    }

    await sendVerificationEmail(cliente.correo, cliente.nombre, nuevoToken);

    return NextResponse.json({
      ok: true,
      message: "Correo de verificación reenviado",
    });
  } catch (error) {
    console.error("Error en /api/resend-verification:", error);

    return NextResponse.json(
      { error: "No se pudo reenviar el correo de verificación" },
      { status: 500 }
    );
  }
}