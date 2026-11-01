import { CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, Eye, ReceiptText, Search } from "lucide-react";
import Link from "next/link";
import { AppBar } from "@/components/mobile/app-bar";
import { formatDate } from "@/lib/format";
import { getOrCreateTodayCollection } from "@/lib/collections";
import { formatCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function DailyCollectionsPage({
  searchParams,
}: {
  searchParams: { q?: string; limit?: string; tab?: string };
}) {
  const collectionDay = await getOrCreateTodayCollection();
  const [lateFeeSum, paymentsToday] = await Promise.all([
    prisma.paymentAllocation.aggregate({
      where: {
        payment: {
          paymentDate: collectionDay.collectionDate,
          cancelledAt: null,
        },
      },
      _sum: {
        lateFeeApplied: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: collectionDay.collectionDate,
        cancelledAt: null,
      },
      include: {
        client: true,
        credit: {
          include: {
            zone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalLateFee = Number(lateFeeSum._sum.lateFeeApplied ?? 0);
  const query = (searchParams.q ?? "").trim().toLowerCase();
  const activeTab = searchParams.tab === "cobrados" ? "cobrados" : "pendientes";
  const limit = Math.min(Math.max(Number(searchParams.limit) || PAGE_SIZE, PAGE_SIZE), 500);
  const visibleItems = collectionDay.items.filter((item) => {
    const balance = Math.max(Number(item.expectedAmount) - Number(item.collectedAmount), 0);
    return balance > 0 || item.status === "missed";
  });
  const allClientGroups = collectionDay.items.reduce<
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

  const matchingGroups = query
    ? allClientGroups.filter((group) => group.clientName.toLowerCase().includes(query))
    : allClientGroups;
  const matchingPayments = query
    ? paymentsToday.filter((payment) => payment.client.fullName.toLowerCase().includes(query))
    : paymentsToday;
  const hasMore = matchingGroups.length > limit;
  const clientGroups = hasMore ? matchingGroups.slice(0, limit) : matchingGroups;
  const zones = Array.from(new Set(clientGroups.map((group) => group.zoneName)));
  const moreParams = new URLSearchParams();
  if (searchParams.q) moreParams.set("q", searchParams.q);
  if (searchParams.tab) moreParams.set("tab", searchParams.tab);
  moreParams.set("limit", String(limit + PAGE_SIZE));

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
            <span className="rounded-full bg-maize px-3 py-1 text-xs font-bold text-ink">Activa</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryItem label="Esperado" value={formatCurrency(collectionDay.totalExpected)} />
            <SummaryItem label="Cobrado" value={formatCurrency(collectionDay.totalCollected)} />
            <SummaryItem label="Pendiente" value={formatCurrency(collectionDay.totalPending)} />
            <SummaryItem label="Mora" value={formatCurrency(totalLateFee)} />
          </div>
        </div>

        {/* Pestañas: Por cobrar vs Cobrados hoy */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-line bg-white p-1.5 shadow-soft">
          <Link
            href={`/cobros${searchParams.q ? `?q=${encodeURIComponent(searchParams.q)}` : ""}`}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-extrabold transition ${
              activeTab === "pendientes"
                ? "bg-ink text-white shadow-sm"
                : "text-stone-600 hover:bg-field"
            }`}
          >
            Por cobrar ({allClientGroups.length})
          </Link>
          <Link
            href={`/cobros?tab=cobrados${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ""}`}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-extrabold transition ${
              activeTab === "cobrados"
                ? "bg-moss text-white shadow-sm"
                : "text-stone-600 hover:bg-field"
            }`}
          >
            Cobrado hoy ({paymentsToday.length})
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-2">
        <form className="relative" action="/cobros">
          {activeTab === "cobrados" ? <input type="hidden" name="tab" value="cobrados" /> : null}
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
            aria-hidden
          />
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            className="min-h-12 w-full rounded-md border border-line bg-white px-10 text-base outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
            placeholder="Buscar cliente en ruta..."
          />
        </form>
      </section>

      {activeTab === "cobrados" ? (
        <section className="mx-auto max-w-4xl px-4">
          {matchingPayments.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-white px-5 py-10 text-center">
              <CheckCircle2 className="mx-auto text-moss" size={38} aria-hidden />
              <h2 className="mt-3 text-xl font-extrabold text-ink">Sin pagos registrados hoy</h2>
              <p className="mt-1 text-sm text-stone-600">
                Los pagos que registres durante el dia apareceran aqui con su recibo y acceso al prestamo.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {matchingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-md border border-line bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-extrabold text-ink">{payment.client.fullName}</p>
                      <p className="text-sm font-semibold text-stone-600">
                        {payment.credit.zone.name} · Prestamo #{payment.credit.creditNumber ?? "-"}
                      </p>
                      <p className="text-xs text-stone-500">
                        Fecha: {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-extrabold text-moss">{formatCurrency(payment.amount)}</p>
                      <span className="inline-block rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold text-moss">
                        Pagado
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/creditos/${payment.creditId}?pago=${payment.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-moss px-3.5 text-xs font-extrabold text-white transition hover:bg-ink"
                    >
                      <ReceiptText size={15} aria-hidden />
                      Ver / Compartir Recibo
                    </Link>
                    <Link
                      href={`/creditos/${payment.creditId}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-field px-3.5 text-xs font-extrabold text-ink transition hover:border-moss"
                    >
                      <Eye size={15} aria-hidden />
                      Detalles del prestamo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-4xl px-4">
          {visibleItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-white px-5 py-10 text-center">
              <CalendarDays className="mx-auto text-moss" size={38} aria-hidden />
              <h2 className="mt-3 text-xl font-extrabold text-ink">No hay cobros pendientes</h2>
              <p className="mt-1 text-sm text-stone-600">Las cuotas de hoy o vencidas apareceran aqui.</p>
            </div>
          ) : matchingGroups.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-white px-5 py-10 text-center">
              <Search className="mx-auto text-stone-400" size={32} aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-ink">{`Sin resultados para "${query}"`}</h2>
              <p className="mt-1 text-sm text-stone-600">Verifica el nombre del cliente.</p>
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
                        const creditIds = Array.from(new Set(client.items.map((item) => item.creditId)));
                        const creditCount = creditIds.length;
                        const firstCreditId = creditIds[0];
                        const overdueCount = client.items.filter((item) => item.status === "overdue" || item.status === "missed").length;

                        return (
                          <div key={client.clientId} className="min-w-0 rounded-md bg-field p-3">
                            <Link
                              href={`/cobros/${client.clientId}`}
                              className="block min-w-0 transition hover:opacity-90"
                            >
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
                            </Link>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Link
                                href={`/cobros/${client.clientId}`}
                                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-moss px-3.5 text-xs font-extrabold text-white transition hover:bg-ink"
                              >
                                <CircleDollarSign size={16} aria-hidden />
                                Cobrar
                              </Link>
                              {firstCreditId ? (
                                <Link
                                  href={`/creditos/${firstCreditId}`}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3.5 text-xs font-extrabold text-ink transition hover:border-moss"
                                >
                                  <Eye size={16} aria-hidden />
                                  Detalles del prestamo
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {hasMore ? (
                <Link
                  href={`/cobros?${moreParams.toString()}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-line bg-white px-5 text-sm font-extrabold text-moss shadow-soft transition hover:bg-field"
                >
                  Mostrar mas clientes en cobro
                </Link>
              ) : null}
            </div>
          )}
        </section>
      )}
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
