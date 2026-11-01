import { ArrowLeft, Edit, MapPin, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteClientAction } from "@/app/clientes/actions";
import { StatusBadge } from "@/components/clients/status-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { getClientById } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);

  if (!client) {
    notFound();
  }

  const effectiveness = client.paymentEffectiveness;
  const activeCredits = client.credits.filter((credit) => credit.status !== "settled" && credit.status !== "cancelled");
  const settledCredits = client.credits.filter((credit) => credit.status === "settled");
  const totalPending = activeCredits.reduce((total, credit) => total + creditPending(credit.installments), 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
      <Link href="/clientes" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-moss">
        <ArrowLeft size={18} aria-hidden />
        Clientes
      </Link>

      <section className="rounded-md border border-line bg-white/80 p-4 shadow-lift sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black text-ink">{client.fullName}</h1>
              <StatusBadge status={client.status} />
            </div>
            <div className="mt-3 grid gap-2 text-sm text-stone-700">
              <span className="inline-flex items-center gap-2">
                <MapPin size={17} aria-hidden />
                {client.zone.name} - {client.address}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone size={17} aria-hidden />
                {client.phone || "Sin telefono registrado"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-44">
            <ButtonLink href={`/clientes/${client.id}/editar`} variant="secondary">
              <Edit size={17} aria-hidden />
              Editar
            </ButtonLink>
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={client.id} />
              <Button variant="danger" className="w-full">
                <Trash2 size={17} aria-hidden />
                Eliminar
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-field p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Creditos</p>
            <p className="mt-2 text-2xl font-black text-ink">{client.credits.length}</p>
            <p className="mt-1 text-xs font-semibold text-stone-600">
              {activeCredits.length} activos - {settledCredits.length} liquidados
            </p>
          </div>
          <div className="rounded-md border border-line bg-field p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Alta</p>
            <p className="mt-2 text-lg font-bold text-ink">{formatDate(client.createdAt)}</p>
          </div>
          <div className="rounded-md border border-line bg-field p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Actualizado</p>
            <p className="mt-2 text-lg font-bold text-ink">{formatDate(client.updatedAt)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <EffectivenessCard
            title="Efectividad de puntualidad"
            value={effectiveness.punctualityRate}
            detail={`${effectiveness.onTimeCount} de ${effectiveness.accruedCount} pagos devengados en tiempo`}
          />
          <EffectivenessCard
            title="Efectividad en pago devengado"
            value={effectiveness.accruedPaymentRate}
            detail={`${effectiveness.paidAccruedCount} de ${effectiveness.accruedCount} pagos devengados cubiertos`}
          />
        </div>

      </section>

      <section className="mt-5 rounded-md border border-line bg-white/75 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-black text-ink">Creditos del cliente</h2>
          {activeCredits.length > 1 ? (
            <p className="text-sm font-semibold text-stone-600">
              {activeCredits.length} creditos activos - saldo total{" "}
              <span className="font-black text-moss">{formatCurrency(totalPending)}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3">
          {client.credits.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-field px-4 py-8 text-center text-sm text-stone-600">
              Este cliente aun no tiene creditos registrados.
            </div>
          ) : (
            <>
              {activeCredits.map((credit) => (
                <CreditHistoryItem key={credit.id} credit={credit} />
              ))}
              {settledCredits.length > 0 ? (
                <div className="mt-2 rounded-md border border-line bg-white p-3">
                  <p className="text-sm font-black text-stone-500">Liquidados</p>
                  <div className="mt-2 grid gap-2">
                    {settledCredits.map((credit) => (
                      <CreditHistoryItem key={credit.id} credit={credit} muted />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

type ProfileInstallment = {
  installmentNumber: number;
  dueDate: Date;
  scheduledAmount: unknown;
  lateFeeAmount: unknown;
  paidAmount: unknown;
  status: string;
};

function installmentBalance(item: ProfileInstallment) {
  return Math.max(Number(item.scheduledAmount) + Number(item.lateFeeAmount) - Number(item.paidAmount), 0);
}

function creditPending(installments: ProfileInstallment[]) {
  return installments.reduce((total, item) => total + installmentBalance(item), 0);
}

function CreditHistoryItem({
  credit,
  muted = false,
}: {
  credit: {
    id: string;
    creditNumber: number | null;
    type: "daily" | "weekly" | "biweekly";
    productType: "standard" | "express";
    status: string;
    startDate: Date;
    installmentCount: number;
    totalAmount: number | { toString(): string };
    installments: ProfileInstallment[];
    paymentEffectiveness?: {
      punctualityRate: number;
      accruedPaymentRate: number;
      onTimeCount: number;
      paidAccruedCount: number;
      accruedCount: number;
    };
  };
  muted?: boolean;
}) {
  const isSettled = credit.status === "settled";
  const paidCount = credit.installments.filter((item) => item.status === "paid").length;
  const pending = creditPending(credit.installments);
  const nextInstallment = credit.installments.find((item) => item.status !== "paid" && installmentBalance(item) > 0);
  const progress = credit.installmentCount > 0 ? Math.round((paidCount / credit.installmentCount) * 100) : 0;
  const label =
    credit.productType === "express"
      ? "Express"
      : credit.type === "daily"
        ? "Credito diario"
        : credit.type === "biweekly"
          ? "Credito quincenal"
          : "Credito semanal";

  return (
    <div className={muted ? "rounded-md border border-line bg-field/60 p-4 opacity-80" : "rounded-md border border-line bg-field p-4"}>
      <Link href={`/creditos/${credit.id}`} className="block transition hover:text-moss">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-ink">
              #{credit.creditNumber ?? "-"} - {label}
            </p>
            <p className="text-sm text-stone-600">
              Inicio {formatDate(credit.startDate)} - {paidCount}/{credit.installmentCount} pagos
            </p>
            {!isSettled && nextInstallment ? (
              <p className="mt-1 text-xs font-semibold text-stone-600">
                Proximo pago #{nextInstallment.installmentNumber}: {formatDate(nextInstallment.dueDate)} -{" "}
                {formatCurrency(installmentBalance(nextInstallment))}
              </p>
            ) : null}
            {credit.paymentEffectiveness ? (
              <p className="mt-1 text-xs font-semibold text-stone-600">
                Efectividad: <span className="font-bold text-moss">{Math.round(credit.paymentEffectiveness.accruedPaymentRate * 100)}%</span> ({credit.paymentEffectiveness.paidAccruedCount} de {credit.paymentEffectiveness.accruedCount} cuotas devengadas)
                {" · "}Puntualidad: {Math.round(credit.paymentEffectiveness.punctualityRate * 100)}%
              </p>
            ) : null}
          </div>
          <div className="sm:text-right">
            {isSettled ? (
              <p className="text-lg font-black text-ink">{formatCurrency(credit.totalAmount)}</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-stone-500">Saldo pendiente</p>
                <p className="text-lg font-black text-moss">{formatCurrency(pending)}</p>
                <p className="text-xs text-stone-500">Total {formatCurrency(credit.totalAmount)}</p>
              </>
            )}
          </div>
        </div>
        {!isSettled ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-maize" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        ) : null}
      </Link>
      {isSettled ? (
        <Link
          href={`/creditos/nuevo?renovar=${credit.id}`}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-moss px-3 text-sm font-bold text-white"
        >
          Renovar
        </Link>
      ) : (
        <Link
          href={`/creditos/${credit.id}/pagos/nuevo`}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-bold text-white"
        >
          Cobrar este credito
        </Link>
      )}
    </div>
  );
}

function EffectivenessCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  const percent = Math.round(value * 100);

  return (
    <div className="rounded-md border border-line bg-field p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-500">{title}</p>
        <p className="text-3xl font-black text-moss">{percent}%</p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-maize" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold text-stone-600">{detail}</p>
    </div>
  );
}
