import { todayInMexicoAsUtcDate } from "@/lib/dates";

export type InstallmentForEffectiveness = {
  dueDate: Date;
  scheduledAmount: unknown;
  lateFeeAmount: unknown;
  paidAmount: unknown;
  status: string;
  allocations: Array<{
    amountApplied: unknown;
    lateFeeApplied: unknown;
    payment: {
      paymentDate: Date;
    };
  }>;
};

function dateOnlyUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function calculatePaymentEffectiveness(installments: InstallmentForEffectiveness[]) {
  const todayKey = dateOnlyUtc(todayInMexicoAsUtcDate());
  // Solo se consideran devengadas las cuotas pasadas (< hoy), o las de hoy que YA fueron pagadas.
  // Una cuota que vence hoy y aún está en ruta de cobro no penaliza al cliente (sigue al corriente).
  const accruedInstallments = installments.filter((installment) => {
    const due = dateOnlyUtc(installment.dueDate);
    return due < todayKey || (due === todayKey && installment.status === "paid");
  });
  const paidAccruedInstallments = accruedInstallments.filter((installment) => {
    const totalDue = Number(installment.scheduledAmount) + Number(installment.lateFeeAmount);
    return Number(installment.paidAmount) >= totalDue && installment.status === "paid";
  });
  const onTimeInstallments = paidAccruedInstallments.filter((installment) => {
    const dueKey = dateOnlyUtc(installment.dueDate);
    let accumulated = 0;

    for (const allocation of installment.allocations) {
      accumulated += Number(allocation.amountApplied) + Number(allocation.lateFeeApplied);
      const totalDue = Number(installment.scheduledAmount) + Number(installment.lateFeeAmount);

      // Pago puntual:
      // la cuota cuenta como puntual si quedo totalmente cubierta
      // con pagos aplicados en fecha menor o igual a su vencimiento.
      if (accumulated >= totalDue) {
        return dateOnlyUtc(allocation.payment.paymentDate) <= dueKey;
      }
    }

    return false;
  });
  const accruedCount = accruedInstallments.length;

  return {
    accruedCount,
    onTimeCount: onTimeInstallments.length,
    paidAccruedCount: paidAccruedInstallments.length,
    punctualityRate: accruedCount > 0 ? onTimeInstallments.length / accruedCount : 0,
    accruedPaymentRate: accruedCount > 0 ? paidAccruedInstallments.length / accruedCount : 0,
  };
}
