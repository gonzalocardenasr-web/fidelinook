import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";
import { sendRegisterVerificationEmail } from "../../../lib/email/sendRegisterVerificationEmail";

function generarPublicToken() {
  return crypto.randomUUID();
}

export async function POST(req: Request) {
  let clienteIdCreado: string | null = null;
  let authUserIdCreado: string | null = null;

  try {
    const {
      nombre,
      correo,
      telefono,
      password,
      aceptaTerminos,
      aceptaMarketing,
    } = await req.json();

    if (!nombre || !correo || !telefono || !password) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    if (!aceptaTerminos) {
      return NextResponse.json(
        { error: "Debes aceptar los términos y condiciones." },
        { status: 400 }
      );
    }

    const nombreLimpio = String(nombre).trim();
    const email = String(correo).trim().toLowerCase();
    const telefonoLimpio = String(telefono).trim();

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

    // 2. Si ya existe un cliente con este correo, el usuario debe continuar desde su tarjeta
    if (clienteExistente) {
      return NextResponse.json(
        {
          error: "Este correo ya tiene una tarjeta activa.",
          code: "CLIENT_EXISTS_WITH_CARD",
        },
        { status: 400 }
      );
    }

    // 3. Crear cliente nuevo
    const { data: nuevoCliente, error: nuevoClienteError } = await supabase
      .from("clientes")
      .insert({
        nombre: nombreLimpio,
        correo: email,
        telefono: telefonoLimpio,
        public_token: generarPublicToken(),
        email_verificado: false,
        tarjeta_activa: false,
        acepta_terminos: true,
        acepta_marketing: Boolean(aceptaMarketing),
        fecha_aceptacion: new Date().toISOString(),
        version_terminos: "v1.0", 
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

    clienteIdCreado = nuevoCliente.id;

    // 4. Crear usuario auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("Error creando auth user:", authError);

      if (clienteIdCreado) {
        const { error: rollbackClienteError } = await supabase
          .from("clientes")
          .delete()
          .eq("id", clienteIdCreado);

        if (rollbackClienteError) {
          console.error("Error eliminando cliente tras fallo de auth:", rollbackClienteError);
        }
      }

      return NextResponse.json(
        { error: authError?.message || "No se pudo crear la cuenta de acceso." },
        { status: 500 }
      );
    }

    authUserIdCreado = authData.user.id;

    // 5. Generar token de verificación del flujo de cuenta
    const token = generateVerificationToken();

    const { error: vinculoError } = await supabase
      .from("clientes")
      .update({
        auth_user_id: authUserIdCreado,
        token_verificacion: token,
        token_verificacion_creado_en: new Date().toISOString(),
      })
      .eq("id", clienteIdCreado);

    if (vinculoError) {
      console.error("Error vinculando auth_user_id al cliente:", vinculoError);

      if (authUserIdCreado) {
        const { error: rollbackAuthError } =
          await supabaseAdmin.auth.admin.deleteUser(authUserIdCreado);

        if (rollbackAuthError) {
          console.error("Error eliminando auth user tras fallo de vínculo:", rollbackAuthError);
        }
      }

      if (clienteIdCreado) {
        const { error: rollbackClienteError } = await supabase
          .from("clientes")
          .delete()
          .eq("id", clienteIdCreado);

        if (rollbackClienteError) {
          console.error("Error eliminando cliente tras fallo de vínculo:", rollbackClienteError);
        }
      }

      return NextResponse.json(
        { error: "No se pudo vincular la cuenta al cliente." },
        { status: 500 }
      );
    }

    // 6. Enviar correo del flujo de cuenta
    try {
      await sendRegisterVerificationEmail(email, nombreLimpio, token);
    } catch (emailError) {
      console.error("Error enviando correo de verificación de registro:", emailError);

      return NextResponse.json({
        ok: true,
        warning: "La cuenta fue creada, pero no se pudo enviar el correo de verificación.",
        code: "REGISTER_EMAIL_SEND_FAILED",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en /api/register:", error);

    if (authUserIdCreado) {
      const { error: rollbackAuthError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserIdCreado);

      if (rollbackAuthError) {
        console.error("Error eliminando auth user en catch general:", rollbackAuthError);
      }
    }

    if (clienteIdCreado) {
      const { error: rollbackClienteError } = await supabase
        .from("clientes")
        .delete()
        .eq("id", clienteIdCreado);

      if (rollbackClienteError) {
        console.error("Error eliminando cliente en catch general:", rollbackClienteError);
      }
    }

    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}