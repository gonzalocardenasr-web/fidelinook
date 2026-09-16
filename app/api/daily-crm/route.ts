import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabase-admin";
import { enqueueEmail } from "../../../lib/email/emailQueue";

type CustomerRow = {
  id: number;
  nombre: string | null;
  correo: string | null;
  public_token: string | null;
  fecha_ultimo_recordatorio_inactividad: string | null;
};

type LoyaltyAccountRow = {
  customer_id: number;
  current_stamp_balance: number | null;
};

type ActiveRewardRow = {
  id: number;
  customer_id: number;
  name: string;
  status: string;
  expires_at: string | null;
};

type PositiveMovementRow = {
  customer_id: number;
  stamp_delta: number;
  occurred_at: string;
};

const META_SELLOS = 7;
const VENTANA_PREMIO_DIAS = 5;
const RECORDATORIOS_PREMIO_DIAS = [5, 1] as const;
const INACTIVIDAD_DIAS = 14;
const RECORDATORIO_INACTIVIDAD_DIAS = 14;

function differenceInDays(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24);
}

function getSantiagoCalendarDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("No se pudo determinar la fecha calendario de Santiago.");
  }

  return `${year}-${month}-${day}`;
}

function calendarDaysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);

  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function getRewardExpirationReminderDays(
  expiresAt: string,
  now: Date,
): (typeof RECORDATORIOS_PREMIO_DIAS)[number] | null {
  const expiration = new Date(expiresAt);

  if (Number.isNaN(expiration.getTime())) {
    return null;
  }

  const todayInSantiago = getSantiagoCalendarDate(now);
  const expirationDateInSantiago = getSantiagoCalendarDate(expiration);
  const daysRemaining = calendarDaysBetween(
    todayInSantiago,
    expirationDateInSantiago,
  );

  return RECORDATORIOS_PREMIO_DIAS.includes(
    daysRemaining as (typeof RECORDATORIOS_PREMIO_DIAS)[number],
  )
    ? (daysRemaining as (typeof RECORDATORIOS_PREMIO_DIAS)[number])
    : null;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("Missing CRON_SECRET environment variable");

      return NextResponse.json(
        {
          ok: false,
          message: "Configuración de seguridad incompleta.",
        },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          ok: false,
          message: "No autorizado.",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") === "1";

    const ahora = new Date();
    const limitePremios = new Date(
      ahora.getTime() + VENTANA_PREMIO_DIAS * 24 * 60 * 60 * 1000,
    );

    /*
     * Datos base del cliente.
     *
     * No se consultan sellos, premios ni fecha_ultimo_sello desde clientes.
     * La única columna legacy que permanece es metadata propia del CRM:
     * fecha_ultimo_recordatorio_inactividad.
     */
    const { data: customersData, error: customersError } = await supabaseAdmin
      .from("clientes")
      .select(
        "id, nombre, correo, public_token, fecha_ultimo_recordatorio_inactividad",
      )
      .order("id", { ascending: true });

    if (customersError) {
      console.error("Error cargando clientes para Daily CRM:", customersError);

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudieron cargar los clientes.",
        },
        { status: 500 },
      );
    }

    const customers = (customersData || []) as CustomerRow[];

    /*
     * Fuente canónica del saldo vigente.
     */
    const { data: accountsData, error: accountsError } = await supabaseAdmin
      .from("loyalty_accounts")
      .select("customer_id, current_stamp_balance");

    if (accountsError) {
      console.error(
        "Error cargando cuentas de fidelización para Daily CRM:",
        accountsError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudieron cargar los saldos de fidelización.",
        },
        { status: 500 },
      );
    }

    /*
     * Premios activos que vencen dentro de los próximos cinco días.
     *
     * La consulta sólo define el universo candidato.
     * Más abajo se filtran exclusivamente los hitos T-5 y T-1.
     */
    const { data: rewardsData, error: rewardsError } = await supabaseAdmin
      .from("customer_rewards")
      .select("id, customer_id, name, status, expires_at")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .gte("expires_at", ahora.toISOString())
      .lte("expires_at", limitePremios.toISOString())
      .order("expires_at", { ascending: true });

    if (rewardsError) {
      console.error(
        "Error cargando premios activos para Daily CRM:",
        rewardsError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudieron cargar los premios activos.",
        },
        { status: 500 },
      );
    }

    /*
     * Último movimiento que realmente aumentó el saldo.
     *
     * stamp_delta > 0 cubre:
     * - sale_credit
     * - promotion_credit
     * - manual_credit
     * - opening_balance
     * - otros créditos canónicos positivos
     *
     * No se utiliza account.last_movement_at porque podría corresponder
     * a una reversa, conversión, débito o cualquier otro movimiento.
     */
    const { data: movementsData, error: movementsError } = await supabaseAdmin
      .from("loyalty_movements")
      .select("customer_id, stamp_delta, occurred_at")
      .gt("stamp_delta", 0)
      .order("occurred_at", { ascending: false });

    if (movementsError) {
      console.error(
        "Error cargando movimientos positivos para Daily CRM:",
        movementsError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudieron cargar los movimientos de fidelización.",
        },
        { status: 500 },
      );
    }

    const accountsByCustomerId = new Map<number, number>();

    for (const account of (accountsData || []) as LoyaltyAccountRow[]) {
      accountsByCustomerId.set(
        Number(account.customer_id),
        Math.max(0, Number(account.current_stamp_balance || 0)),
      );
    }

    const rewardsByCustomerId = new Map<number, ActiveRewardRow[]>();

    for (const reward of (rewardsData || []) as ActiveRewardRow[]) {
      const customerId = Number(reward.customer_id);
      const currentRewards = rewardsByCustomerId.get(customerId) || [];

      currentRewards.push(reward);
      rewardsByCustomerId.set(customerId, currentRewards);
    }

    /*
     * Como los movimientos vienen ordenados de más reciente a más antiguo,
     * conservamos solo el primero de cada cliente.
     */
    const latestPositiveMovementByCustomerId = new Map<
      number,
      PositiveMovementRow
    >();

    for (const movement of (movementsData || []) as PositiveMovementRow[]) {
      const customerId = Number(movement.customer_id);

      if (!latestPositiveMovementByCustomerId.has(customerId)) {
        latestPositiveMovementByCustomerId.set(customerId, movement);
      }
    }

    const premiosEncolados: Array<{
      clienteId: number;
      correo: string;
      rewardId: number;
      premio: string;
      vencimiento: string;
      reminderDays: number;
      reminderWindow: string;
      dryRun: boolean;
    }> = [];

    const reactivacionesEncoladas: Array<{
      clienteId: number;
      correo: string;
      sellosActuales: number;
      fechaUltimoCredito: string;
      dryRun: boolean;
    }> = [];

    const omitidos: Array<{
      clienteId: number;
      motivo: string;
    }> = [];

    for (const customer of customers) {
      const customerId = Number(customer.id);
      const email = String(customer.correo || "").trim();
      const customerName =
        String(customer.nombre || "").trim() || "Cliente Nook";
      const publicToken = String(customer.public_token || "").trim();

      if (!email || !publicToken) {
        omitidos.push({
          clienteId: customerId,
          motivo: "Cliente sin correo o token público.",
        });

        continue;
      }

      /*
       * Recordatorios de premios por vencer.
       */
      const expiringRewards = rewardsByCustomerId.get(customerId) || [];

      for (const reward of expiringRewards) {
        if (!reward.expires_at) continue;

        const reminderDays = getRewardExpirationReminderDays(
          reward.expires_at,
          ahora,
        );

        if (reminderDays === null) {
          continue;
        }

        const reminderWindow = `T${reminderDays}`;

        if (!dryRun) {
          await enqueueEmail({
            recipientEmail: email,
            emailType: "REWARD_EXPIRING",
            priority: 2,
            idempotencyKey: `reward-expiring:${reward.id}:${reminderWindow}`,
            payload: {
              nombre: customerName,
              premioNombre: reward.name,
              vencimiento: reward.expires_at,
              publicToken,
              reminderDays,
            },
            customerId,
            sourceType: "daily_crm_reward_expiring",
            sourceReference: `${reward.id}:${reminderWindow}`,
            maxAttempts: 5,
          });
        }

        premiosEncolados.push({
          clienteId: customerId,
          correo: email,
          rewardId: reward.id,
          premio: reward.name,
          vencimiento: reward.expires_at,
          reminderDays,
          reminderWindow,
          dryRun,
        });
      }

      /*
       * Reactivación por inactividad.
       */
      const currentStampBalance = accountsByCustomerId.get(customerId) || 0;

      if (currentStampBalance <= 0 || currentStampBalance >= META_SELLOS) {
        continue;
      }

      const latestPositiveMovement =
        latestPositiveMovementByCustomerId.get(customerId);

      if (!latestPositiveMovement) {
        continue;
      }

      const latestPositiveMovementAt = new Date(
        latestPositiveMovement.occurred_at,
      );

      if (Number.isNaN(latestPositiveMovementAt.getTime())) {
        omitidos.push({
          clienteId: customerId,
          motivo: "Último movimiento positivo con fecha inválida.",
        });

        continue;
      }

      const inactivityDays = differenceInDays(ahora, latestPositiveMovementAt);

      if (inactivityDays < INACTIVIDAD_DIAS) {
        continue;
      }

      const lastReminderAt = customer.fecha_ultimo_recordatorio_inactividad
        ? new Date(customer.fecha_ultimo_recordatorio_inactividad)
        : null;

      if (lastReminderAt && !Number.isNaN(lastReminderAt.getTime())) {
        const daysSinceLastReminder = differenceInDays(ahora, lastReminderAt);

        if (daysSinceLastReminder < RECORDATORIO_INACTIVIDAD_DIAS) {
          continue;
        }
      }

      if (!dryRun) {
        const reminderState =
          customer.fecha_ultimo_recordatorio_inactividad ||
          latestPositiveMovement.occurred_at;

        const queuedEmail = await enqueueEmail({
          recipientEmail: email,
          emailType: "CRM_REACTIVATION",
          priority: 3,
          idempotencyKey: ["crm-reactivation", customerId, reminderState].join(
            ":",
          ),
          payload: {
            nombre: customerName,
            sellosActuales: currentStampBalance,
            metaSellos: META_SELLOS,
            publicToken,
          },
          customerId,
          sourceType: "daily_crm_reactivation",
          sourceReference: String(customerId),
          maxAttempts: 5,
        });

        const { error: updateError } = await supabaseAdmin
          .from("clientes")
          .update({
            fecha_ultimo_recordatorio_inactividad: ahora.toISOString(),
          })
          .eq("id", customerId);

        if (updateError) {
          console.error("Error actualizando fecha de recordatorio CRM:", {
            customerId,
            emailQueueId: queuedEmail.id,
            error: updateError,
          });
        }
      }

      reactivacionesEncoladas.push({
        clienteId: customerId,
        correo: email,
        sellosActuales: currentStampBalance,
        fechaUltimoCredito: latestPositiveMovement.occurred_at,
        dryRun,
      });
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      sourceOfTruth: {
        balances: "loyalty_accounts",
        rewards: "customer_rewards",
        lastStampCredit: "loyalty_movements",
        reminderControl: "clientes.fecha_ultimo_recordatorio_inactividad",
      },
      resumen: {
        clientesEvaluados: customers.length,
        premiosPorVencerEncolados: premiosEncolados.length,
        reactivacionesEncoladas: reactivacionesEncoladas.length,
        omitidos: omitidos.length,
      },
      premiosEncolados,
      reactivacionesEncoladas,
      omitidos,
    });
  } catch (error) {
    console.error("Error en /api/daily-crm:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo ejecutar el CRM diario.",
      },
      { status: 500 },
    );
  }
}
