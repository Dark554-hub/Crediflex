"use client";

import { Calculator, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { settleCreditAction } from "@/app/creditos/[id]/actions";
import { todayInputValueInMexico } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";

type SettlementCalculatorProps = {
  creditId: string;
  isSettled?: boolean;
  settlement: {
    referenceDate: Date;
    elapsedPeriods: number;
    periodCount: number;
    periodInterest: number;
    periodInterestRate: number;
    accruedInterestRate: number;
    accruedInterest: number;
    paymentsMade: number;
    fixedSettlementCharge: number;
    pendingDebt: number;
    earlySettlementDiscount: number;
    settlementBeforeDiscount: number;
  };
  lateFeeAmount: number;
};

export function SettlementCalculator({
  creditId,
  isSettled = false,
  settlement,
  lateFeeAmount,
}: SettlementCalculatorProps) {
  const [discount, setDiscount] = useState("");
  const discountAmount = Math.round(Number(discount.replace(/,/g, "")) || 0);
  const total = useMemo(
    () => Math.round(Math.max(settlement.settlementBeforeDiscount + lateFeeAmount - discountAmount, 0)),
    [discountAmount, lateFeeAmount, settlement.settlementBeforeDiscount],
  );

  return (
    <section className="mx-auto mt-4 max-w-3xl rounded-md border border-line bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-moss" aria-hidden />
        <h2 className="text-xl font-black text-ink">Liquidar prestamo hoy</h2>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-field p-3">
            <p className="text-xs font-bold uppercase text-stone-500">Liquidacion base</p>
            <p className="mt-1 text-xl font-black text-ink">
              {formatCurrency(settlement.settlementBeforeDiscount)}
            </p>
          </div>
          <div className="rounded-md bg-field p-3">
            <p className="text-xs font-bold uppercase text-stone-500">Mora pendiente</p>
            <p className="mt-1 text-xl font-black text-ink">{formatCurrency(lateFeeAmount)}</p>
          </div>
        </div>

        <div className="rounded-md border border-line bg-field p-3 text-sm leading-6 text-stone-700">
          <p>
            Referencia:{" "}
            <strong>
              {new Intl.DateTimeFormat("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(settlement.referenceDate)}
            </strong>
          </p>
          <p>
            Periodos considerados:{" "}
            <strong>
              {settlement.elapsedPeriods} de {settlement.periodCount} semana{settlement.periodCount === 1 ? "" : "s"}
            </strong>
          </p>
          <p>
            Deuda pendiente normal: <strong>{formatCurrency(settlement.pendingDebt)}</strong>
          </p>
          <p>
            Interes devengado: <strong>{formatCurrency(settlement.accruedInterest)}</strong>
          </p>
          <p>
            Tasa devengada:{" "}
            <strong>
              {new Intl.NumberFormat("es-MX", {
                style: "percent",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(settlement.accruedInterestRate)}
            </strong>
          </p>
          <p>
            Pagos realizados: <strong>{formatCurrency(settlement.paymentsMade)}</strong>
          </p>
          <p>
            Cargo por liquidacion: <strong>{formatCurrency(settlement.fixedSettlementCharge)}</strong>
          </p>
          <p>
            Descuento automatico: <strong>{formatCurrency(settlement.earlySettlementDiscount)}</strong>
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Descuento adicional</span>
          <input
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            inputMode="numeric"
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            placeholder="Monto en MXN"
          />
        </label>

        <div className="rounded-md bg-moss p-4 text-white">
          <p className="text-sm font-semibold text-white/75">Total para liquidar</p>
          <p className="mt-1 text-3xl font-black">{formatCurrency(total)}</p>
        </div>

        {!isSettled && settlement.pendingDebt > 0 ? (
          <form action={settleCreditAction} className="mt-2 grid gap-3 rounded-md border border-moss/30 bg-mint/25 p-4">
            <input type="hidden" name="creditId" value={creditId} />
            <input type="hidden" name="settlementAmount" value={String(total)} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-stone-700">Fecha de liquidacion</span>
                <input
                  type="date"
                  name="paymentDate"
                  defaultValue={todayInputValueInMexico()}
                  required
                  className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-moss"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-stone-700">Metodo de pago</span>
                <select
                  name="method"
                  defaultValue="cash"
                  className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-moss"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="other">Otro</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-base font-extrabold text-white shadow-soft transition hover:bg-moss"
            >
              <CheckCircle2 size={20} aria-hidden />
              Liquidar y saldar prestamo ahora ({formatCurrency(total)})
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

