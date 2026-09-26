export type CashCountEntry = {
  denomination: number;
  quantity: number;
};

export type CashRecommendationEntry = CashCountEntry & {
  subtotal: number;
};

export type CashWithdrawalRecommendationStatus =
  | "exact"
  | "insufficient_cash"
  | "exact_composition_unavailable";

export type CashWithdrawalRecommendation = {
  countedAmount: number;
  targetRetainedAmount: number;
  retainedAmount: number;
  withdrawalAmount: number;
  retainedCashCount: CashRecommendationEntry[];
  withdrawalCashCount: CashRecommendationEntry[];
  exactTarget: boolean;
  status: CashWithdrawalRecommendationStatus;
};

const SMALL_DENOMINATION_MAX = 5000;

function normalizeCashCount(cashCount: CashCountEntry[]): CashCountEntry[] {
  return cashCount
    .map((entry) => ({
      denomination: Number(entry.denomination),
      quantity: Number(entry.quantity),
    }))
    .filter(
      (entry) =>
        Number.isInteger(entry.denomination) &&
        entry.denomination > 0 &&
        Number.isInteger(entry.quantity) &&
        entry.quantity >= 0,
    )
    .sort((a, b) => b.denomination - a.denomination);
}

function calculateTotal(cashCount: CashCountEntry[]): number {
  return cashCount.reduce(
    (total, entry) => total + entry.denomination * entry.quantity,
    0,
  );
}

function compareCompositionQuality(
  candidate: number[],
  current: number[],
  cashCount: CashCountEntry[],
): number {
  /*
   * Regla operacional:
   *
   * 1. El monto objetivo manda. Esta función solo compara
   *    composiciones que forman exactamente el mismo monto.
   *
   * 2. Preferimos conservar la mayor cantidad posible de dinero
   *    en denominaciones de hasta $5.000.
   *
   * 3. Si empatan, preferimos conservar más unidades de las
   *    denominaciones menores.
   *
   * 4. $10.000 y $20.000 quedan como denominaciones de complemento.
   */

  const candidateSmallValue = cashCount.reduce(
    (total, entry, index) =>
      entry.denomination <= SMALL_DENOMINATION_MAX
        ? total + entry.denomination * candidate[index]
        : total,
    0,
  );

  const currentSmallValue = cashCount.reduce(
    (total, entry, index) =>
      entry.denomination <= SMALL_DENOMINATION_MAX
        ? total + entry.denomination * current[index]
        : total,
    0,
  );

  if (candidateSmallValue !== currentSmallValue) {
    return candidateSmallValue > currentSmallValue ? 1 : -1;
  }

  /*
   * cashCount está ordenado de mayor a menor.
   * Recorremos al revés para comparar primero $10, $50, $100, etc.
   */
  for (let index = cashCount.length - 1; index >= 0; index -= 1) {
    const denomination = cashCount[index].denomination;

    if (denomination > SMALL_DENOMINATION_MAX) {
      continue;
    }

    if (candidate[index] !== current[index]) {
      return candidate[index] > current[index] ? 1 : -1;
    }
  }

  /*
   * Si el sencillo es equivalente, preferimos necesitar menos
   * unidades de billetes grandes.
   */
  const candidateLargeUnits = cashCount.reduce(
    (total, entry, index) =>
      entry.denomination > SMALL_DENOMINATION_MAX
        ? total + candidate[index]
        : total,
    0,
  );

  const currentLargeUnits = cashCount.reduce(
    (total, entry, index) =>
      entry.denomination > SMALL_DENOMINATION_MAX
        ? total + current[index]
        : total,
    0,
  );

  if (candidateLargeUnits !== currentLargeUnits) {
    return candidateLargeUnits < currentLargeUnits ? 1 : -1;
  }

  return 0;
}

