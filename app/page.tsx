import {
  BarChart3,
  CalendarDays,
  ClockAlert,
  Cloud,
  FileSpreadsheet,
  Gem,
  HandCoins,
  History,
  ListChecks,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getDashboardData } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/money";

const menuItems = [
  { href: "/cobros", label: "Cobros del dia", icon: CalendarDays, stat: "dueTodayCount" },
  { href: "/atrasadas", label: "Cuotas atrasadas", icon: ClockAlert, stat: "overdueCount" },
  { href: "/creditos/nuevo", label: "Nuevo prestamo", icon: HandCoins },
  { href: "/clientes/nuevo", label: "Nuevo cliente", icon: UserPlus },
  { href: "/creditos", label: "Prestamos", icon: ListChecks, stat: "activeCount" },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/estadisticas", label: "Estadisticas", icon: BarChart3 },
  { href: "/reportes", label: "Reportes Excel", icon: FileSpreadsheet },
  { href: "/jornadas", label: "Jornadas", icon: History },
  { href: "/sincronizacion", label: "Sincronizacion", icon: Cloud },
  { href: "/configuracion", label: "Configuracion", icon: Settings },
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboard = await getDashboardData();
  const todayClientItems = groupInstallmentsByClient(dashboard.installmentsToday);
  const overdueClientItems = groupInstallmentsByClient(dashboard.overdueInstallments);

  const statCards = [
    ["Cobrado hoy", formatCurrency(dashboard.collectedToday), "Pagos registrados", dashboard.paymentCountToday],
    ["Pendiente hoy", formatCurrency(dashboard.pendingToday), "Cuotas por cobrar", dashboard.dueTodayCount],
    ["Mora", formatCurrency(dashboard.overdueAmount), "Clientes", dashboard.delinquentClients],
    ["Capital activo", formatCurrency(dashboard.activePrincipal), "Creditos", dashboard.activeCount],
  ];

  return (
    <main className="min-h-screen bg-field pb-8">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink text-white shadow-soft">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center px-4">
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">Crediflex</h1>
            <p className="text-xs font-semibold text-white/75">{formatDate(dashboard.today)}</p>
          </div>
          <Gem className="text-maize" size={28} aria-hidden />
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-4">
        <div className="rounded-md bg-ink p-4 text-white shadow-soft">
          <p className="text-sm font-semibold text-white/72">Resumen de cartera</p>
          <p className="mt-2 text-3xl font-extrabold">{formatCurrency(dashboard.portfolioBalance)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <span>Intereses cobrados: {formatCurrency(dashboard.interestCollected)}</span>
            <span>Liquidados: {dashboard.settledCount}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {statCards.map(([label, value, sublabel, count]) => (
            <div key={label} className="rounded-md border border-line bg-white p-4 shadow-soft">
              <p className="text-xs font-bold text-moss">{label}</p>
              <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
              <p className="mt-1 text-xs font-semibold text-stone-600">
                {sublabel}: {count}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl grid-cols-3 gap-2 px-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const value = "stat" in item ? dashboard[item.stat] : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-line bg-white p-3 text-center shadow-soft transition duration-200 hover:border-maize active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
            >
              <Icon className="mx-auto text-ink" size={30} strokeWidth={2.4} aria-hidden />
              <p className="mt-2 text-sm font-extrabold leading-tight text-moss">{item.label}</p>
              {value !== null ? <p className="mt-1 text-xs font-bold text-maize">{value}</p> : null}
            </Link>
          );
        })}
      </section>

      <section className="mx-auto mt-4 grid max-w-4xl gap-4 px-4 lg:grid-cols-2">
        <DashboardList
          title="Pendientes de hoy"
          emptyText="No hay cobros pendientes para hoy."
          items={todayClientItems}
        />

        <DashboardList
          title="Atrasados"
          emptyText="No hay cuotas vencidas."
          items={overdueClientItems}
        />
      </section>

      <section className="mx-auto mt-4 max-w-4xl px-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-extrabold text-ink">Cobro por zona</h2>
          <div className="mt-3 grid gap-3">
            {dashboard.zoneCollections.map((zone) => (
              <div key={zone.zoneId} className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-extrabold text-ink">{zone.name}</p>
                  <p className="text-sm text-stone-600">Esperado hoy: {formatCurrency(zone.expected)}</p>
                </div>
                <p className="text-xl font-extrabold text-moss">{formatCurrency(zone.collected)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function groupInstallmentsByClient(
  installments: Awaited<ReturnType<typeof getDashboardData>>["installmentsToday"],
) {
  const groups = installments.reduce<
    Array<{ clientId: string; title: string; zone: string; count: number; balance: number; firstDueDate: Date }>
  >((result, installment) => {
    const balance =
      Number(installment.scheduledAmount) +
      Number(installment.lateFeeAmount) -
      Number(installment.paidAmount);
    const existing = result.find((item) => item.clientId === installment.credit.clientId);

    if (existing) {
      existing.count += 1;
      existing.balance += Math.max(balance, 0);
      if (installment.dueDate < existing.firstDueDate) {
        existing.firstDueDate = installment.dueDate;
      }
      return result;
    }

    result.push({
      clientId: installment.credit.clientId,
      title: installment.credit.client.fullName,
      zone: installment.credit.zone.name,
      count: 1,
      balance: Math.max(balance, 0),
      firstDueDate: installment.dueDate,
    });

    return result;
  }, []);

  return groups.map((group) => ({
    href: `/cobros/${group.clientId}`,
    title: group.title,
    meta: `${group.zone} - ${group.count} cuota${group.count === 1 ? "" : "s"} - desde ${formatDate(group.firstDueDate)}`,
    amount: formatCurrency(group.balance),
  }));
}

function DashboardList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{ href: string; title: string; meta: string; amount: string }>;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-soft">
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.length === 0 ? (
          <p className="rounded-md bg-field px-3 py-4 text-sm font-semibold text-stone-700">{emptyText}</p>
        ) : (
          items.map((item) => (
            <Link key={`${item.href}-${item.meta}`} href={item.href} className="rounded-md bg-field p-3 transition hover:bg-mint/45">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold text-ink">{item.title}</p>
                  <p className="text-sm text-stone-600">{item.meta}</p>
                </div>
                <p className="text-lg font-extrabold text-moss">{item.amount}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
