import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { generateVerificationToken } from "../../../lib/utils/generateVerificationToken";
import { sendRegisterVerificationEmail } from "../../../lib/email/sendRegisterVerificationEmail";
import {
  createCustomerRecord,
  deleteCustomerRecord,
  getCustomerRegistrationErrorResponse,
  linkCustomerAuthUser,
  recordCustomerRegisteredEvent,
} from "../../../lib/customer-registration";

export async function POST(req: Request) {
  let customerIdCreated: number | null = null;
  let authUserIdCreated: string | null = null;

  try {
    const body = await req.json();

    const nombre = String(body.nombre || "").trim();
    const correo = String(body.correo || "")
      .trim()
      .toLowerCase();
    const telefono = String(body.telefono || "").trim();
    const password = String(body.password || "");

    const aceptaTerminos = Boolean(body.aceptaTerminos);
    const aceptaMarketing = Boolean(body.aceptaMarketing);
    const marketingPreferenciaDefinida = Boolean(
      body.marketingPreferenciaDefinida,
    );

    if (!nombre || !correo || !telefono || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos.",
          code: "INVALID_REGISTER_DATA",
        },
        { status: 400 },
      );
    }

    if (!aceptaTerminos) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debes aceptar los términos y condiciones.",
          code: "TERMS_NOT_ACCEPTED",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          ok: false,
          error: "La contraseña debe tener al menos 6 caracteres.",
          code: "INVALID_PASSWORD",
        },
        { status: 400 },
      );
    }

    const verificationToken = generateVerificationToken();
    const registrationDate = new Date().toISOString();

    /*
     * 1. Crear el registro comercial del cliente usando el
     *    servicio común. Todavía no emitimos el evento porque
     *    falta crear y vincular la cuenta Auth.
     */
    const createdCustomer = await createCustomerRecord({
      nombre,
      correo,
      telefono,

      emailVerified: false,
      cardActive: false,

      acceptsTerms: aceptaTerminos,
      acceptsMarketing: aceptaMarketing,
      marketingPreferenceDefined: marketingPreferenciaDefinida,

      termsVersion: "v1.0",
      acceptedAt: registrationDate,
    });

    customerIdCreated = createdCustomer.id;

    /*
     * 2. Crear el usuario de autenticación.
     *
     * Se conserva email_confirm=true porque el flujo vigente
     * utiliza su propio token para activar la cuenta Nook.
     */
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("Error creando usuario de autenticación:", authError);

      const customerRollbackCompleted = await deleteCustomerRecord(
        createdCustomer.id,
      );

      if (!customerRollbackCompleted) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo crear la cuenta de acceso y el registro del cliente requiere revisión.",
            code: "AUTH_CREATE_FAILED_ROLLBACK_FAILED",
          },
          { status: 500 },
        );
      }

      customerIdCreated = null;

      return NextResponse.json(
        {
          ok: false,
          error: authError?.message || "No se pudo crear la cuenta de acceso.",
          code: "AUTH_CREATE_FAILED",
        },
        { status: 500 },
      );
    }

    authUserIdCreated = authData.user.id;

    /*
     * 3. Vincular el usuario Auth con el cliente y almacenar
     *    el token del flujo de verificación Nook.
     */
    let linkedCustomer;

    try {
      linkedCustomer = await linkCustomerAuthUser({
        customerId: createdCustomer.id,
        authUserId: authData.user.id,
        verificationToken,
        verificationTokenCreatedAt: registrationDate,
      });
    } catch (linkError) {
      console.error("Error vinculando usuario Auth con cliente:", linkError);

      const rollbackResult = await rollbackAccountRegistration({
        customerId: createdCustomer.id,
        authUserId: authData.user.id,
      });

      if (rollbackResult.authDeleted) {
        authUserIdCreated = null;
      }

      if (rollbackResult.customerDeleted) {
        customerIdCreated = null;
      }

      if (!rollbackResult.authDeleted || !rollbackResult.customerDeleted) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo vincular la cuenta y algunos registros requieren revisión administrativa.",
            code: "AUTH_LINK_FAILED_ROLLBACK_FAILED",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo vincular la cuenta al cliente.",
          code: "AUTH_LINK_FAILED",
        },
        { status: 500 },
      );
    }

    /*
     * 4. El registro se considera completo únicamente después
     *    de emitir el evento transversal.
     */
    try {
      await recordCustomerRegisteredEvent({
        customer: linkedCustomer,
        source: "account_registration",
        actorIdentifier: authData.user.id,
        metadata: {
          acceptsMarketing: aceptaMarketing,
          marketingPreferenceDefined: marketingPreferenciaDefinida,
          termsVersion: "v1.0",
          registrationFlow: "account",
        },
      });
    } catch (eventError) {
      console.error(
        "Cuenta creada, pero falló customer.registered:",
        eventError,
      );

      const rollbackResult = await rollbackAccountRegistration({
        customerId: createdCustomer.id,
        authUserId: authData.user.id,
      });

      if (rollbackResult.authDeleted) {
        authUserIdCreated = null;
      }

      if (rollbackResult.customerDeleted) {
        customerIdCreated = null;
      }

      if (!rollbackResult.authDeleted || !rollbackResult.customerDeleted) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "La cuenta fue creada, pero ocurrió un problema de trazabilidad. No repitas el registro y contacta al administrador.",
            code: "CUSTOMER_EVENT_FAILED_ROLLBACK_FAILED",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo completar el registro. La operación fue revertida.",
          code: "CUSTOMER_EVENT_FAILED",
        },
        { status: 500 },
      );
    }

    /*
     * 5. El correo es un efecto posterior.
     *
     * Si falla, mantenemos cliente, usuario Auth y evento para
     * permitir que el correo sea reenviado posteriormente.
     */
    try {
      await sendRegisterVerificationEmail(correo, nombre, verificationToken);
    } catch (emailError) {
      console.error(
        "Error enviando correo de verificación de registro:",
        emailError,
      );

      return NextResponse.json({
        ok: true,
        customerId: linkedCustomer.id,
        warning:
          "La cuenta fue creada, pero no se pudo enviar el correo de verificación.",
        code: "REGISTER_EMAIL_SEND_FAILED",
      });
    }

    return NextResponse.json({
      ok: true,
      customerId: linkedCustomer.id,
      code: "ACCOUNT_REGISTERED",
    });
  } catch (error) {
    console.error("Error en /api/register:", error);

    /*
     * Esta sección protege fallos inesperados posteriores a una
     * creación parcial. Si el flujo ya fue revertido, los IDs
     * correspondientes estarán en null.
     */
    if (authUserIdCreated || customerIdCreated) {
      const rollbackResult = await rollbackAccountRegistration({
        customerId: customerIdCreated,
        authUserId: authUserIdCreated,
      });

      if (
        (authUserIdCreated && !rollbackResult.authDeleted) ||
        (customerIdCreated && !rollbackResult.customerDeleted)
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Ocurrió un error y algunos registros requieren revisión administrativa. No repitas el registro.",
            code: "UNEXPECTED_REGISTER_ROLLBACK_FAILED",
          },
          { status: 500 },
        );
      }
    }

    const registrationError = getCustomerRegistrationErrorResponse(error);

    /*
     * Conservamos el código que app/register/page.tsx ya entiende
     * cuando el correo pertenece a una tarjeta existente.
     */
    if (
      registrationError.body.code === "CUSTOMER_EMAIL_EXISTS" ||
      registrationError.body.code === "CUSTOMER_EMAIL_AND_PHONE_EXISTS"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este correo ya tiene una tarjeta activa.",
          code: "CLIENT_EXISTS_WITH_CARD",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: registrationError.body.message,
        code: registrationError.body.code,
      },
      { status: registrationError.status },
    );
  }
}

async function rollbackAccountRegistration({
  customerId,
  authUserId,
}: {
  customerId?: number | null;
  authUserId?: string | null;
}) {
  let authDeleted = !authUserId;
  let customerDeleted = !customerId;

  /*
   * Eliminamos primero Auth. Así evitamos dejar un usuario de
   * acceso activo apuntando a un cliente que ya no existe.
   */
  if (authUserId) {
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (authDeleteError) {
      console.error(
        "Error eliminando usuario Auth durante rollback:",
        authDeleteError,
      );
    } else {
      authDeleted = true;
    }
  }

  if (customerId) {
    customerDeleted = await deleteCustomerRecord(customerId);
  }

  return {
    authDeleted,
    customerDeleted,
  };
}
