import { CircleDollarSign, Handshake, ListChecks, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAgreementAction } from "@/app/creditos/[id]/convenios/actions";
import { cancelCreditAction, cancelLastPaymentAction, updateCreditDetailsAction } from "@/app/creditos/[id]/actions";
import { CreditStatusBadge } from "@/components/credits/credit-status-badge";
import { InstallmentStatusBadge } from "@/components/credits/installment-status-badge";
import { SettlementCalculator } from "@/components/credits/settlement-calculator";
import { AppBar } from "@/components/mobile/app-bar";
import { AvatarHero } from "@/components/mobile/avatar-hero";
import { PaymentReceiptActions, PaymentTicketData } from "@/components/payments/payment-receipt-modal";
import { ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { getCreditById } from "@/lib/credits";
import { todayInputValueInMexico } from "@/lib/dates";
import { calculateSettlement } from "@/lib/settlement";

const typeLabels = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
};

const agreementStatusLabels = {
  active: "Activo",
  completed: "Cumplido",
  broken: "Incumplido",
  cancelled: "Cancelado",
};

function formatShortDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export const dynamic = "force-dynamic";

export default async function CreditDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { pago?: string };
}) {
  const credit = await getCreditById(params.id);

  if (!credit) {
    notFound();
  }

  const paidOrdinaryAmount = credit.installments.reduce(
    (total, installment) =>
      total + Math.min(Number(installment.paidAmount), Number(installment.scheduledAmount)),
    0,
  );
  const pendingAmount = Math.max(Number(credit.totalAmount) - paidOrdinaryAmount, 0);
  const pendingLateFeeAmount = credit.installments.reduce((total, installment) => {
    const lateFee = Number(installment.lateFeeAmount);
    const paidLateFee = installment.allocations
      .filter((a) => a.payment.cancelledAt === null)
      .reduce((sum, a) => sum + Number(a.lateFeeApplied), 0);
    return total + Math.max(lateFee - paidLateFee, 0);
  }, 0);
  const settlement = calculateSettlement(credit);
  const isExpress = credit.productType === "express";
  const creditEffectiveness = credit.paymentEffectiveness;
  const startDateIso = new Date(credit.startDate).toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-field pb-24">
      <AppBar title="Detalle del Prestamo" backHref="/creditos" action={<CircleDollarSign size={25} aria-hidden />} />
      <AvatarHero name={credit.client.fullName} subtitle={credit.zone.name} />

      <section className="mx-auto max-w-3xl bg-field px-4 py-4">
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          {[
            ["Producto", isExpress ? "Express" : "Normal"],
            ["Credito", `#${credit.creditNumber ?? "-"}`],
            ["Fecha", formatDate(credit.startDate)],
            ["Vencimiento", formatDate(credit.expectedEndDate)],
            ["Monto", formatCurrency(credit.principalAmount)],
            ["Tasa de Interes", isExpress ? "5% semanal" : `${Math.round(Number(credit.interestRate) * 100)}%`],
            ["Intereses", formatCurrency(credit.interestAmount)],
            ["Total", formatCurrency(credit.totalAmount)],
            ["Frecuencia de Pago", typeLabels[credit.type]],
            ["Dia de Cobro", credit.type === "weekly" ? weekDayLabel(credit.weeklyCollectionDay) : credit.type === "biweekly" ? "Cada 15 dias" : "Diario"],
            ["Cantidad de Cuotas", String(credit.installmentCount)],
            [isExpress ? "Pago semanal inicial" : "Valor de Cuota", formatCurrency(credit.installmentAmount)],
            ["Cuotas Pagadas", String(credit.installments.filter((item) => item.status === "paid").length)],
            ["Saldo", formatCurrency(pendingAmount)],
            ["Estatus", <CreditStatusBadge key="status" status={credit.status} />],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-lg font-black text-ink">{label}</p>
              <div className="mt-1 text-2xl font-medium text-maize">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4">
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href={`/creditos/nuevo?renovar=${credit.id}`} variant="secondary" className="w-full">
            Renovar credito
          </ButtonLink>
          <ButtonLink href="#liquidar" variant="secondary" className="w-full">
            Calcular liquidacion
          </ButtonLink>
          {credit.status !== "cancelled" ? (
            <form action={cancelCreditAction} className="col-span-2">
              <input type="hidden" name="creditId" value={credit.id} />
              <button className="min-h-11 w-full rounded-md border border-clay/35 bg-clay/10 px-4 py-2 text-sm font-semibold text-clay">
                Cancelar prestamo
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <section id="editar-prestamo" className="mx-auto mt-4 max-w-3xl rounded-md border border-line bg-white/75 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Settings2 size={20} className="text-moss" aria-hidden />
          <h2 className="text-xl font-black text-ink">Editar datos de cobro del prestamo</h2>
        </div>
        <p className="mt-1 text-xs font-semibold text-stone-600">
          Ajusta el dia de cobro, la fecha de inicio, la frecuencia o la zona y actualiza las fechas de la tabla de pagos.
        </p>

        <form action={updateCreditDetailsAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="creditId" value={credit.id} />

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Fecha de inicio</span>
            <input
              name="startDate"
              type="date"
              defaultValue={startDateIso}
              required
              className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Frecuencia de pago</span>
            <select
              name="type"
              defaultValue={credit.type}
              className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="daily">Diario</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Dia de cobro (Semanal)</span>
            <select
              name="weeklyCollectionDay"
              defaultValue={String(credit.weeklyCollectionDay ?? new Date(credit.startDate).getUTCDay())}
              className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            >
              <option value="0">Domingo</option>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miercoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sabado</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Zona de cobro</span>
            <select
              name="zoneId"
              defaultValue={credit.zoneId}
              className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            >
              {credit.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              name="recalculateSchedule"
              defaultChecked
              className="h-5 w-5 accent-moss"
            />
            <span className="text-sm font-semibold text-ink">
              Recalcular automaticamente las fechas de la tabla de pagos segun la fecha de inicio y el dia de cobro
            </span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="min-h-11 w-full rounded-md bg-ink px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-moss sm:w-auto"
            >
              Guardar cambios del prestamo
            </button>
          </div>
        </form>
      </section>

      <div id="liquidar">
        <SettlementCalculator
          creditId={credit.id}
          isSettled={credit.status === "settled" || credit.status === "cancelled"}
          settlement={settlement}
          lateFeeAmount={pendingLateFeeAmount}
        />
      </div>

      {credit.status === "settled" ? (
        <section className="mx-auto mt-4 max-w-3xl rounded-md border border-line bg-white/75 p-4 sm:p-6">
          <h2 className="text-xl font-black text-ink">Efectividad del credito liquidado</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <EffectivenessMiniCard
              title="Puntualidad"
              percent={Math.round(creditEffectiveness.punctualityRate * 100)}
              detail={`${creditEffectiveness.onTimeCount} de ${creditEffectiveness.accruedCount} pagos en tiempo`}
            />
            <EffectivenessMiniCard
              title="Pago devengado"
              percent={Math.round(creditEffectiveness.accruedPaymentRate * 100)}
              detail={`${creditEffectiveness.paidAccruedCount} de ${creditEffectiveness.accruedCount} pagos cubiertos`}
            />
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-4 max-w-3xl rounded-md border border-line bg-white/75 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Handshake size={20} className="text-moss" aria-hidden />
          <h2 className="text-xl font-black text-ink">Convenios de pago</h2>
        </div>

        <form action={createAgreementAction.bind(null, credit.id)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Fecha prometida</span>
            <input
              name="promisedPaymentDate"
              type="date"
              min={todayInputValueInMexico()}
              required
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Monto prometido</span>
            <input
              name="promisedAmount"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            />
          </label>
          <button className="min-h-12 self-end rounded-md bg-ink px-4 text-sm font-bold text-white shadow-soft transition hover:bg-moss">
            Guardar
          </button>
        </form>

        <div className="mt-4 grid gap-2">
          {credit.agreements.length === 0 ? (
            <p className="rounded-md bg-field px-4 py-4 text-sm font-semibold text-stone-700">
              No hay convenios registrados para este credito.
            </p>
          ) : (
            credit.agreements.map((agreement) => (
              <div key={agreement.id} className="rounded-md bg-field p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-ink">{formatCurrency(agreement.promisedAmount)}</p>
                    <p className="text-sm text-stone-700">
                      Prometido para {formatDate(agreement.promisedPaymentDate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink">
                    {agreementStatusLabels[agreement.status]}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="pagos" className="mx-auto mt-4 max-w-3xl rounded-md border border-line bg-white/75 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <CircleDollarSign size={20} className="text-moss" aria-hidden />
          <h2 className="text-xl font-black text-ink">Historial de pagos</h2>
        </div>

        <div className="mt-4 grid gap-3">
          {credit.payments.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-field px-4 py-8 text-center text-sm text-stone-600">
              Aun no hay pagos registrados para este credito.
            </div>
          ) : (
            <>
              <form action={cancelLastPaymentAction}>
                <input type="hidden" name="creditId" value={credit.id} />
                <button className="min-h-11 w-full rounded-md border border-clay/35 bg-clay/10 px-4 py-2 text-sm font-semibold text-clay">
                  Cancelar ultimo pago
                </button>
              </form>
              {credit.payments.map((payment) => {
              const installmentNumbers = payment.allocations
                .map((allocation) => `#${allocation.installment.installmentNumber}`)
                .join(", ");
              const lateFeeTotal = payment.allocations.reduce(
                (total, allocation) => total + Number(allocation.lateFeeApplied),
                0,
              );
              const ordinaryTotal = payment.allocations.reduce(
                (total, allocation) => total + Number(allocation.amountApplied),
                0,
              );
              const paymentsUpToThis = credit.payments.filter(
                (item) => new Date(item.createdAt).getTime() <= new Date(payment.createdAt).getTime(),
              );
              const cumulativeOrdinaryPaid = paymentsUpToThis.reduce(
                (sum, p) =>
                  sum + p.allocations.reduce((allocSum, alloc) => allocSum + Number(alloc.amountApplied), 0),
                0,
              );
              const isSettlementPayment =
                Boolean(payment.notes?.toLowerCase().includes("liquidacion")) ||
                (credit.status === "settled" && payment.id === credit.payments[0]?.id);
              const totalAmount = Number(credit.totalAmount);
              const pendingBalanceAfterPayment = isSettlementPayment
                ? 0
                : Math.max(totalAmount - cumulativeOrdinaryPaid, 0);
              const installmentAmount = Number(credit.installmentAmount) || 1;
              const totalInstallments = Number(credit.installmentCount);
              const paidInstallmentsCount = isSettlementPayment
                ? totalInstallments
                : Math.min(Math.round(cumulativeOrdinaryPaid / installmentAmount), totalInstallments);
              const abonadasInstallmentsCount = Math.max(Math.round(ordinaryTotal / installmentAmount), 1);

              const paidByInstallment = new Map<string, number>();
              for (const p of paymentsUpToThis) {
                for (const alloc of p.allocations) {
                  paidByInstallment.set(
                    alloc.installmentId,
                    (paidByInstallment.get(alloc.installmentId) ?? 0) + Number(alloc.amountApplied),
                  );
                }
              }
              const paymentDateTime = new Date(payment.paymentDate).getTime();
              const pagosAtrasados = isSettlementPayment
                ? 0
                : credit.installments.filter((inst) => {
                    const dueTime = new Date(inst.dueDate).getTime();
                    const paid = paidByInstallment.get(inst.id) ?? 0;
                    const scheduled = Number(inst.scheduledAmount);
                    return dueTime < paymentDateTime && paid + 0.01 < scheduled;
                  }).length;

              const ticketData: PaymentTicketData = {
                paymentId: payment.id,
                creditId: credit.id,
                companyName: "Crediflex",
                clientName: credit.client.fullName,
                cedula: credit.client.identification || credit.client.clientNumber || "-",
                address: credit.client.address,
                zoneName: credit.zone.name,
                paymentDate: formatShortDate(payment.paymentDate),
                abonado: formatCurrency(ordinaryTotal),
                mora: formatCurrency(lateFeeTotal),
                total: formatCurrency(payment.amount),
                saldo: formatCurrency(pendingBalanceAfterPayment),
                cuotasPagadas: `${Math.round(paidInstallmentsCount)} de ${Math.round(totalInstallments)}`,
                cuotasAbonadas: String(Math.round(abonadasInstallmentsCount)),
                pagosAtrasados,
                diaPrestado: formatShortDate(credit.startDate),
                reciboGenerado: formatShortDate(payment.paymentDate),
              };

              return (
                <div key={payment.id} className="rounded-md border border-line bg-field p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-ink">{formatCurrency(payment.amount)}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {formatDate(payment.paymentDate)} - cuotas {installmentNumbers || "sin asignacion"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Mora: {lateFeeTotal > 0 ? formatCurrency(lateFeeTotal) : "No aplicada"}
                      </p>
                    </div>
                    <PaymentReceiptActions
                      data={ticketData}
                      autoOpen={searchParams?.pago === payment.id}
                    />
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      </section>

      <section id="pagos-programados" className="mx-auto mt-5 max-w-3xl rounded-md border border-line bg-white/75 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <CircleDollarSign size={20} className="text-moss" aria-hidden />
          <h2 className="text-xl font-black text-ink">Tabla de pagos</h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.14em] text-stone-500">
                <th className="py-3 pr-3">Pago</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Capital</th>
                <th className="px-3 py-3">Interes</th>
                <th className="px-3 py-3">Monto</th>
                <th className="px-3 py-3">Pagado</th>
                <th className="py-3 pl-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {credit.installments.map((installment) => (
                <tr key={installment.id} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pr-3 font-bold text-ink">#{installment.installmentNumber}</td>
                  <td className="px-3 py-3 text-stone-700">{formatDate(installment.dueDate)}</td>
                  <td className="px-3 py-3 text-stone-700">
                    {formatCurrency(installment.principalComponent)}
                  </td>
                  <td className="px-3 py-3 text-stone-700">
                    {formatCurrency(installment.interestComponent)}
                  </td>
                  <td className="px-3 py-3 font-bold text-ink">
                    {formatCurrency(installment.scheduledAmount)}
                  </td>
                  <td className="px-3 py-3 text-stone-700">
                    {formatCurrency(Math.min(Number(installment.paidAmount), Number(installment.scheduledAmount)))}
                  </td>
                  <td className="py-3 pl-3">
                    <InstallmentStatusBadge status={installment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-moss text-white shadow-[0_-8px_25px_rgba(0,0,0,0.15)]">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-px">
          <Link href={`/creditos/${credit.id}/pagos/nuevo`} className="flex min-h-16 flex-col items-center justify-center text-sm font-bold">
            <Plus size={20} aria-hidden />
            Recibir Pago
          </Link>
          <a href="#pagos" className="flex min-h-16 flex-col items-center justify-center text-sm font-bold">
            <CircleDollarSign size={20} aria-hidden />
            Ver Pagos
          </a>
          <a href="#pagos-programados" className="flex min-h-16 flex-col items-center justify-center text-sm font-bold">
            <ListChecks size={20} aria-hidden />
            Pagos
          </a>
        </div>
      </nav>
    </main>
  );
}

function weekDayLabel(day: number | null) {
  const labels = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  return typeof day === "number" ? labels[day] : "Sin dia";
}

function EffectivenessMiniCard({
  title,
  percent,
  detail,
}: {
  title: string;
  percent: number;
  detail: string;
}) {
  return (
    <div className="rounded-md bg-field p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-stone-600">{title}</p>
        <p className="text-3xl font-black text-moss">{percent}%</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-stone-600">{detail}</p>
    </div>
  );
}
