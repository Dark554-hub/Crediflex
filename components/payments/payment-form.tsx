"use client";

import { Credit, CreditInstallment, PaymentMethod } from "@prisma/client";
import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createPaymentAction } from "@/app/creditos/[id]/pagos/actions";
import { Button } from "@/components/ui/button";
import { todayInputValueInMexico } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { calculateSettlement } from "@/lib/settlement";

type PaymentFormProps = {
  credit: Credit & {
    installments: CreditInstallment[];
  };
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  other: "Otro",
};
const inputClass =
  "min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10";

function SubmitButton({ isSettlement }: { isSettlement: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      <Save size={18} aria-hidden />
      {pending
        ? "Registrando..."
        : isSettlement
          ? "Liquidar prestamo"
          : "Registrar pago"}
    </Button>
  );
}

export function PaymentForm({ credit }: PaymentFormProps) {
  const [state, formAction] = useFormState(createPaymentAction.bind(null, credit.id), {});
  const [selectedAmount, setSelectedAmount] = useState("current");
  const [otherAmount, setOtherAmount] = useState("");
  const [lateFee, setLateFee] = useState("0");
  const [settleWithOtherAmount, setSettleWithOtherAmount] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(credit.printReceiptDefault);
  const todayTime = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);
  const pendingBalance = useMemo(
    () =>
      Math.round(
        credit.installments.reduce((total, installment) => {
          const ordinaryPending = Math.max(
            Number(installment.scheduledAmount) -
              Math.min(Number(installment.paidAmount), Number(installment.scheduledAmount)),
            0,
          );
          const balance = ordinaryPending + Number(installment.lateFeeAmount);
          return total + Math.max(balance, 0);
        }, 0),
      ),
    [credit.installments],
  );
  const overdueBalance = useMemo(
    () =>
      Math.round(
        credit.installments.reduce((total, installment) => {
          const due = new Date(installment.dueDate);
          const ordinaryPending = Math.max(
            Number(installment.scheduledAmount) -
              Math.min(Number(installment.paidAmount), Number(installment.scheduledAmount)),
            0,
          );
          const balance = ordinaryPending + Number(installment.lateFeeAmount);
          return due.getTime() < todayTime ? total + Math.max(balance, 0) : total;
        }, 0),
      ),
    [credit.installments, todayTime],
  );
  const currentBalance = useMemo(() => {
    const next = credit.installments[0];
    if (!next) return 0;
    const ordinaryPending = Math.max(
      Number(next.scheduledAmount) -
        Math.min(Number(next.paidAmount), Number(next.scheduledAmount)),
      0,
    );
    return Math.round(
      Math.max(ordinaryPending + Number(next.lateFeeAmount), 0),
    );
  }, [credit.installments]);
  const debtTotal = useMemo(
    () =>
      Math.round(
        credit.installments.reduce((total, installment) => {
          const ordinaryPending = Math.max(
            Number(installment.scheduledAmount) -
              Math.min(Number(installment.paidAmount), Number(installment.scheduledAmount)),
            0,
          );
          return total + ordinaryPending;
        }, 0),
      ),
    [credit.installments],
  );
  const settlementCalc = useMemo(() => calculateSettlement(credit), [credit]);
  const settlementAmount = Math.round(settlementCalc.settlementBeforeDiscount);

  const options = [
    ["overdue", "Saldo Vencido", overdueBalance],
    ["current", "Saldo Vigente (Cuota)", currentBalance],
    ["settlement", "Liquidar Prestamo (Con descuento)", settlementAmount],
    ["total", "Saldo Total", pendingBalance],
    ["debt", "Deuda Total", debtTotal],
    ["other", "Otro Monto", Math.round(Number(otherAmount.replace(/,/g, "")) || 0)],
  ] as const;
  const baseAmount = options.find(([value]) => value === selectedAmount)?.[2] ?? 0;
  const lateFeeValue = Math.round(Number(lateFee.replace(/,/g, "")) || 0);
  const totalToPay = Math.round(Math.max(baseAmount + lateFeeValue, 0));
  const isSettlement =
    selectedAmount === "settlement" ||
    (selectedAmount === "other" && settleWithOtherAmount);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="amount" value={String(totalToPay)} />
      <input type="hidden" name="additionalLateFee" value={String(lateFeeValue)} />
      <input type="hidden" name="isSettlement" value={isSettlement ? "true" : "false"} />

      <div className="grid gap-5">
        <div className="grid gap-3">
          {options.map(([value, label, amount]) => (
            <label
              key={value}
              className="flex min-h-14 items-center gap-3 rounded-md border border-line bg-white px-3 text-base font-semibold text-ink transition has-[:checked]:border-maize has-[:checked]:bg-mint/45"
            >
              <input
                type="radio"
                name="amountOption"
                value={value}
                checked={selectedAmount === value}
                onChange={() => setSelectedAmount(value)}
                className="h-6 w-6 accent-moss"
              />
              <span className="flex-1">{label}</span>
              <span className="text-right font-extrabold text-moss">{formatCurrency(amount)}</span>
            </label>
          ))}
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Otro monto</span>
          <input
            value={otherAmount}
            onChange={(event) => {
              setOtherAmount(event.target.value);
              setSelectedAmount("other");
            }}
            inputMode="numeric"
            className={inputClass}
            placeholder="0"
          />
        </label>

        {selectedAmount === "other" ? (
          <label className="flex min-h-12 items-center gap-3 rounded-md border border-moss/30 bg-mint/25 px-3 py-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              checked={settleWithOtherAmount}
              onChange={(event) => setSettleWithOtherAmount(event.target.checked)}
              className="h-5 w-5 accent-moss"
            />
            <span>Liquidar y saldar el prestamo completo con este monto</span>
          </label>
        ) : null}

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Interes o mora</span>
          <input
            value={lateFee}
            onChange={(event) => setLateFee(event.target.value)}
            inputMode="numeric"
            className={inputClass}
            placeholder="0"
          />
        </label>

        <div className="flex items-center justify-between rounded-md bg-ink px-4 py-4 text-white shadow-soft">
          <span className="text-lg font-semibold text-white/82">
            {isSettlement ? "Total para liquidar" : "Total a pagar"}
          </span>
          <span className="text-2xl font-extrabold">{formatCurrency(totalToPay)}</span>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Fecha del pago</span>
          <input
            name="paymentDate"
            type="date"
            required
            defaultValue={todayInputValueInMexico()}
            className={inputClass}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Metodo</span>
          <select
            name="method"
            defaultValue="cash"
            className={inputClass}
          >
            {Object.entries(methodLabels).map(([method, label]) => (
              <option key={method} value={method}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-h-12 items-center justify-between gap-3 text-base font-semibold text-ink">
          <span>Impresion</span>
          <input
            type="checkbox"
            checked={printReceipt}
            onChange={(event) => setPrintReceipt(event.target.checked)}
            className="h-6 w-6 accent-moss"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SubmitButton isSettlement={isSettlement} />
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

