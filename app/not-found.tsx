import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">No encontrado</p>
        <h1 className="mt-2 text-3xl font-black text-ink">No encontramos ese registro</h1>
        <Link
          href="/clientes"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
        >
          Volver a clientes
        </Link>
      </div>
    </main>
  );
}
