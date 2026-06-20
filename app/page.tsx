import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClockAlert,
  Cloud,
  FileSpreadsheet,
  HandCoins,
  History,
  ListChecks,
  LogOut,
  PlusCircle,
  ReceiptText,
  Settings,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/acceso/actions";
import { formatDate } from "@/lib/format";
import { getDashboardData } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/money";

const routeActions = [
  { href: "/cobros", label: "Cobrar hoy", helper: "Clientes con pago pendiente", icon: CalendarDays, stat: "dueTodayCount" },
  { href: "/atrasadas", label: "Atrasados", helper: "Cuotas que requieren seguimiento", icon: ClockAlert, stat: "overdueCount" },
  { href: "/creditos/nuevo", label: "Nuevo prestamo", helper: "Normal o express", icon: HandCoins },
  { href: "/clientes/nuevo", label: "Nuevo cliente", helper: "Alta rapida para ruta", icon: UserPlus },
] as const;

const adminActions = [
  { href: "/creditos", label: "Prestamos", icon: ListChecks, stat: "activeCount" },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/finanzas", label: "Finanzas", icon: WalletCards },
  { href: "/estadisticas", label: "Estadisticas", icon: BarChart3 },
  { href: "/reportes", label: "Reportes", icon: FileSpreadsheet },
  { href: "/jornadas", label: "Jornadas", icon: History },
  { href: "/sincronizacion", label: "Sincronizacion", icon: Cloud },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboard = await getDashboardData();
  const todayClientItems = groupInstallmentsByClient(dashboard.installmentsToday);
  const overdueClientItems = groupInstallmentsByClient(dashboard.overdueInstallments);
  const upcomingClientItems = groupInstallmentsByClient(dashboard.upcomingInstallments);

  const statCards = [
    ["Cobrado hoy", formatCurrency(dashboard.collectedToday), `${dashboard.paymentCountToday} pagos registrados`],
    ["Por cobrar hoy", formatCurrency(dashboard.pendingToday), `${dashboard.dueTodayCount} cuotas pendientes`],
    ["Atrasado", formatCurrency(dashboard.overdueAmount), `${dashboard.delinquentClients} clientes`],
    ["Capital activo", formatCurrency(dashboard.activePrincipal), `${dashboard.activeCount} prestamos activos`],
  ];

  return (
    <main className="min-h-screen bg-field pb-8">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink text-white shadow-soft">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <div className="flex-1">
            <h1 className="text-xl font-extrabold sm:text-2xl">Crediflex</h1>
            <p className="text-xs font-semibold text-white/75">Ruta de cobro - {formatDate(dashboard.today)}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-white/86 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30"
            >
              <LogOut size={18} aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:gap-6 lg:py-6">
        <section className="grid gap-4">
          <div className="rounded-md bg-ink p-5 text-white shadow-soft sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-white/72">Saldo por recuperar</p>
                <p className="mt-2 text-3xl font-extrabold leading-none sm:text-4xl">
                  {formatCurrency(dashboard.portfolioBalance)}
                </p>
              </div>
              <Link
                href="/cobros"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-extrabold text-ink transition hover:bg-mint active:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/35"
              >
                Ir a cobros
                <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <div className="mt-5 grid gap-3 border-t border-white/14 pt-4 text-sm font-semibold sm:grid-cols-3">
              <span>Ganancia cobrada: {formatCurrency(dashboard.interestCollected)}</span>
              <span>Prestamos activos: {dashboard.activeCount}</span>
              <span>Liquidados: {dashboard.settledCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {statCards.map(([label, value, sublabel]) => (
              <div key={label} className="rounded-md border border-line bg-white p-4 shadow-soft">
                <p className="text-xs font-extrabold text-moss">{label}</p>
                <p className="mt-2 text-2xl font-extrabold leading-none text-ink">{value}</p>
                <p className="mt-2 text-xs font-bold text-stone-700">{sublabel}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Acciones rapidas</h2>
                <p className="mt-1 text-sm font-semibold text-stone-700">Lo mas usado durante la ruta.</p>
              </div>
              <PlusCircle className="hidden text-maize sm:block" size={28} aria-hidden />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {routeActions.map((item) => {
                const Icon = item.icon;
                const value = "stat" in item ? dashboard[item.stat] : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-24 items-center gap-3 rounded-md border border-line bg-field p-4 transition duration-200 hover:border-maize hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
                  >
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-ink shadow-soft transition group-hover:bg-mint">
                      <Icon size={24} strokeWidth={2.4} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold text-ink">{item.label}</span>
                      <span className="mt-1 block text-sm font-semibold leading-5 text-stone-700">{item.helper}</span>
                    </span>
                    {value !== null ? (
                      <span className="rounded-full bg-ink px-2.5 py-1 text-sm font-extrabold text-white">{value}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <DashboardList title="Pendientes de hoy" emptyText="No hay cobros pendientes para hoy." items={todayClientItems} />
          <DashboardList title="Atrasados" emptyText="No hay cuotas vencidas." items={overdueClientItems} />
        </aside>

        <section className="grid gap-4 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
          <div className="rounded-md border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">Administracion</h2>
                <p className="mt-1 text-sm font-semibold text-stone-700">Consulta, reportes y ajustes.</p>
              </div>
              <ReceiptText className="hidden text-maize sm:block" size={28} aria-hidden />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {adminActions.map((item) => {
                const Icon = item.icon;
                const value = "stat" in item ? dashboard[item.stat] : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-line bg-field p-3 transition duration-200 hover:border-maize hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
                  >
                    <Icon className="text-ink" size={22} strokeWidth={2.4} aria-hidden />
                    <p className="mt-3 text-sm font-extrabold leading-tight text-moss">{item.label}</p>
                    {value !== null ? <p className="mt-1 text-xs font-bold text-stone-700">{value} activos</p> : null}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <DashboardList title="Proximos 7 dias" emptyText="No hay pagos proximos." items={upcomingClientItems} />

            <div className="rounded-md border border-line bg-white p-4 shadow-soft">
              <h2 className="text-lg font-extrabold text-ink">Cobro por zona</h2>
              <div className="mt-3 grid gap-3">
                {dashboard.zoneCollections.map((zone) => (
                  <div key={zone.zoneId} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-extrabold text-ink">{zone.name}</p>
                      <p className="text-sm font-semibold text-stone-700">Esperado hoy: {formatCurrency(zone.expected)}</p>
                    </div>
                    <p className="text-lg font-extrabold text-moss">{formatCurrency(zone.collected)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type DashboardInstallment = Awaited<ReturnType<typeof getDashboardData>>["installmentsToday"][number];

function groupInstallmentsByClient(installments: DashboardInstallment[]) {
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
    meta: `${group.zone} - ${group.count} cuota${group.count === 1 ? "" : "s"} - ${formatDate(group.firstDueDate)}`,
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        {items.length > 0 ? (
          <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-extrabold text-ink">{items.length}</span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {items.length === 0 ? (
          <p className="rounded-md bg-field px-3 py-4 text-sm font-semibold text-stone-700">{emptyText}</p>
        ) : (
          items.map((item) => (
            <Link
              key={`${item.href}-${item.meta}`}
              href={item.href}
              className="rounded-md bg-field p-3 transition hover:bg-mint/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-700">{item.meta}</p>
                </div>
                <p className="shrink-0 text-lg font-extrabold text-moss">{item.amount}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
