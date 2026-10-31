import { CheckCircle2, CircleDollarSign, Undo2, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markCollectionItemMissedAction, unmarkCollectionItemMissedAction } from "@/app/cobros/actions";
import { AppBar } from "@/components/mobile/app-bar";
import { CreditStatusBadge } from "@/components/credits/credit-status-badge";
import { formatDate } from "@/lib/format";
import { getTodayCollectionForClient } from "@/lib/collections";
import { formatCurrency } from "@/lib/money";

export const dynamic = "force-dynamic";

const typeLabels = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
};

export default async function ClientCollectionsPage({ params }: { params: { clientId: string } }) {
  const collectionDay = await getTodayCollectionForClient(params.clientId);
  const visibleItems = collectionDay.items.filter((item) => {
    const balance = Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0);
    return balance > 0 || item.status === "missed";
  });
  const firstItem = collectionDay.items[0];

  if (!firstItem) {
    notFound();
  }

  const totalBalance = visibleItems.reduce(
    (total, item) => total + Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0),
    0,
  );
  const creditGroups = visibleItems.reduce<
    Array<{
      creditId: string;
      credit: (typeof collectionDay.items)[number]["credit"];
      items: typeof collectionDay.items;
      balance: number;
      collected: number;
      firstDueDate: Date;
    }>
  >((groups, item) => {
    const balance = Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0);
    const existing = groups.find((group) => group.creditId === item.creditId);

    if (existing) {
      existing.items.push(item);
      existing.balance += balance;
      existing.collected += Number(item.collectedAmount);
      if (item.installment.dueDate < existing.firstDueDate) {
        existing.firstDueDate = item.installment.dueDate;
      }
      return groups;
    }

    groups.push({
      creditId: item.creditId,
      credit: item.credit,
      items: [item],
      balance,
      collected: Number(item.collectedAmount),
      firstDueDate: item.installment.dueDate,
    });

    return groups;
  }, []);

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Cobros del cliente" backHref="/cobros" />

      <section className="mx-auto max-w-3xl px-4 py-4">
        <div className="rounded-md bg-ink p-4 text-white shadow-lift">
          <p className="text-sm font-semibold text-white/70">Cliente</p>
          <h1 className="text-2xl font-black">{firstItem.client.fullName}</h1>
          <p className="mt-1 text-sm font-semibold text-white/70">
            {firstItem.zone.name} - {formatDate(collectionDay.collectionDate)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryItem label="Pendiente" value={formatCurrency(totalBalance)} />
            <SummaryItem label="Creditos" value={String(new Set(collectionDay.items.map((item) => item.creditId)).size)} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-3 px-4">
        {creditGroups.map((group) => {
          const isExpress = group.credit.productType === "express";
          const overdueCount = group.items.filter((item) => item.status === "overdue" || item.status === "missed").length;
          const installmentNumbers = group.items
            .map((item) => `#${item.installment.installmentNumber}`)
            .join(", ");

          return (
            <article key={group.creditId} className="rounded-md border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-ink">
                      {isExpress ? "Express" : "Credito normal"}
                    </h2>
                    <CreditStatusBadge status={group.credit.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-stone-600">
                    {typeLabels[group.credit.type]} - {group.items.length} cuota{group.items.length === 1 ? "" : "s"}: {installmentNumbers}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Primer vencimiento {formatDate(group.firstDueDate)}
                    {overdueCount > 0 ? ` - ${overdueCount} vencida${overdueCount === 1 ? "" : "s"}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">Total credito {formatCurrency(group.credit.totalAmount)}</p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-black text-moss">{formatCurrency(group.balance)}</p>
                  <p className="text-xs text-stone-500">Cobrado {formatCurrency(group.collected)}</p>
                </div>
              </div>

              {!collectionDay.closedAt ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={`/creditos/${group.creditId}/pagos/nuevo`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-moss px-3 text-sm font-black text-white"
                  >
                    <CircleDollarSign size={17} aria-hidden />
                    Cobrar este
                  </Link>
                  {group.items.some((item) => item.status === "missed") ? (
                    <form action={unmarkCollectionItemMissedAction}>
                      {group.items.map((item) => (
                        <input key={item.id} type="hidden" name="itemId" value={item.id} />
                      ))}
                      <input type="hidden" name="collectionDayId" value={collectionDay.id} />
                      <input type="hidden" name="clientId" value={params.clientId} />
                      <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-moss/30 bg-mint px-3 text-sm font-black text-moss">
                        <Undo2 size={17} aria-hidden />
                        Cancelar no pago
                      </button>
                    </form>
                  ) : (
                    <form action={markCollectionItemMissedAction}>
                      {group.items.map((item) => (
                        <input key={item.id} type="hidden" name="itemId" value={item.id} />
                      ))}
                      <input type="hidden" name="collectionDayId" value={collectionDay.id} />
                      <input type="hidden" name="clientId" value={params.clientId} />
                      <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-clay/30 bg-clay/10 px-3 text-sm font-black text-clay">
                        <XCircle size={17} aria-hidden />
                        No pago
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-moss">
                  <CheckCircle2 size={17} aria-hidden />
                  Jornada cerrada
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs font-semibold text-white/65">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
