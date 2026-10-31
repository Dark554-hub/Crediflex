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
  RefreshCw,
  Settings,
  UserPlus,
  Users,
  WalletCards,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/acceso/actions";
import { SyncBadge } from "@/components/mobile/sync-badge";
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
  let dashboard: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let dbError: string | null = null;

  try {
    dashboard = await getDashboardData();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    dbError =
      msg.includes("connect") || msg.includes("ECONNREFUSED") || msg.includes("Can't reach")
        ? "No se pudo conectar a la base de datos. Verifica tu conexion o que el proyecto Supabase este activo."
        : "Ocurrio un error al cargar los datos del tablero.";
    console.error("[Dashboard] getDashboardData error:", err);
  }

  if (dbError || !dashboard) {
    return <ErrorState message={dbError ?? "Error desconocido."} />;
  }

  const todayClientItems = groupInstallmentsByClient(dashboard.installmentsToday);
  const overdueClientItems = groupInstallmentsByClient(dashboard.overdueInstallments);
  const upcomingClientItems = groupInstallmentsByClient(dashboard.upcomingInstallments);

  const statCards = [
    {
      label: "Cobrado hoy",
      value: formatCurrency(dashboard.collectedToday),
      sublabel: `${dashboard.paymentCountToday} pagos registrados`,
      color: "text-moss",
      bg: "bg-mint/40",
    },
    {
      label: "Por cobrar hoy",
      value: formatCurrency(dashboard.pendingToday),
      sublabel: `${dashboard.dueTodayCount} cuotas pendientes`,
      color: "text-ink",
      bg: "bg-field",
    },
    {
      label: "Atrasado",
      value: formatCurrency(dashboard.overdueAmount),
      sublabel: `${dashboard.delinquentClients} clientes`,
      color: dashboard.overdueAmount > 0 ? "text-red-700" : "text-moss",
      bg: dashboard.overdueAmount > 0 ? "bg-red-50" : "bg-field",
    },
    {
      label: "Capital activo",
      value: formatCurrency(dashboard.activePrincipal),
      sublabel: `${dashboard.activeCount} prestamos activos`,
      color: "text-ink",
      bg: "bg-field",
    },
  ];

  return (
    <main className="min-h-screen bg-field pb-24 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink text-white shadow-soft">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold sm:text-2xl leading-none">Crediflex</h1>
            <p className="text-xs font-semibold text-white/70 mt-0.5 truncate">
              Ruta · {formatDate(dashboard.today)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SyncBadge />
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30"
              >
                <LogOut size={18} aria-hidden />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:py-6">
        {/* Portfolio hero */}
        <div className="mb-5 rounded-xl bg-ink p-5 text-white shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-white/60">Saldo por recuperar</p>
              <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
                {formatCurrency(dashboard.portfolioBalance)}
              </p>
            </div>
            <Link
              href="/cobros"
              className="inline-flex shrink-0 min-h-12 items-center justify-center gap-2 rounded-lg bg-maize px-5 py-3 text-sm font-extrabold text-ink transition hover:bg-mint active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/35"
            >
              Ir a cobros
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs font-semibold text-white/70">
            <span>Ganancia cobrada: <strong className="text-white font-extrabold">{formatCurrency(dashboard.interestCollected)}</strong></span>
            <span>Activos: <strong className="text-white font-extrabold">{dashboard.activeCount}</strong></span>
            <span>Liquidados: <strong className="text-white font-extrabold">{dashboard.settledCount}</strong></span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map(({ label, value, sublabel, color, bg }) => (
            <div key={label} className={`rounded-xl border border-line ${bg} p-4 shadow-soft`}>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide leading-none">{label}</p>
              <p className={`mt-2 text-xl font-extrabold leading-none ${color}`}>{value}</p>
              <p className="mt-2 text-xs font-semibold text-stone-600 leading-snug">{sublabel}</p>
            </div>
          ))}
        </div>

        {/* Main grid: actions + lists */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.9fr)]">
          {/* Left column */}
          <div className="grid gap-5">
            {/* Quick actions */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-ink">Acciones rapidas</h2>
                  <p className="text-xs font-semibold text-stone-500 mt-0.5">Lo mas usado durante la ruta.</p>
                </div>
                <PlusCircle className="text-maize shrink-0" size={24} aria-hidden />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {routeActions.map((item) => {
                  const Icon = item.icon;
                  const value = "stat" in item ? dashboard[item.stat] : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex min-h-20 items-center gap-3 rounded-lg border border-line bg-field p-4 transition duration-150 hover:border-maize hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-moss shadow-soft transition group-hover:bg-mint">
                        <Icon size={20} strokeWidth={2.4} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold text-ink leading-snug">{item.label}</span>
                        <span className="mt-0.5 block text-xs font-semibold leading-snug text-stone-500">{item.helper}</span>
                      </span>
                      {value !== null && value > 0 ? (
                        <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-xs font-extrabold text-white">{value}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Administration */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-ink">Administracion</h2>
                  <p className="text-xs font-semibold text-stone-500 mt-0.5">Consulta, reportes y ajustes.</p>
                </div>
                <ReceiptText className="text-maize shrink-0" size={24} aria-hidden />
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
                {adminActions.map((item) => {
                  const Icon = item.icon;
                  const value = "stat" in item ? dashboard[item.stat] : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col items-center gap-2 rounded-lg border border-line bg-field p-3 text-center transition duration-150 hover:border-maize hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-moss shadow-soft">
                        <Icon size={18} strokeWidth={2.4} aria-hidden />
                      </span>
                      <span className="text-xs font-extrabold text-ink leading-tight">{item.label}</span>
                      {value !== null ? (
                        <span className="text-[10px] font-bold text-stone-500">{value} activos</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: lists */}
          <div className="grid content-start gap-5">
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
            <DashboardList
              title="Proximos 7 dias"
              emptyText="No hay pagos proximos."
              items={upcomingClientItems}
            />

            {/* Zone collections */}
            {dashboard.zoneCollections.length > 0 && (
              <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
                <h2 className="text-base font-extrabold text-ink mb-3">Cobro por zona</h2>
                <div className="grid gap-2.5">
                  {dashboard.zoneCollections.map((zone) => {
                    const pct = zone.expected > 0 ? Math.min(Math.round((zone.collected / zone.expected) * 100), 100) : 0;
                    return (
                      <div key={zone.zoneId} className="rounded-lg bg-field p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-extrabold text-ink truncate">{zone.name}</p>
                          <p className="text-sm font-extrabold text-moss shrink-0">{formatCurrency(zone.collected)}</p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                          <div
                            className="h-full rounded-full bg-maize transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5 text-xs font-semibold text-stone-500">
                          <span>Esperado: {formatCurrency(zone.expected)}</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-field px-4 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-white shadow-lift">
          <WifiOff size={30} aria-hidden />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Error de conexion</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-stone-600">{message}</p>

        <div className="mt-6 rounded-xl border border-line bg-white p-5 text-left shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-3">Que puedes hacer</p>
          <ul className="space-y-2 text-sm font-semibold text-stone-700">
            <li className="flex gap-2">
              <span className="text-maize font-extrabold">1.</span>
              Verifica que tienes internet activo.
            </li>
            <li className="flex gap-2">
              <span className="text-maize font-extrabold">2.</span>
              Si usas Supabase gratis, el proyecto se pausa tras 7 dias sin actividad. Entra a supabase.com y reactiva el proyecto.
            </li>
            <li className="flex gap-2">
              <span className="text-maize font-extrabold">3.</span>
              Revisa que las variables DATABASE_URL y DIRECT_URL en tu archivo .env sean correctas.
            </li>
          </ul>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <form action={async () => { "use server"; }}>
            <a
              href="/"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-extrabold text-white transition hover:bg-moss active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30 sm:w-auto"
            >
              <RefreshCw size={16} aria-hidden />
              Reintentar
            </a>
          </form>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-5 py-3 text-sm font-extrabold text-ink transition hover:border-maize hover:bg-mint/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30 sm:w-auto"
          >
            Ir a Supabase
            <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      </div>
    </main>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
    meta: `${group.zone} · ${group.count} cuota${group.count === 1 ? "" : "s"} · ${formatDate(group.firstDueDate)}`,
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
    <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-extrabold text-ink">{title}</h2>
        {items.length > 0 ? (
          <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-extrabold text-moss">{items.length}</span>
        ) : null}
      </div>
      <div className="grid gap-2">
        {items.length === 0 ? (
          <p className="rounded-lg bg-field px-3 py-4 text-center text-xs font-semibold text-stone-500">{emptyText}</p>
        ) : (
          items.map((item) => (
            <Link
              key={`${item.href}-${item.meta}`}
              href={item.href}
              className="flex items-center gap-3 rounded-lg bg-field p-3 transition duration-150 hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/25"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-stone-500 leading-snug truncate">{item.meta}</p>
              </div>
              <p className="shrink-0 text-sm font-extrabold text-moss">{item.amount}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
