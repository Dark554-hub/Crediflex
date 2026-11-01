import { CircleDollarSign, ClockAlert, Eye } from "lucide-react";
import Link from "next/link";
import { AppBar } from "@/components/mobile/app-bar";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { getOverdueInstallments } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function OverduePage() {
  const installments = await getOverdueInstallments();
  const clients = installments.reduce<
    Array<{
      clientId: string;
      creditId: string;
      creditNumber: number | null;
      fullName: string;
      zoneName: string;
      count: number;
      balance: number;
      firstDueDate: Date;
    }>
  >((groups, installment) => {
    const balance =
      Number(installment.scheduledAmount) +
      Number(installment.lateFeeAmount) -
      Number(installment.paidAmount);
    const existing = groups.find((group) => group.clientId === installment.credit.clientId);

    if (existing) {
      existing.count += 1;
      existing.balance += Math.max(balance, 0);
      if (installment.dueDate < existing.firstDueDate) {
        existing.firstDueDate = installment.dueDate;
      }
      return groups;
    }

    groups.push({
      clientId: installment.credit.clientId,
      creditId: installment.creditId,
      creditNumber: installment.credit.creditNumber,
      fullName: installment.credit.client.fullName,
      zoneName: installment.credit.zone.name,
      count: 1,
      balance: Math.max(balance, 0),
      firstDueDate: installment.dueDate,
    });

    return groups;
  }, []);

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Cuotas atrasadas" />
      <section className="mx-auto max-w-3xl px-4 py-5">
        {clients.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white px-5 py-10 text-center">
            <ClockAlert className="mx-auto text-moss" size={38} aria-hidden />
            <h2 className="mt-3 text-xl font-black text-ink">Sin cuotas atrasadas</h2>
            <p className="mt-1 text-sm text-stone-600">Las cuotas vencidas apareceran en esta lista.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => (
              <div
                key={client.clientId}
                className="rounded-md border border-clay/25 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-ink">{client.fullName}</p>
                    <p className="text-sm text-stone-600">
                      {client.zoneName} - {client.count} cuota{client.count === 1 ? "" : "s"} vencida{client.count === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs font-semibold text-clay">Desde {formatDate(client.firstDueDate)}</p>
                  </div>
                  <p className="text-2xl font-black text-clay">{formatCurrency(client.balance)}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/cobros/${client.clientId}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-moss px-3.5 text-xs font-extrabold text-white transition hover:bg-ink"
                  >
                    <CircleDollarSign size={16} aria-hidden />
                    Cobrar
                  </Link>
                  <Link
                    href={`/creditos/${client.creditId}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-field px-3.5 text-xs font-extrabold text-ink transition hover:border-moss"
                  >
                    <Eye size={16} aria-hidden />
                    Detalles del prestamo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
