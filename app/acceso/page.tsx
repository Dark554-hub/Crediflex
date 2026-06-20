import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

function safeNextParam(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export default function AccessPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const nextPath = safeNextParam(searchParams.next);

  return (
    <main className="flex min-h-dvh items-center bg-field px-4 py-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="rounded-md bg-ink p-6 text-white shadow-lift sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-white/12 text-maize">
            <ShieldCheck size={26} aria-hidden />
          </div>
          <p className="mt-8 text-sm font-bold text-white/72">Sistema privado</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
            Acceso a Crediflex
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/82">
            Ingresa la contraseña para administrar clientes, prestamos, cobros y finanzas de la ruta.
          </p>
        </div>

        <div className="rounded-md border border-line bg-white p-5 shadow-soft sm:p-7">
          <h2 className="text-2xl font-extrabold text-ink">Entrar</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-stone-700">
            Esta pantalla protege el MVP mientras lo revisan desde celular o laptop.
          </p>
          <LoginForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
