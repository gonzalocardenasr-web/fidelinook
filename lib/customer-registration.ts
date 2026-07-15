import { supabaseAdmin } from "./supabase-admin";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "./customer-events";

export type CustomerRegistrationSource =
  | "card_registration"
  | "account_registration"
  | "operation"
  | "import";

export type CreateCustomerInput = {
  nombre: string;
  correo: string;
  telefono: string;

  publicToken?: string;
  verificationToken?: string | null;
  verificationTokenCreatedAt?: string | Date | null;

  emailVerified?: boolean;
  cardActive?: boolean;

  acceptsTerms: boolean;
  acceptsMarketing?: boolean;
  marketingPreferenceDefined?: boolean;

  termsVersion?: string;
  acceptedAt?: string | Date | null;

  authUserId?: string | null;
};

export type CreatedCustomer = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  public_token: string;
  auth_user_id?: string | null;
  email_verificado?: boolean | null;
  tarjeta_activa?: boolean | null;
};

export type CustomerRegisteredEventInput = {
  customer: CreatedCustomer;
  source: CustomerRegistrationSource;
  actorRole?: string | null;
  actorIdentifier?: string | null;
  metadata?: Record<string, unknown>;
};

export class CustomerRegistrationError extends Error {
  code: string;
  status: number;

  constructor({
    code,
    message,
    status,
  }: {
    code: string;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "CustomerRegistrationError";
    this.code = code;
    this.status = status;
  }
}

function normalizeRequiredText(value: unknown, fieldName: string) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new CustomerRegistrationError({
      code: "INVALID_CUSTOMER_DATA",
      message: `${fieldName} es obligatorio.`,
      status: 400,
    });
  }

  return normalized;
}

function normalizeEmail(value: unknown) {
  const email = normalizeRequiredText(value, "El correo").toLowerCase();

  const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!basicEmailPattern.test(email)) {
    throw new CustomerRegistrationError({
      code: "INVALID_EMAIL",
      message: "El correo indicado no es válido.",
      status: 400,
    });
  }

  return email;
}

function normalizeDate(value?: string | Date | null): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new CustomerRegistrationError({
      code: "INVALID_DATE",
      message: "Una de las fechas del registro no es válida.",
      status: 400,
    });
  }

  return date.toISOString();
}

export async function findCustomerDuplicates({
  correo,
  telefono,
}: {
  correo: string;
  telefono: string;
}) {
  const normalizedEmail = normalizeEmail(correo);
  const normalizedPhone = normalizeRequiredText(telefono, "El teléfono");

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nombre, correo, telefono, auth_user_id")
    .or(`correo.eq.${normalizedEmail},telefono.eq.${normalizedPhone}`);

  if (error) {
    throw new CustomerRegistrationError({
      code: "CUSTOMER_DUPLICATE_CHECK_FAILED",
      message: "No se pudo validar si el cliente ya está registrado.",
      status: 500,
    });
  }

  const customers = data || [];

  const emailCustomer =
    customers.find(
      (customer) =>
        String(customer.correo || "")
          .trim()
          .toLowerCase() === normalizedEmail,
    ) || null;

  const phoneCustomer =
    customers.find(
      (customer) => String(customer.telefono || "").trim() === normalizedPhone,
    ) || null;

  return {
    emailCustomer,
    phoneCustomer,
  };
}

