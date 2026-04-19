export function getSubscriptionCycle(startDateStr: string) {
  const startDate = new Date(startDateStr);
  const today = new Date();

  let monthsDiff =
    (today.getFullYear() - startDate.getFullYear()) * 12 +
    (today.getMonth() - startDate.getMonth());

  // Ajuste si aún no llega el día del mes
  if (today.getDate() < startDate.getDate()) {
    monthsDiff -= 1;
  }

  const cycleNumber = monthsDiff + 1;

  const cycleStartDate = new Date(startDate);
  cycleStartDate.setMonth(startDate.getMonth() + monthsDiff);

  const cycleEndDate = new Date(cycleStartDate);
  cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);

  return {
    cycleNumber,
    cycleStartDate,
    cycleEndDate,
  };
}