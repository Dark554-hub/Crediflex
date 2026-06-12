"use client";

import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/money";

type SettlementCalculatorProps = {
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

export function SettlementCalculator({ settlement, lateFeeAmount }: SettlementCalculatorProps) {
  const [discount, setDiscount] = useState("");
  const discountAmount = Number(discount.replace(/,/g, "")) || 0;
  const total = useMemo(
    () => Math.max(settlement.settlementBeforeDiscount + lateFeeAmount - discountAmount, 0),
    [discountAmount, lateFeeAmount, settlement.settlementBeforeDiscount],
  );

  return (
    <section className="mx-auto mt-4 max-w-3xl rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-moss" aria-hidden />
        <h2 className="text-xl font-black text-ink">Liquidar hoy</h2>
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
            <strong>{new Intl.NumberFormat("es-MX", { style: "percent", minimumFractionDigits: 2 }).format(settlement.accruedInterestRate)}</strong>
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
            inputMode="decimal"
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none focus:border-moss"
            placeholder="Monto en MXN"
          />
        </label>

        <div className="rounded-md bg-moss p-4 text-white">
          <p className="text-sm font-semibold text-white/75">Total para liquidar</p>
          <p className="mt-1 text-3xl font-black">{formatCurrency(total)}</p>
        </div>
      </div>
    </section>
  );
}
