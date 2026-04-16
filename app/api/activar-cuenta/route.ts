import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, correo, password } = body as {
      token?: string;
      correo?: string;
      password?: string;
    };

    if (!token || !correo || !password) {
      return NextResponse.json(
        { message: "Faltan datos para activar la cuenta." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from("clientes")
      .select("id, correo, auth_user_id")
      .eq("public_token", token)
      .single();

    if (clienteError || !cliente) {
      return NextResponse.json(
        { message: "No se encontró un cliente válido para este enlace." },
        { status: 404 }
      );
    }

    if ((cliente.correo || "").toLowerCase() !== correo.trim().toLowerCase()) {
      return NextResponse.json(
        { message: "El correo no coincide con el cliente asociado a esta tarjeta." },
        { status: 400 }
      );
    }

    if (cliente.auth_user_id) {
      return NextResponse.json(
        { message: "Esta cuenta ya fue activada. Ingresa con tu clave." },
        { status: 409 }
      );
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: correo.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { message: authError?.message || "No se pudo crear el acceso." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("clientes")
      .update({
        auth_user_id: authUser.user.id,
      })
      .eq("id", cliente.id);

    if (updateError) {
      return NextResponse.json(
        { message: "Se creó el acceso, pero no se pudo vincular al cliente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Cuenta activada correctamente.",
    });
  } catch {
    return NextResponse.json(
      { message: "Ocurrió un error inesperado al activar la cuenta." },
      { status: 500 }
    );
  }
}