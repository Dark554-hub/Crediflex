"use client";

import { Credit, CreditInstallment, PaymentMethod } from "@prisma/client";
import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createPaymentAction } from "@/app/creditos/[id]/pagos/actions";
import { Button } from "@/components/ui/button";
import { todayInputValueInMexico } from "@/lib/dates";

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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      <Save size={18} aria-hidden />
      {pending ? "Registrando..." : "Registrar pago"}
    </Button>
  );
}

export function PaymentForm({ credit }: PaymentFormProps) {
  const [state, formAction] = useFormState(createPaymentAction.bind(null, credit.id), {});
  const [selectedAmount, setSelectedAmount] = useState("total");
  const [otherAmount, setOtherAmount] = useState("");
  const [lateFee, setLateFee] = useState("0");
  const [printReceipt, setPrintReceipt] = useState(credit.printReceiptDefault);
  const todayTime = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);
  const pendingBalance = useMemo(
    () =>
      credit.installments.reduce((total, installment) => {
        const balance =
          Number(installment.scheduledAmount) +
          Number(installment.lateFeeAmount) -
          Number(installment.paidAmount);
        return total + Math.max(balance, 0);
      }, 0),
    [credit.installments],
  );
  const overdueBalance = useMemo(
    () =>
      credit.installments.reduce((total, installment) => {
        const due = new Date(installment.dueDate);
        const balance =
          Number(installment.scheduledAmount) +
          Number(installment.lateFeeAmount) -
          Number(installment.paidAmount);
        return due.getTime() < todayTime ? total + Math.max(balance, 0) : total;
      }, 0),
    [credit.installments, todayTime],
  );
  const currentBalance = useMemo(() => {
    const next = credit.installments[0];
    if (!next) return 0;
    return Math.max(Number(next.scheduledAmount) + Number(next.lateFeeAmount) - Number(next.paidAmount), 0);
  }, [credit.installments]);
  const debtTotal = Number(credit.totalAmount) - credit.installments.reduce(
    (total, installment) => total + Number(installment.paidAmount),
    0,
  );
  const options = [
    ["overdue", "Saldo Vencido", overdueBalance],
    ["current", "Saldo Vigente", currentBalance],
    ["total", "Saldo Total", pendingBalance],
    ["debt", "Deuda Total", debtTotal],
    ["other", "Otro Monto", Number(otherAmount.replace(/,/g, "")) || 0],
  ] as const;
  const baseAmount = options.find(([value]) => value === selectedAmount)?.[2] ?? 0;
  const lateFeeValue = Number(lateFee.replace(/,/g, "")) || 0;
  const totalToPay = Math.max(baseAmount + lateFeeValue, 0);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="amount" value={totalToPay.toFixed(2)} />
      <input type="hidden" name="additionalLateFee" value={lateFeeValue.toFixed(2)} />

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
              <span className="text-right text-moss">{amount.toFixed(2)}</span>
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
            inputMode="decimal"
            className={inputClass}
            placeholder="0.00"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Interes o mora</span>
          <input
            value={lateFee}
            onChange={(event) => setLateFee(event.target.value)}
            inputMode="decimal"
            className={inputClass}
            placeholder="0.00"
          />
        </label>

        <div className="flex items-center justify-between rounded-md bg-ink px-4 py-4 text-white shadow-soft">
          <span className="text-lg font-semibold text-white/82">Total a pagar</span>
          <span className="text-2xl font-extrabold">{totalToPay.toFixed(2)}</span>
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
        <SubmitButton />
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
