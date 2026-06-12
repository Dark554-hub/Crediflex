import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentForm } from "@/components/payments/payment-form";
import { formatCurrency } from "@/lib/money";
import { getPaymentFormData } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({ params }: { params: { id: string } }) {
  const credit = await getPaymentFormData(params.id);

  if (!credit) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-5 sm:px-6">
      <Link href={`/creditos/${credit.id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-moss">
        <ArrowLeft size={18} aria-hidden />
        Credito
      </Link>

      <section className="rounded-md border border-line bg-white/80 p-4 shadow-lift sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Cobranza</p>
          <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">Registrar pago</h1>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            {credit.client.fullName} - pago sugerido {formatCurrency(credit.installmentAmount)}
          </p>
        </div>
        <PaymentForm credit={credit} />
      </section>
    </main>
  );
}
