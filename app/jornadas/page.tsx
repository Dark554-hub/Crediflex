import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { AppBar } from "@/components/mobile/app-bar";
import { getCollectionHistory } from "@/lib/collections";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CollectionHistoryPage() {
  const days = await getCollectionHistory();

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Jornadas" />

      <section className="mx-auto max-w-3xl px-4 py-5">
        {days.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white px-5 py-10 text-center">
            <CalendarDays className="mx-auto text-moss" size={38} aria-hidden />
            <h1 className="mt-3 text-xl font-extrabold text-ink">Sin jornadas registradas</h1>
            <p className="mt-1 text-sm text-stone-700">
              Al abrir cobros del dia se crea la jornada correspondiente.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {days.map((day) => {
              const zones = Array.from(new Set(day.items.map((item) => item.zone.name))).join(", ") || "Sin zona";
              const missed = day.items.filter((item) => item.status === "missed").length;

              return (
                <Link
                  key={day.id}
                  href={`/jornadas/${day.id}`}
                  className="rounded-md border border-line bg-white p-4 shadow-soft transition hover:border-maize"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold text-ink">{formatDate(day.collectionDate)}</h2>
                      <p className="mt-1 text-sm text-stone-700">{zones}</p>
                      <p className="mt-1 text-xs font-semibold text-stone-600">
                        {day.items.length} cobros registrados - {missed} sin pago
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-moss">{formatCurrency(day.totalCollected)}</p>
                      <p className="text-xs text-stone-600">Pendiente {formatCurrency(day.totalPending)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
