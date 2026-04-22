import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Token no encontrado." },
        { status: 400 }
      );
    }

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id, correo, email_verificado, auth_user_id")
      .eq("token_verificacion", token)
      .maybeSingle();

    if (clienteError || !cliente) {
      return NextResponse.json(
        { ok: false, message: "Token inválido o cliente no encontrado." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("clientes")
      .update({
        email_verificado: true,
        token_verificacion: null,
      })
      .eq("id", cliente.id);

    if (updateError) {
      console.error("Error actualizando cliente en register/verify:", updateError);

      return NextResponse.json(
        { ok: false, message: "No se pudo verificar el correo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      correo: cliente.correo,
    });
  } catch (error) {
    console.error("ERROR VERIFY REGISTER:", error);

    return NextResponse.json(
      { ok: false, message: "Error interno al verificar el registro." },
      { status: 500 }
    );
  }
}