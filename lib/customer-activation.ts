import { supabaseAdmin } from "./supabase-admin";

export type CustomerActivationSource =
  | "card_verification"
  | "account_verification"
  | "operation"
  | "administrative";

export type ActivatedCustomer = {
  customerId: number;
  nombre: string;
  correo: string;
  publicToken: string;
  authUserId?: string | null;
  activated: boolean;
  alreadyActive: boolean;
  activationAt: string;
  eventId: number;
  eventCreated: boolean;
};

export class CustomerActivationError extends Error {
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
    this.name = "CustomerActivationError";
    this.code = code;
    this.status = status;
  }
}

type ActivationRpcResult = {
  customer_id?: unknown;
  nombre?: unknown;
  correo?: unknown;
  public_token?: unknown;
  auth_user_id?: unknown;
  activated?: unknown;
  already_active?: unknown;
  activation_at?: unknown;
  event_id?: unknown;
  event_created?: unknown;
};

export async function activateCustomerByToken({
  token,
  source,
}: {
  token: string;
  source: CustomerActivationSource;
}): Promise<ActivatedCustomer> {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new CustomerActivationError({
      code: "VERIFICATION_TOKEN_REQUIRED",
      message: "Token no encontrado.",
      status: 400,
    });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "activate_customer_by_token",
    {
      p_token: normalizedToken,
      p_activation_source: source,
    },
  );

  if (error) {
    const normalizedMessage = String(error.message || "");

    if (
      normalizedMessage.toLowerCase().includes("token inválido") ||
      normalizedMessage.toLowerCase().includes("cliente no encontrado")
    ) {
      throw new CustomerActivationError({
        code: "INVALID_VERIFICATION_TOKEN",
        message: "Token inválido o cliente no encontrado.",
        status: 404,
      });
    }

    console.error("Error activando cliente mediante RPC:", error);

    throw new CustomerActivationError({
      code: "CUSTOMER_ACTIVATION_FAILED",
      message: "No se pudo activar el cliente.",
      status: 500,
    });
  }

  if (!data || typeof data !== "object") {
    throw new CustomerActivationError({
      code: "INVALID_ACTIVATION_RESPONSE",
      message: "La activación no entregó una respuesta válida.",
      status: 500,
    });
  }

  const result = data as ActivationRpcResult;

  const customerId = Number(result.customer_id);
  const eventId = Number(result.event_id);

  const nombre = String(result.nombre || "").trim();
  const correo = String(result.correo || "").trim();
  const publicToken = String(result.public_token || "").trim();

  const activationAt = String(result.activation_at || "").trim();

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0 ||
    !Number.isInteger(eventId) ||
    eventId <= 0 ||
    !correo ||
    !publicToken ||
    !activationAt
  ) {
    throw new CustomerActivationError({
      code: "INVALID_ACTIVATION_RESPONSE",
      message: "La activación no entregó todos los datos requeridos.",
      status: 500,
    });
  }

  return {
    customerId,
    nombre,
    correo,
    publicToken,
    authUserId: result.auth_user_id ? String(result.auth_user_id) : null,
    activated: Boolean(result.activated),
    alreadyActive: Boolean(result.already_active),
    activationAt,
    eventId,
    eventCreated: Boolean(result.event_created),
  };
}

export function getCustomerActivationErrorResponse(error: unknown) {
  if (error instanceof CustomerActivationError) {
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
      code: "UNEXPECTED_CUSTOMER_ACTIVATION_ERROR",
      message: "Ocurrió un error inesperado al activar el cliente.",
    },
  };
}