export async function createCustomerRecord(
  input: CreateCustomerInput,
): Promise<CreatedCustomer> {
  const nombre = normalizeRequiredText(input.nombre, "El nombre");
  const correo = normalizeEmail(input.correo);
  const telefono = normalizeRequiredText(input.telefono, "El teléfono");

  if (!input.acceptsTerms) {
    throw new CustomerRegistrationError({
      code: "TERMS_NOT_ACCEPTED",
      message: "Debes aceptar los términos y condiciones.",
      status: 400,
    });
  }

  const { emailCustomer, phoneCustomer } = await findCustomerDuplicates({
    correo,
    telefono,
  });

  if (emailCustomer && phoneCustomer) {
    throw new CustomerRegistrationError({
      code: "CUSTOMER_EMAIL_AND_PHONE_EXISTS",
      message: "Ya existe un cliente registrado con ese correo y teléfono.",
      status: 409,
    });
  }

  if (emailCustomer) {
    throw new CustomerRegistrationError({
      code: "CUSTOMER_EMAIL_EXISTS",
      message: "Ya existe un cliente registrado con ese correo.",
      status: 409,
    });
  }

  if (phoneCustomer) {
    throw new CustomerRegistrationError({
      code: "CUSTOMER_PHONE_EXISTS",
      message: "Ya existe un cliente registrado con ese teléfono.",
      status: 409,
    });
  }

  const publicToken =
    String(input.publicToken || "").trim() || crypto.randomUUID();

  const acceptedAt =
    normalizeDate(input.acceptedAt) || new Date().toISOString();

  const verificationTokenCreatedAt = normalizeDate(
    input.verificationTokenCreatedAt,
  );

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({
      nombre,
      correo,
      telefono,

      sellos: 0,
      premios: [],

      public_token: publicToken,

      email_verificado: Boolean(input.emailVerified),
      tarjeta_activa: Boolean(input.cardActive),

      token_verificacion: String(input.verificationToken || "").trim() || null,

      token_verificacion_creado_en: verificationTokenCreatedAt,

      acepta_terminos: true,
      acepta_marketing: Boolean(input.acceptsMarketing),

      marketing_preferencia_definida: Boolean(input.marketingPreferenceDefined),

      fecha_aceptacion: acceptedAt,
      version_terminos: String(input.termsVersion || "v1.0").trim(),

      auth_user_id: String(input.authUserId || "").trim() || null,
    })
    .select(
      `
    id,
    nombre,
    correo,
    telefono,
    public_token,
    auth_user_id,
    email_verificado,
    tarjeta_activa
    `,
    )
    .single();

  if (error || !data) {
    console.error("Error creando registro central de cliente:", error);

    throw new CustomerRegistrationError({
      code: "CUSTOMER_CREATE_FAILED",
      message: "No se pudo crear el cliente.",
      status: 500,
    });
  }

  return data as CreatedCustomer;
}

export async function linkCustomerAuthUser({
  customerId,
  authUserId,
  verificationToken,
  verificationTokenCreatedAt,
}: {
  customerId: number;
  authUserId: string;
  verificationToken?: string | null;
  verificationTokenCreatedAt?: string | Date | null;
}) {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new CustomerRegistrationError({
      code: "INVALID_CUSTOMER_ID",
      message: "El cliente indicado no es válido.",
      status: 400,
    });
  }

  const normalizedAuthUserId = normalizeRequiredText(
    authUserId,
    "El usuario de autenticación",
  );

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({
      auth_user_id: normalizedAuthUserId,
      token_verificacion: String(verificationToken || "").trim() || null,
      token_verificacion_creado_en: normalizeDate(verificationTokenCreatedAt),
    })
    .eq("id", customerId)
    .select(
      `
      id,
      nombre,
      correo,
      telefono,
      public_token,
      auth_user_id,
      email_verificado,
      tarjeta_activa,
      created_at,
      created_At
    `,
    )
    .single();

  if (error || !data) {
    console.error("Error vinculando usuario Auth al cliente:", error);

    throw new CustomerRegistrationError({
      code: "CUSTOMER_AUTH_LINK_FAILED",
      message: "No se pudo vincular la cuenta de acceso al cliente.",
      status: 500,
    });
  }

  return data as CreatedCustomer;
}

export async function recordCustomerRegisteredEvent({
  customer,
  source,
  actorRole,
  actorIdentifier,
  metadata,
}: CustomerRegisteredEventInput) {
  return recordCustomerEvent({
    customerId: customer.id,
    eventType: "customer.registered",
    sourceModule: "customers",
    sourceEntityType: "customer",
    sourceEntityId: customer.id,
    actorRole,
    actorIdentifier,
    occurredAt: new Date(),
    idempotencyKey: buildCustomerEventIdempotencyKey([
      "customer-registered",
      customer.id,
    ]),
    metadata: {
      registrationSource: source,
      emailVerified: customer.email_verificado ?? false,
      cardActive: customer.tarjeta_activa ?? false,
      hasAuthUser: Boolean(customer.auth_user_id),
      ...metadata,
    },
  });
}

export async function deleteCustomerRecord(customerId: number) {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("clientes")
    .delete()
    .eq("id", customerId);

  if (error) {
    console.error(
      "No se pudo revertir el registro del cliente:",
      customerId,
      error,
    );

    return false;
  }

  return true;
}

export function getCustomerRegistrationErrorResponse(error: unknown) {
  if (error instanceof CustomerRegistrationError) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      code: "UNEXPECTED_CUSTOMER_REGISTRATION_ERROR",
      message: "Ocurrió un error inesperado al registrar el cliente.",
    },
  };
}
