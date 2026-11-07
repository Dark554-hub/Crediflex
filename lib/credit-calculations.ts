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
  return Math.round(amount);
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
  const currentDay = d.getUTCDay();
  const diffToCollectionDay = (weeklyCollectionDay - currentDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diffToCollectionDay + index * 7);
  return d;
}

export function buildAmortizationSchedule(input: AmortizationInput): AmortizationResult {
  if (input.productType === "express") {
    return buildExpressAmortizationSchedule(input);
  }

  const principalWhole = Math.round(input.principalAmount);
  const interestWhole = Math.round(principalWhole * input.interestRate);
  const totalWhole = principalWhole + interestWhole;

  const basePrincipal = Math.floor(principalWhole / input.installmentCount);
  const principalRemainder = principalWhole % input.installmentCount;
  const baseInterest = Math.floor(interestWhole / input.installmentCount);
  const interestRemainder = interestWhole % input.installmentCount;

  const installments = Array.from({ length: input.installmentCount }, (_, index) => {
    const installmentNumber = index + 1;

    const dueDate =
      input.type === "daily"
        ? getDailyDueDate(input.startDate, index)
        : input.type === "biweekly"
          ? addDays(input.startDate, index * 15)
          : getWeeklyDueDate(input.startDate, input.weeklyCollectionDay ?? input.startDate.getUTCDay(), index);

    const principalComponent =
      basePrincipal + (index >= input.installmentCount - principalRemainder ? 1 : 0);
    const interestComponent =
      baseInterest + (index >= input.installmentCount - interestRemainder ? 1 : 0);

    return {
      installmentNumber,
      dueDate,
      principalComponent,
      interestComponent,
      scheduledAmount: principalComponent + interestComponent,
    };
  });

  const expectedEndDate = installments[installments.length - 1]?.dueDate ?? input.startDate;

  return {
    interestAmount: interestWhole,
    totalAmount: totalWhole,
    installmentAmount: roundCurrency(totalWhole / input.installmentCount),
    expectedEndDate,
    installments,
  };
}

function buildExpressAmortizationSchedule(input: AmortizationInput): AmortizationResult {
  const principalWhole = Math.round(input.principalAmount);
  const weeklyInterestWhole = Math.round(principalWhole * 0.05);

  const installmentCount = 4;
  const interestWhole = weeklyInterestWhole * installmentCount;
  const totalWhole = principalWhole + interestWhole;
  const weeklyCollectionDay = input.weeklyCollectionDay ?? input.startDate.getUTCDay();

  const installments = Array.from({ length: installmentCount }, (_, index) => {
    const installmentNumber = index + 1;
    const isFinalInstallment = installmentNumber === installmentCount;
    const principalComponent = isFinalInstallment ? principalWhole : 0;
    const scheduledAmount = principalComponent + weeklyInterestWhole;

    return {
      installmentNumber,
      dueDate: getWeeklyDueDate(input.startDate, weeklyCollectionDay, installmentNumber),
      scheduledAmount,
      principalComponent,
      interestComponent: weeklyInterestWhole,
    };
  });

  return {
    interestAmount: interestWhole,
    totalAmount: totalWhole,
    installmentAmount: weeklyInterestWhole,
    expectedEndDate: installments[installments.length - 1]?.dueDate ?? input.startDate,
    installments,
  };
}

