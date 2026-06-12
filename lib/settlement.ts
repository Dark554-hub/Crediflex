import { todayInMexicoAsUtcDate } from "@/lib/dates";

type SettlementInstallment = {
  dueDate: Date;
  paidAmount: unknown;
};

type SettlementPayment = {
  amount: unknown;
};

type SettlementCredit = {
  principalAmount: unknown;
  interestAmount: unknown;
  totalAmount: unknown;
  installmentCount: number;
  type: "daily" | "weekly";
  installments: SettlementInstallment[];
  payments: SettlementPayment[];
};

function startOfTodayUtc() {
  return todayInMexicoAsUtcDate();
}

function daysBetween(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / msPerDay);
}

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function calculateSettlement(credit: SettlementCredit) {
  const today = startOfTodayUtc();
  const installments = [...credit.installments].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  );
  const lastAccruedIndex = installments.findLastIndex(
    (installment) => daysBetween(installment.dueDate, today) >= 0,
  );
  const nextIndex = installments.findIndex(
    (installment) => daysBetween(today, installment.dueDate) > 0,
  );
  const nextInstallment = nextIndex >= 0 ? installments[nextIndex] : null;
  const daysUntilNext = nextInstallment ? daysBetween(today, nextInstallment.dueDate) : null;

  // Regla de fecha de referencia:
  // 1. Si el ultimo pago vencio hoy o ayer, se calcula con ese pago devengado.
  // 2. Si faltan 5 dias o menos para el siguiente pago, se calcula con ese proximo pago.
  // 3. En otro caso, se usa el ultimo pago devengado; si no hay, se usa el primer pago.
  let referenceIndex = Math.max(lastAccruedIndex, 0);
  if (daysUntilNext !== null && daysUntilNext <= 5) {
    referenceIndex = nextIndex;
  }

  const referenceInstallment = installments[referenceIndex] ?? installments[0];
  const elapsedPeriods = Math.min(referenceIndex + 1, credit.installmentCount);
  const totalPaymentsMade = credit.payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0,
  );
  const principal = Number(credit.principalAmount);
  const termInterest = Number(credit.interestAmount);
  const totalDebt = Number(credit.totalAmount);

  // La regla de liquidacion se calcula por semanas.
  // En creditos semanales, cada cuota equivale a una semana.
  // En creditos diarios, 7 cuotas equivalen a una semana y se redondea hacia arriba
  // para cobrar la semana devengada de la fecha de referencia.
  const periodCount =
    credit.type === "weekly"
      ? Math.max(credit.installmentCount, 1)
      : Math.max(Math.ceil(credit.installmentCount / 7), 1);
  const elapsedWeeks =
    credit.type === "weekly"
      ? elapsedPeriods
      : Math.max(Math.ceil(elapsedPeriods / 7), 1);
  const termInterestRate = principal > 0 ? termInterest / principal : 0;
  const periodInterestRate = termInterestRate / periodCount;
  const accruedInterestRate = periodInterestRate * elapsedWeeks;
  const accruedInterest = principal * accruedInterestRate;
  const fixedSettlementCharge = principal <= 3000 ? 100 : 200;
  const pendingDebt = Math.max(totalDebt - totalPaymentsMade, 0);

  // Formula solicitada para liquidacion:
  // interes_del_plazo / capital = tasa_total_del_plazo.
  // tasa_total_del_plazo / numero_de_semanas = tasa_semanal.
  // tasa_semanal * semanas_devengadas = tasa_devengada.
  // (1 + tasa_devengada) * capital = capital_con_interes_devengado.
  // capital_con_interes_devengado - pagos_realizados + cargo_fijo = monto_liquidacion.
  // El cargo fijo es $100 si el credito fue de $3,000 o menos, y $200 si fue de $4,000 o mas.
  // Para montos intermedios se aplica $200 por ser mayor a $3,000.
  const calculatedSettlement =
    principal * (1 + accruedInterestRate) - totalPaymentsMade + fixedSettlementCharge;
  // Descuento por liquidar antes:
  // la liquidacion nunca debe ser mayor que la deuda pendiente normal del credito.
  // Si el calculo con cargo fijo rebasa la deuda pendiente, se topa en deuda pendiente.
  const settlementBeforeDiscount = Math.min(calculatedSettlement, pendingDebt);
  const earlySettlementDiscount = Math.max(pendingDebt - settlementBeforeDiscount, 0);

  return {
    referenceDate: referenceInstallment?.dueDate ?? today,
    elapsedPeriods: elapsedWeeks,
    periodCount,
    periodInterest: roundCurrency(principal * periodInterestRate),
    periodInterestRate,
    accruedInterestRate,
    accruedInterest: roundCurrency(accruedInterest),
    paymentsMade: roundCurrency(totalPaymentsMade),
    fixedSettlementCharge,
    pendingDebt: roundCurrency(pendingDebt),
    earlySettlementDiscount: roundCurrency(earlySettlementDiscount),
    settlementBeforeDiscount: roundCurrency(Math.max(settlementBeforeDiscount, 0)),
  };
}
