import { notFound } from "next/navigation";
import { AppBar } from "@/components/mobile/app-bar";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/money";

export const dynamic = "force-dynamic";

const statusLabels = {
  pending: "Pendiente",
  paid: "Pagado",
  partial: "Parcial",
  missed: "No pago",
  overdue: "Vencido",
};

export default async function CollectionDayDetailPage({ params }: { params: { id: string } }) {
  const day = await prisma.collectionDay.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          client: true,
          credit: true,
          installment: true,
          zone: true,
        },
        orderBy: [{ zone: { name: "asc" } }, { createdAt: "asc" }],
      },
    },
  });

  if (!day) {
    notFound();
  }

  const lateFeeSum = await prisma.paymentAllocation.aggregate({
    where: {
      payment: {
        paymentDate: day.collectionDate,
        cancelledAt: null,
      },
    },
    _sum: {
      lateFeeApplied: true,
    },
  });
  const totalLateFee = Number(lateFeeSum._sum.lateFeeApplied ?? 0);

  return (
    <main className="min-h-screen bg-field pb-8">
      <AppBar title="Detalle de jornada" backHref="/jornadas" />

      <section className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-md bg-ink p-4 text-white shadow-soft">
          <p className="text-sm font-semibold text-white/70">Jornada</p>
          <h1 className="mt-1 text-2xl font-extrabold">{formatDate(day.collectionDate)}</h1>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Summary label="Esperado" value={formatCurrency(day.totalExpected)} />
            <Summary label="Cobrado" value={formatCurrency(day.totalCollected)} />
            <Summary label="Pendiente" value={formatCurrency(day.totalPending)} />
            <Summary label="Mora" value={formatCurrency(totalLateFee)} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-3 px-4">
        {day.items.map((item) => (
          <div key={item.id} className="rounded-md border border-line bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">{item.client.fullName}</h2>
                <p className="mt-1 text-sm text-stone-700">
                  {item.zone.name} - pago #{item.installment.installmentNumber}
                </p>
                <p className="mt-1 text-xs font-semibold text-stone-600">{statusLabels[item.status]}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-moss">{formatCurrency(item.collectedAmount)}</p>
                <p className="text-xs text-stone-600">de {formatCurrency(item.expectedAmount)}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs font-semibold text-white/65">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}
