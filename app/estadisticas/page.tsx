import { AppBar } from "@/components/mobile/app-bar";
import { formatCurrency } from "@/lib/money";
import { getGeneralStats } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getGeneralStats();

  const cards = [
    ["Capital prestado", formatCurrency(stats.totalPrincipal)],
    ["Intereses generados", formatCurrency(stats.totalInterest)],
    ["Cartera total", formatCurrency(stats.totalPortfolio)],
    ["Cobrado", formatCurrency(stats.totalCollected)],
    ["Prestamos vigentes", String(stats.activeCredits)],
    ["Prestamos liquidados", String(stats.settledCredits)],
  ];

  return (
    <main className="min-h-screen bg-field">
      <AppBar title="Estadisticas" />
      <section className="mx-auto grid max-w-3xl gap-3 px-4 py-5 sm:grid-cols-2">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-moss">{value}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
