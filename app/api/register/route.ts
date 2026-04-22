import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";
import { sendVerificationEmail } from "../../../lib/email/sendVerificationEmail";
import { sendRegisterVerificationEmail } from "../../../lib/email/sendRegisterVerificationEmail";


export async function POST(req: Request) {
  try {
    const { nombre, correo, telefono } = await req.json();

    if (!nombre || !correo) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const email = correo.trim().toLowerCase();

    // 🔍 Buscar cliente existente
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("*")
      .eq("correo", email)
      .maybeSingle();

    let cliente;

    if (clienteExistente) {
      // ✅ REUTILIZAR cliente existente
      cliente = clienteExistente;
    } else {
      // 🆕 Crear nuevo cliente
      const { data: nuevoCliente, error } = await supabase
        .from("clientes")
        .insert({
          nombre,
          correo: email,
          telefono,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "Error creando cliente" }, { status: 500 });
      }

      cliente = nuevoCliente;
    }

    // 🔑 Generar token nuevo SIEMPRE
    const token = generateVerificationToken();

    await supabase
      .from("clientes")
      .update({
        token_verificacion: token,
        token_verificacion_creado_en: new Date().toISOString(),
      })
      .eq("id", cliente.id);

    // 📧 Enviar correo
    await sendRegisterVerificationEmail(cliente.correo, cliente.nombre, token);

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}