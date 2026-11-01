import { CreditProductType, CreditType } from "@prisma/client";

export type AmortizationInput = {
  principalAmount: number;
  interestRate: number;
  installmentCount: number;
  type: CreditType;
  productType?: CreditProductType;
  startDate: Date;
  weeklyCollectionDay?: number | null;
};

export type AmortizationInstallment = {
  installmentNumber: number;
  dueDate: Date;
  scheduledAmount: number;
  principalComponent: number;
  interestComponent: number;
};

export type AmortizationResult = {
  interestAmount: number;
  totalAmount: number;
  installmentAmount: number;
  expectedEndDate: Date;
  installments: AmortizationInstallment[];
};

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDailyDueDate(startDate: Date, index: number) {
  const d = new Date(startDate);
  let count = 0;
  while (count < index) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) {
      count++;
    }
  }
  return d;
}

function getWeeklyDueDate(startDate: Date, weeklyCollectionDay: number, index: number) {
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + index * 7);
  return d;
}

export function buildAmortizationSchedule(input: AmortizationInput): AmortizationResult {
  if (input.productType === "express") {
    return buildExpressAmortizationSchedule(input);
  }

  const principalCents = Math.round(input.principalAmount * 100);

  // Interes fijo simple:
  // interest_amount = principal_amount * interest_rate.
  // Ejemplo conceptual: una tasa 0.20 representa 20% sobre el capital completo del credito.
  const interestCents = Math.round(input.principalAmount * input.interestRate * 100);

  // Total a pagar del credito:
  // total_amount = principal_amount + interest_amount.
  const totalCents = principalCents + interestCents;

  // La cuota base se reparte en centavos para evitar errores de punto flotante.
  // Los sobrantes de redondeo se agregan a las ultimas cuotas para que la suma exacta cierre.
  const basePrincipalCents = Math.floor(principalCents / input.installmentCount);
  const principalRemainder = principalCents % input.installmentCount;
  const baseInterestCents = Math.floor(interestCents / input.installmentCount);
  const interestRemainder = interestCents % input.installmentCount;

  const installments = Array.from({ length: input.installmentCount }, (_, index) => {
    const installmentNumber = index + 1;

    // Fecha esperada:
    // credito diario => startDate omitiendo domingos.
    // credito semanal => startDate + (index * 7) dias.
    const dueDate =
      input.type === "daily"
        ? getDailyDueDate(input.startDate, index)
        : input.type === "biweekly"
          ? addDays(input.startDate, index * 15)
          : getWeeklyDueDate(input.startDate, input.weeklyCollectionDay ?? input.startDate.getUTCDay(), index);

    const principalComponentCents =
      basePrincipalCents + (index >= input.installmentCount - principalRemainder ? 1 : 0);
    const interestComponentCents =
      baseInterestCents + (index >= input.installmentCount - interestRemainder ? 1 : 0);

    return {
      installmentNumber,
      dueDate,
      principalComponent: principalComponentCents / 100,
      interestComponent: interestComponentCents / 100,
      // Monto programado:
      // scheduled_amount = principal_component + interest_component.
      scheduledAmount: (principalComponentCents + interestComponentCents) / 100,
    };
  });

  const expectedEndDate = installments[installments.length - 1]?.dueDate ?? input.startDate;

  return {
    interestAmount: interestCents / 100,
    totalAmount: totalCents / 100,
    installmentAmount: roundCurrency(totalCents / 100 / input.installmentCount),
    expectedEndDate,
    installments,
  };
}

function buildExpressAmortizationSchedule(input: AmortizationInput): AmortizationResult {
  const principalCents = Math.round(input.principalAmount * 100);

  // Credito express:
  // tasa semanal fija = 5% sobre el capital original.
  // interes_semanal = principal_amount * 0.05.
  const weeklyInterestCents = Math.round(input.principalAmount * 0.05 * 100);

  // Plazo express:
  // 4 pagos semanales. Los primeros 3 pagan solo interes.
  // El cuarto pago liquida capital completo + ultimo interes semanal.
  const installmentCount = 4;
  const interestCents = weeklyInterestCents * installmentCount;
  const totalCents = principalCents + interestCents;
  const weeklyCollectionDay = input.weeklyCollectionDay ?? input.startDate.getUTCDay();

  const installments = Array.from({ length: installmentCount }, (_, index) => {
    const installmentNumber = index + 1;
    const isFinalInstallment = installmentNumber === installmentCount;
    const principalComponentCents = isFinalInstallment ? principalCents : 0;
    const scheduledCents = principalComponentCents + weeklyInterestCents;

    return {
      installmentNumber,
      dueDate: getWeeklyDueDate(input.startDate, weeklyCollectionDay, installmentNumber),
      scheduledAmount: scheduledCents / 100,
      principalComponent: principalComponentCents / 100,
      interestComponent: weeklyInterestCents / 100,
    };
  });

  return {
    interestAmount: interestCents / 100,
    totalAmount: totalCents / 100,
    installmentAmount: weeklyInterestCents / 100,
    expectedEndDate: installments[installments.length - 1]?.dueDate ?? input.startDate,
    installments,
  };
}
