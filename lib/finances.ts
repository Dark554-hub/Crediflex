import { todayInMexicoAsUtcDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getFinanceSummary(options?: { days?: number; from?: Date; to?: Date }) {
  const today = todayInMexicoAsUtcDate();
  let start: Date;
  let endExclusive: Date;
  let dates: Date[];

  if (options?.from && options?.to) {
    start = new Date(Date.UTC(options.from.getUTCFullYear(), options.from.getUTCMonth(), options.from.getUTCDate()));
    const toUtc = new Date(Date.UTC(options.to.getUTCFullYear(), options.to.getUTCMonth(), options.to.getUTCDate()));
    endExclusive = addDaysUtc(toUtc, 1);
    
    dates = [];
    let curr = new Date(start);
    while (curr < endExclusive) {
      dates.push(new Date(curr));
      curr = addDaysUtc(curr, 1);
    }
  } else {
    const days = options?.days ?? 10;
    start = addDaysUtc(today, -(days - 1));
    endExclusive = addDaysUtc(today, 1);
    dates = Array.from({ length: days }, (_, index) => addDaysUtc(start, index));
  }
  const [capitalEntries, credits, payments, expenses] = await Promise.all([
    prisma.dailyFinanceEntry.findMany({
      where: {
        financeDate: {
          gte: start,
          lt: endExclusive,
        },
      },
    }),
    prisma.credit.findMany({
      where: {
        startDate: {
          gte: start,
          lt: endExclusive,
        },
        status: {
          not: "cancelled",
        },
      },
      select: {
        startDate: true,
        principalAmount: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: start,
          lt: endExclusive,
        },
        cancelledAt: null,
      },
      include: {
        allocations: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: start,
          lt: endExclusive,
        },
      },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const capitalByDate = new Map(capitalEntries.map((entry) => [dateKey(entry.financeDate), Number(entry.initialCapital)]));

  return {
    today,
    expenses,
    rows: dates.reverse().map((date) => {
      const key = dateKey(date);
      const loans = credits
        .filter((credit) => dateKey(credit.startDate) === key)
        .reduce((total, credit) => total + Number(credit.principalAmount), 0);
      const dayPayments = payments.filter((payment) => dateKey(payment.paymentDate) === key);
      const lateFeeCollected = dayPayments.reduce(
        (total, payment) =>
          total + payment.allocations.reduce((allocationTotal, allocation) => allocationTotal + Number(allocation.lateFeeApplied), 0),
        0,
      );
      const ordinaryCollected = dayPayments.reduce((total, payment) => total + Number(payment.amount), 0) - lateFeeCollected;
      const dayExpenses = expenses
        .filter((expense) => dateKey(expense.expenseDate) === key)
        .reduce((total, expense) => total + Number(expense.amount), 0);
      const initialCapital = capitalByDate.get(key) ?? 0;

      // Saldo diario:
      // saldo = capital inicial - prestamos entregados + cobros ordinarios + mora cobrada - gastos.
      // La mora se separa de cobros para que la ganancia extraordinaria no quede escondida.
      const balance = initialCapital - loans + ordinaryCollected + lateFeeCollected - dayExpenses;

      return {
        date,
        initialCapital,
        loans,
        ordinaryCollected,
        lateFeeCollected,
        expenses: dayExpenses,
        balance,
      };
    }),
  };
}
