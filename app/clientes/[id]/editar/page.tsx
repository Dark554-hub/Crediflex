import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { getClientById, getZones } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const [client, zones] = await Promise.all([getClientById(params.id), getZones()]);

  if (!client) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-5 sm:px-6">
      <Link href={`/clientes/${client.id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-moss">
        <ArrowLeft size={18} aria-hidden />
        Perfil
      </Link>

      <section className="rounded-md border border-line bg-white/80 p-4 shadow-lift sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Edicion</p>
          <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">Editar cliente</h1>
        </div>
        <ClientForm zones={zones} client={client} />
      </section>
    </main>
  );
}
