import { CalendarDays, CircleDollarSign, Download, Handshake, ListChecks, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAgreementAction } from "@/app/creditos/[id]/convenios/actions";
import { cancelCreditAction, cancelLastPaymentAction } from "@/app/creditos/[id]/actions";
import { CreditStatusBadge } from "@/components/credits/credit-status-badge";
import { InstallmentStatusBadge } from "@/components/credits/installment-status-badge";
import { SettlementCalculator } from "@/components/credits/settlement-calculator";
import { AppBar } from "@/components/mobile/app-bar";
import { AvatarHero } from "@/components/mobile/avatar-hero";
import { ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { getCreditById } from "@/lib/credits";
import { todayInputValueInMexico } from "@/lib/dates";
import { calculateSettlement } from "@/lib/settlement";

const typeLabels = {
  daily: "Diario",
  weekly: "Semanal",
};

const agreementStatusLabels = {
  active: "Activo",
  completed: "Cumplido",
  broken: "Incumplido",
  cancelled: "Cancelado",
};

export const dynamic = "force-dynamic";

export default async function CreditDetailPage({ params }: { params: { id: string } }) {
  const credit = await getCreditById(params.id);

  if (!credit) {
    notFound();
  }

  const paidAmount = credit.installments.reduce(
    (total, installment) => total + Number(installment.paidAmount),
    0,
  );
  const pendingAmount = Number(credit.totalAmount) - paidAmount;
  const pendingLateFeeAmount = credit.installments.reduce((total, installment) => {
    const lateFee = Number(installment.lateFeeAmount);
    const ordinaryPending = Math.max(Number(installment.scheduledAmount) - Number(installment.paidAmount), 0);
    return total + (ordinaryPending <= 0 ? lateFee : 0);
  }, 0);
  const settlement = calculateSettlement(credit);
  const isExpress = credit.productType === "express";
  const creditEffectiveness = credit.paymentEffectiveness;

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
            ["Tasa de Interes", isExpress ? "5.00% semanal" : `${(Number(credit.interestRate) * 100).toFixed(2)}%`],
            ["Intereses", formatCurrency(credit.interestAmount)],
            ["Total", formatCurrency(credit.totalAmount)],
            ["Frecuencia de Pago", typeLabels[credit.type]],
            ["Dia de Cobro", credit.type === "weekly" ? weekDayLabel(credit.weeklyCollectionDay) : "Diario"],
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

      <div id="liquidar">
        <SettlementCalculator settlement={settlement} lateFeeAmount={pendingLateFeeAmount} />
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
                    <ButtonLink
                      href={`/creditos/${credit.id}/pagos/${payment.id}/comprobante`}
                      variant="secondary"
                      className="w-full sm:w-auto"
                      target="_blank"
                    >
                      <Download size={17} aria-hidden />
                      Comprobante
                    </ButtonLink>
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
                  <td className="px-3 py-3 text-stone-700">{formatCurrency(installment.paidAmount)}</td>
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
