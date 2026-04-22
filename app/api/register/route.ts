import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";
import { sendRegisterVerificationEmail } from "../../../lib/email/sendRegisterVerificationEmail";

function generarPublicToken() {
  return crypto.randomUUID();
}

export async function POST(req: Request) {
  try {
    const { nombre, correo, telefono, password } = await req.json();

    if (!nombre || !correo || !telefono || !password) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const nombreLimpio = String(nombre).trim();
    const email = String(correo).trim().toLowerCase();
    const telefonoLimpio = String(telefono).trim();

    let cliente: any = null;

    // 1. Buscar cliente existente por correo
    const { data: clienteExistente, error: clienteExistenteError } = await supabase
      .from("clientes")
      .select("*")
      .eq("correo", email)
      .maybeSingle();

    if (clienteExistenteError) {
      console.error("Error buscando cliente existente:", clienteExistenteError);
      return NextResponse.json(
        { error: "Error buscando cliente existente" },
        { status: 500 }
      );
    }

    // 2. Si ya existe y ya tiene auth_user_id, no duplicar cuenta
    if (clienteExistente?.auth_user_id) {
      return NextResponse.json(
        { error: "Ya existe una cuenta creada con este correo. Inicia sesión." },
        { status: 400 }
      );
    }

    // 3. Crear o reutilizar cliente
    if (clienteExistente) {
      const publicToken = clienteExistente.public_token || generarPublicToken();

      const { data: clienteActualizado, error: updateClienteError } = await supabase
        .from("clientes")
        .update({
          nombre: nombreLimpio || clienteExistente.nombre,
          telefono: telefonoLimpio || clienteExistente.telefono,
          public_token: publicToken,
        })
        .eq("id", clienteExistente.id)
        .select()
        .single();

      if (updateClienteError || !clienteActualizado) {
        console.error("Error actualizando cliente existente:", updateClienteError);
        return NextResponse.json(
          { error: "No se pudo actualizar el cliente existente." },
          { status: 500 }
        );
      }

      cliente = clienteActualizado;
    } else {
      const { data: nuevoCliente, error: nuevoClienteError } = await supabase
        .from("clientes")
        .insert({
          nombre: nombreLimpio,
          correo: email,
          telefono: telefonoLimpio,
          public_token: generarPublicToken(),
          email_verificado: false,
          tarjeta_activa: false,
        })
        .select()
        .single();

      if (nuevoClienteError || !nuevoCliente) {
        console.error("Error creando cliente:", nuevoClienteError);
        return NextResponse.json(
          { error: "Error creando cliente" },
          { status: 500 }
        );
      }

      cliente = nuevoCliente;
    }

    // 4. Crear usuario auth
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

    // 5. Generar token de verificación del flujo de cuenta
    const token = generateVerificationToken();

    const { error: vinculoError } = await supabase
      .from("clientes")
      .update({
        auth_user_id: authData.user.id,
        token_verificacion: token,
        token_verificacion_creado_en: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    if (vinculoError) {
      console.error("Error vinculando auth_user_id al cliente:", vinculoError);
      return NextResponse.json(
        { error: "No se pudo vincular la cuenta al cliente." },
        { status: 500 }
      );
    }

    // 6. Enviar correo del flujo de cuenta
    await sendRegisterVerificationEmail(cliente.correo, cliente.nombre, token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/register:", error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}