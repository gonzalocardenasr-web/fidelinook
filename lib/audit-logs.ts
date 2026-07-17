import "server-only";

import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "./supabase-admin";

export type AuditResult = "success" | "failure" | "warning";

export type RecordAuditLogInput = {
  module: string;
  action: string;

  entityType: string;
  entityId?: string | number | null;

  actorRole?: string | null;
  actorIdentifier?: string | null;

  result?: AuditResult;
  reason?: string | null;

  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;

  correlationId?: string | null;
  idempotencyKey?: string | null;
  occurredAt?: string | null;
};

export type RecordAuditLogResult = {
  auditLogId: number;
  created: boolean;
  duplicate: boolean;
};

type AuditRpcResult = {
  audit_log_id?: unknown;
  created?: unknown;
  duplicate?: unknown;
};

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeEntityId(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeAuditResult(value: unknown): AuditResult {
  const normalized = String(value ?? "success")
    .trim()
    .toLowerCase();

  if (
    normalized !== "success" &&
    normalized !== "failure" &&
    normalized !== "warning"
  ) {
    throw new Error("El resultado de auditoría no es válido.");
  }

  return normalized;
}

function normalizeRpcResponse(data: unknown): AuditRpcResult {
  /*
   * record_audit_log retorna jsonb y normalmente Supabase
   * lo entrega como un objeto. Se admite también un arreglo
   * de una posición para evitar depender del formato exacto
   * del cliente RPC.
   */
  const candidate = Array.isArray(data) ? data[0] : data;

  if (!candidate || typeof candidate !== "object") {
    throw new Error("La auditoría no entregó una respuesta válida.");
  }

  return candidate as AuditRpcResult;
}

function normalizeRpcBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return Boolean(value);
}

export function buildAuditIdempotencyKey(
  parts: Array<string | number | null | undefined>,
): string {
  return parts
    .filter(
      (part) =>
        part !== null && part !== undefined && String(part).trim() !== "",
    )
    .map((part) => String(part).trim().toLowerCase())
    .join(":");
}

export function createCorrelationId(prefix = "operation"): string {
  const normalizedPrefix = normalizeRequiredText(
    prefix,
    "El prefijo de correlación",
  );

  return `${normalizedPrefix}:${randomUUID()}`;
}

export async function recordAuditLog(
  input: RecordAuditLogInput,
): Promise<RecordAuditLogResult> {
  const rpcPayload = {
    p_module: normalizeRequiredText(input.module, "El módulo"),

    p_action: normalizeRequiredText(input.action, "La acción"),

    p_entity_type: normalizeRequiredText(
      input.entityType,
      "El tipo de entidad",
    ),

    p_entity_id: normalizeEntityId(input.entityId),

    p_actor_role: normalizeOptionalText(input.actorRole),

    p_actor_identifier: normalizeOptionalText(input.actorIdentifier),

    p_result: normalizeAuditResult(input.result),

    p_reason: normalizeOptionalText(input.reason),

    p_previous_state: input.previousState ?? null,

    p_new_state: input.newState ?? null,

    p_metadata: input.metadata ?? {},

    p_correlation_id: normalizeOptionalText(input.correlationId),

    p_idempotency_key: normalizeOptionalText(input.idempotencyKey),

    p_occurred_at: normalizeOptionalText(input.occurredAt),
  };

  const { data, error } = await supabaseAdmin.rpc(
    "record_audit_log",
    rpcPayload,
  );

  if (error) {
    throw new Error(`No se pudo registrar la auditoría: ${error.message}`);
  }

  const result = normalizeRpcResponse(data);

  const auditLogId = Number(result.audit_log_id);

  if (!Number.isInteger(auditLogId) || auditLogId <= 0) {
    throw new Error("La auditoría no entregó un identificador válido.");
  }

  return {
    auditLogId,
    created: normalizeRpcBoolean(result.created),
    duplicate: normalizeRpcBoolean(result.duplicate),
  };
}

/*
 * La auditoría es secundaria respecto de la operación
 * principal. Un fallo de auditoría se registra en logs,
 * pero no debe provocar que una venta, entrega o anulación
 * ya ejecutada sea informada como fallida.
 */
export async function recordAuditLogSafely(
  input: RecordAuditLogInput,
): Promise<RecordAuditLogResult | null> {
  try {
    return await recordAuditLog(input);
  } catch (error) {
    console.error("La operación continuó, pero falló su auditoría:", {
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      correlationId: input.correlationId ?? null,
      error,
    });

    return null;
  }
}
