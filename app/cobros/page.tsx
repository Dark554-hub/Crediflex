import { CalendarDays, ChevronRight, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { closeCollectionDayAction } from "@/app/cobros/actions";
import { AppBar } from "@/components/mobile/app-bar";
import { formatDate } from "@/lib/format";
import { getOrCreateTodayCollection } from "@/lib/collections";
import { formatCurrency } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DailyCollectionsPage() {
  const collectionDay = await getOrCreateTodayCollection();
  const visibleItems = collectionDay.items.filter((item) => {
    const balance = Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0);
    return balance > 0 || item.status === "missed";
  });
  const zones = Array.from(new Set(visibleItems.map((item) => item.zone.name)));
  const clientGroups = collectionDay.items.reduce<
    Array<{
      clientId: string;
      clientName: string;
      zoneName: string;
      items: typeof collectionDay.items;
      balance: number;
      collected: number;
    }>
  >((groups, item) => {
    const balance = Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0);
    if (balance <= 0 && item.status !== "missed") {
      return groups;
    }

    const existing = groups.find((group) => group.clientId === item.clientId);

    if (existing) {
      existing.items.push(item);
      existing.balance += balance;
      existing.collected += Number(item.collectedAmount);
      return groups;
    }

    groups.push({
      clientId: item.clientId,
      clientName: item.client.fullName,
      zoneName: item.zone.name,
      items: [item],
      balance,
      collected: Number(item.collectedAmount),
    });

    return groups;
  }, []);

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Cobros del dia" />

      <section className="mx-auto max-w-4xl px-4 py-4">
        <div className="rounded-md bg-ink p-4 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/70">Jornada</p>
              <h1 className="text-2xl font-extrabold">{formatDate(collectionDay.collectionDate)}</h1>
            </div>
            {collectionDay.closedAt ? (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Cerrada</span>
            ) : (
              <span className="rounded-full bg-maize px-3 py-1 text-xs font-bold text-ink">Abierta</span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryItem label="Esperado" value={formatCurrency(collectionDay.totalExpected)} />
            <SummaryItem label="Cobrado" value={formatCurrency(collectionDay.totalCollected)} />
            <SummaryItem label="Pendiente" value={formatCurrency(collectionDay.totalPending)} />
            <SummaryItem label="Mora / no pago" value={formatCurrency(collectionDay.totalOverdue)} />
          </div>
        </div>

        {!collectionDay.closedAt ? (
          <form action={closeCollectionDayAction} className="mt-3">
            <input type="hidden" name="collectionDayId" value={collectionDay.id} />
            <button className="min-h-12 w-full rounded-md bg-moss px-4 text-sm font-extrabold text-white shadow-soft transition active:bg-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30">
              Cerrar jornada
            </button>
          </form>
        ) : null}
      </section>

      <section className="mx-auto max-w-4xl px-4">
        {visibleItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white px-5 py-10 text-center">
            <CalendarDays className="mx-auto text-moss" size={38} aria-hidden />
            <h2 className="mt-3 text-xl font-extrabold text-ink">No hay cobros pendientes</h2>
            <p className="mt-1 text-sm text-stone-600">Las cuotas de hoy o vencidas apareceran aqui.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {zones.map((zoneName) => {
              const clients = clientGroups.filter((group) => group.zoneName === zoneName);

              return (
                <div key={zoneName} className="min-w-0 overflow-hidden rounded-md border border-line bg-white p-4 shadow-soft">
                  <h2 className="text-xl font-extrabold text-ink">{zoneName}</h2>
                  <div className="mt-3 grid gap-3">
                    {clients.map((client) => {
                      const creditCount = new Set(client.items.map((item) => item.creditId)).size;
                      const overdueCount = client.items.filter((item) => item.status === "overdue" || item.status === "missed").length;

                      return (
                        <Link key={client.clientId} href={`/cobros/${client.clientId}`} className="block min-w-0 rounded-md bg-field p-3 transition hover:bg-mint/45 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-lg font-extrabold text-ink">{client.clientName}</p>
                              <p className="text-sm font-semibold text-stone-600">
                                {creditCount} credito{creditCount === 1 ? "" : "s"} con cobro hoy
                              </p>
                              <p className="text-xs text-stone-500">
                                {client.items.length} cuota{client.items.length === 1 ? "" : "s"} pendiente{client.items.length === 1 ? "" : "s"}
                                {overdueCount > 0 ? ` - ${overdueCount} vencida${overdueCount === 1 ? "" : "s"}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-right">
                              <div>
                              <p className="text-xl font-extrabold text-moss">{formatCurrency(client.balance)}</p>
                              <p className="text-xs text-stone-600">
                                Cobrado {formatCurrency(client.collected)}
                              </p>
                              </div>
                              <ChevronRight className="text-moss" size={20} aria-hidden />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-sm font-bold text-moss">
                            <CircleDollarSign size={17} aria-hidden />
                            Elegir credito para cobrar
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs font-semibold text-white/65">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}