export function recommendCashWithdrawal(
  rawCashCount: CashCountEntry[],
  requestedTargetRetainedAmount: number,
): CashWithdrawalRecommendation {
  const cashCount = normalizeCashCount(rawCashCount);
  const countedAmount = calculateTotal(cashCount);

  const targetRetainedAmount = Math.max(
    0,
    Math.trunc(requestedTargetRetainedAmount),
  );

  /*
   * Si físicamente existe menos efectivo que el objetivo,
   * no se puede retirar nada.
   *
   * Esto NO significa que la caja esté cuadrada.
   * La diferencia de caja se determina fuera de este helper.
   */
  if (countedAmount < targetRetainedAmount) {
    const retainedCashCount = cashCount.map((entry) => ({
      ...entry,
      subtotal: entry.denomination * entry.quantity,
    }));

    const withdrawalCashCount = cashCount.map((entry) => ({
      denomination: entry.denomination,
      quantity: 0,
      subtotal: 0,
    }));

    return {
      countedAmount,
      targetRetainedAmount,
      retainedAmount: countedAmount,
      withdrawalAmount: 0,
      retainedCashCount,
      withdrawalCashCount,
      exactTarget: false,
      status: "insufficient_cash",
    };
  }

  const unit = 10;

  if (targetRetainedAmount % unit !== 0) {
    throw new Error(
      "El monto objetivo debe ser compatible con las denominaciones de caja.",
    );
  }

  const targetUnits = targetRetainedAmount / unit;

  type State = {
    entries: number[];
  };

  let states = new Map<number, State>();

  states.set(0, {
    entries: cashCount.map(() => 0),
  });

  cashCount.forEach((entry, entryIndex) => {
    if (entry.denomination % unit !== 0) {
      throw new Error(
        `La denominación $${entry.denomination} no es compatible con la unidad mínima de caja.`,
      );
    }

    const denominationUnits = entry.denomination / unit;
    const nextStates = new Map(states);

    for (const [currentAmount, currentState] of states.entries()) {
      for (let quantity = 1; quantity <= entry.quantity; quantity += 1) {
        const nextAmount = currentAmount + denominationUnits * quantity;

        if (nextAmount > targetUnits) {
          break;
        }

        const nextEntries = [...currentState.entries];
        nextEntries[entryIndex] = quantity;

        const existingState = nextStates.get(nextAmount);

        if (
          !existingState ||
          compareCompositionQuality(
            nextEntries,
            existingState.entries,
            cashCount,
          ) > 0
        ) {
          nextStates.set(nextAmount, {
            entries: nextEntries,
          });
        }
      }
    }

    states = nextStates;
  });

  const retainedState = states.get(targetUnits);

  /*
   * Puede existir efectivo suficiente en total, pero no una combinación
   * física capaz de formar exactamente el objetivo.
   *
   * En ese caso no recomendamos un retiro incorrecto.
   */
  if (!retainedState) {
    const retainedCashCount = cashCount.map((entry) => ({
      ...entry,
      subtotal: entry.denomination * entry.quantity,
    }));

    const withdrawalCashCount = cashCount.map((entry) => ({
      denomination: entry.denomination,
      quantity: 0,
      subtotal: 0,
    }));

    return {
      countedAmount,
      targetRetainedAmount,
      retainedAmount: countedAmount,
      withdrawalAmount: 0,
      retainedCashCount,
      withdrawalCashCount,
      exactTarget: false,
      status: "exact_composition_unavailable",
    };
  }

  const retainedCashCount = cashCount.map((entry, index) => {
    const quantity = retainedState.entries[index] || 0;

    return {
      denomination: entry.denomination,
      quantity,
      subtotal: entry.denomination * quantity,
    };
  });

  const withdrawalCashCount = cashCount.map((entry, index) => {
    const retainedQuantity = retainedState.entries[index] || 0;
    const quantity = entry.quantity - retainedQuantity;

    return {
      denomination: entry.denomination,
      quantity,
      subtotal: entry.denomination * quantity,
    };
  });

  const retainedAmount = targetRetainedAmount;
  const withdrawalAmount = countedAmount - retainedAmount;

  return {
    countedAmount,
    targetRetainedAmount,
    retainedAmount,
    withdrawalAmount,
    retainedCashCount,
    withdrawalCashCount,
    exactTarget: true,
    status: "exact",
  };
}
