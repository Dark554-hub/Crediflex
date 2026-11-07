"use client";

import { Client, Credit, Zone } from "@prisma/client";
import { Calculator, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCreditAction } from "@/app/creditos/actions";
import { Button } from "@/components/ui/button";
import { todayInputValueInMexico } from "@/lib/dates";

type ClientWithZone = Client & {
  zone: Zone;
};

type CreditFormProps = {
  clients: ClientWithZone[];
  zones: Zone[];
  renewalCredit?: (Credit & { client: ClientWithZone }) | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      <Save size={18} aria-hidden />
      {pending ? "Abriendo..." : "Abrir credito"}
    </Button>
  );
}

function moneyPreview(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? Math.round(amount) : 0);
}

const weekDays = [
  ["1", "Lunes"],
  ["2", "Martes"],
  ["3", "Miercoles"],
  ["4", "Jueves"],
  ["5", "Viernes"],
  ["6", "Sabado"],
  ["0", "Domingo"],
] as const;

export function CreditForm({ clients, zones, renewalCredit }: CreditFormProps) {
  const [state, formAction] = useFormState(createCreditAction, {});
  const [clientId, setClientId] = useState(renewalCredit?.clientId ?? clients[0]?.id ?? "");
  const [principal, setPrincipal] = useState("");
  const [installments, setInstallments] = useState("");
  const [rate, setRate] = useState(
    renewalCredit ? Math.round(Number(renewalCredit.interestRate) * 100).toString() : "",
  );
  const [type, setType] = useState<"daily" | "weekly" | "biweekly">(renewalCredit?.type ?? "daily");
  const [productType, setProductType] = useState<"standard" | "express">(
    renewalCredit?.productType === "express" ? "express" : "standard",
  );
  const selectedClient = clients.find((client) => client.id === clientId);
  const defaultZoneId = renewalCredit?.zoneId ?? selectedClient?.zoneId ?? zones[0]?.id ?? "";
  const [, todayMonth, todayDay] = todayInputValueInMexico().split("-").map(Number);

  useEffect(() => {
    if (productType === "express") {
      setType("weekly");
      setInstallments("4");
      setRate("20");
    }
  }, [productType]);

  const preview = useMemo(() => {
    const principalAmount = Number(principal.replace(/,/g, ""));
    const installmentCount = productType === "express" ? 4 : Number(installments);
    const interestRate = productType === "express" ? 0.2 : Number(rate) / 100;
    const weeklyExpressInterest = productType === "express" ? principalAmount * 0.05 : 0;
    const interest = productType === "express" ? weeklyExpressInterest * 4 : principalAmount * interestRate;
    const total = principalAmount + interest;
    const payment =
      productType === "express"
        ? weeklyExpressInterest
        : installmentCount > 0
          ? total / installmentCount
          : 0;
    const finalPayment = productType === "express" ? principalAmount + weeklyExpressInterest : payment;

    return {
      interest,
      total,
      payment,
      finalPayment,
    };
  }, [installments, principal, productType, rate]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-5">
        {renewalCredit ? <input type="hidden" name="renewedFromCreditId" value={renewalCredit.id} /> : null}
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Producto</span>
          <select
            name="productType"
            value={productType}
            onChange={(event) => setProductType(event.target.value as "standard" | "express")}
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            <option value="standard">Credito normal</option>
            <option value="express">Credito express</option>
          </select>
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Cliente</span>
          <select
            name="clientId"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            required
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            {clients.length === 0 ? (
              <option value="">Primero registra un cliente</option>
            ) : (
              clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fullName} - {client.zone.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Zona de cobro</span>
          <select
            name="zoneId"
            key={defaultZoneId}
            defaultValue={defaultZoneId}
            required
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>

        {productType === "express" ? (
          <>
            <input type="hidden" name="type" value="weekly" />
            <div className="rounded-md border border-line bg-field p-3">
              <p className="text-sm font-semibold text-ink">Tipo</p>
              <p className="mt-1 text-lg font-black text-moss">Semanal express</p>
            </div>
          </>
        ) : (
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Tipo</span>
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as "daily" | "weekly" | "biweekly")}
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
            </select>
          </label>
        )}

        {type === "weekly" ? (
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Dia de cobro</span>
            <select
              name="weeklyCollectionDay"
              defaultValue={renewalCredit?.weeklyCollectionDay?.toString() ?? "1"}
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            >
              {weekDays.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="weeklyCollectionDay" value="" />
        )}

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Monto prestado</span>
          <input
            name="principalAmount"
            value={principal}
            onChange={(event) => setPrincipal(event.target.value)}
            required
            inputMode="decimal"
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            placeholder="Monto en MXN"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Numero de pagos</span>
            <input
              name="installmentCount"
              value={installments}
              onChange={(event) => setInstallments(event.target.value)}
              required
              readOnly={productType === "express"}
              inputMode="numeric"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              placeholder="Pagos"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Interes</span>
            <input
              name="interestRatePercent"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
              readOnly={productType === "express"}
              inputMode="decimal"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
              placeholder="Porcentaje"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Dia de inicio</span>
            <input
              name="startDay"
              defaultValue={todayDay}
              required
              inputMode="numeric"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Mes de inicio</span>
            <select
              name="startMonth"
              defaultValue={todayMonth}
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            >
              {[
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre",
              ].map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Cargo fijo por mora</span>
          <input
            name="lateFeeAmount"
            defaultValue={renewalCredit ? Math.round(Number(renewalCredit.lateFeeAmount)).toString() : "0"}
            inputMode="decimal"
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Tasa de mora</span>
          <input
            name="lateFeeRatePercent"
            defaultValue={renewalCredit ? Math.round(Number(renewalCredit.lateFeeRate) * 100).toString() : "0"}
            inputMode="decimal"
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            placeholder="Porcentaje"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Dias de gracia</span>
          <input
            name="lateFeeGraceDays"
            defaultValue={renewalCredit?.lateFeeGraceDays ?? "0"}
            inputMode="numeric"
            className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
          />
        </label>

        <label className="flex min-h-12 items-center justify-between gap-3 text-base font-semibold text-ink">
          <span>Imprimir comprobante</span>
          <input
            name="printReceiptDefault"
            type="checkbox"
            defaultChecked={renewalCredit?.printReceiptDefault ?? false}
            className="h-6 w-6 accent-moss"
          />
        </label>
      </div>

      <div className="rounded-md border border-line bg-field p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Calculator size={18} aria-hidden />
          Vista previa
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-stone-500">Interes</p>
            <p className="text-lg font-black text-ink">{moneyPreview(preview.interest)}</p>
          </div>
          <div>
            <p className="text-stone-500">Total a pagar</p>
            <p className="text-lg font-black text-ink">{moneyPreview(preview.total)}</p>
          </div>
          <div>
            <p className="text-stone-500">Pago</p>
            <p className="text-lg font-black text-ink">{moneyPreview(preview.payment)}</p>
          </div>
          {productType === "express" ? (
            <div>
              <p className="text-stone-500">Pago final</p>
              <p className="text-lg font-black text-ink">{moneyPreview(preview.finalPayment)}</p>
            </div>
          ) : null}
        </div>
        {productType === "express" ? (
          <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-moss">
            Express: de $500 a $3,000. Son 4 pagos semanales; los primeros 3 son interes y el cuarto liquida todo.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary">
          <Calculator size={18} aria-hidden />
          Calcular
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
