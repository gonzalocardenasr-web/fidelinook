import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { sendCardActivatedEmail } from "../../../lib/email/sendCardActivatedEmail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const correo = String(email || "").trim().toLowerCase();

    if (!correo) {
      return NextResponse.json(
        { error: "Debes ingresar un correo." },
        { status: 400 }
      );
    }

    const { data: cliente, error } = await supabase
      .from("clientes")
      .select("id, nombre, correo, public_token, tarjeta_activa, email_verificado")
      .eq("correo", correo)
      .maybeSingle();

    if (error) {
      console.error("Error buscando cliente para recuperar tarjeta:", error);
      return NextResponse.json(
        { error: "No se pudo procesar la solicitud." },
        { status: 500 }
      );
    }

    if (!cliente) {
      // Respuesta neutra para no revelar demasiado
      return NextResponse.json({
        ok: true,
        message:
          "Si existe una tarjeta asociada a este correo, te enviaremos un acceso a tu tarjeta.",
      });
    }

    if (!cliente.public_token) {
      return NextResponse.json(
        { error: "Este cliente no tiene una tarjeta disponible para recuperar." },
        { status: 400 }
      );
    }

    if (!cliente.tarjeta_activa || !cliente.email_verificado) {
      return NextResponse.json(
        {
          error:
            "Tu tarjeta aún no está activa. Primero debes verificar el correo con el que la registraste.",
        },
        { status: 400 }
      );
    }

    await sendCardActivatedEmail(
      cliente.correo,
      cliente.nombre,
      cliente.public_token
    );

    return NextResponse.json({
      ok: true,
      message:
        "Te enviamos un correo con el acceso a tu tarjeta Fideli-NooK.",
    });
  } catch (error) {
    console.error("Error en /api/recover-card:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al recuperar la tarjeta." },
      { status: 500 }
    );
  }
}