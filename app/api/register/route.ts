import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";
import { sendRegisterVerificationEmail } from "../../../lib/email/sendRegisterVerificationEmail";

export async function POST(req: Request) {
  try {
    const { nombre, correo, telefono, password } = await req.json();

    if (!nombre || !correo || !password) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const email = correo.trim().toLowerCase();

    let cliente: any = null;

    // Buscar cliente existente
    const { data: clienteExistente, error: clienteExistenteError } = await supabase
      .from("clientes")
      .select("*")
      .eq("correo", email)
      .maybeSingle();

    if (clienteExistenteError) {
      return NextResponse.json(
        { error: "Error buscando cliente existente" },
        { status: 500 }
      );
    }

    if (clienteExistente) {
      cliente = clienteExistente;

      // Si ya tiene auth_user_id, no permitir crear otra cuenta
      if (cliente.auth_user_id) {
        return NextResponse.json(
          { error: "Ya existe una cuenta creada con este correo. Inicia sesión." },
          { status: 400 }
        );
      }
    } else {
      const { data: nuevoCliente, error: nuevoClienteError } = await supabase
        .from("clientes")
        .insert({
          nombre,
          correo: email,
          telefono,
        })
        .select()
        .single();

      if (nuevoClienteError || !nuevoCliente) {
        return NextResponse.json(
          { error: "Error creando cliente" },
          { status: 500 }
        );
      }

      cliente = nuevoCliente;
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("Error creando auth user:", authError);

      return NextResponse.json(
        { error: "No se pudo crear la cuenta de acceso." },
        { status: 500 }
      );
    }

    // Generar token de verificación para el flujo propio
    const token = generateVerificationToken();

    const { error: updateError } = await supabase
      .from("clientes")
      .update({
        auth_user_id: authData.user.id,
        token_verificacion: token,
        token_verificacion_creado_en: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    if (updateError) {
      console.error("Error actualizando cliente:", updateError);

      return NextResponse.json(
        { error: "No se pudo vincular la cuenta al cliente." },
        { status: 500 }
      );
    }

    await sendRegisterVerificationEmail(cliente.correo, cliente.nombre, token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/register:", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}