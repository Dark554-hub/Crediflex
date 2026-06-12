import { UserRound } from "lucide-react";

export function AvatarHero({ name, subtitle }: { name?: string; subtitle?: string }) {
  return (
    <section className="border-b border-line bg-ink px-4 pb-6 pt-5 text-center text-white">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/90 bg-maize shadow-soft sm:h-28 sm:w-28">
        <UserRound size={56} className="text-white" aria-hidden />
      </div>
      {name ? <h2 className="mx-auto mt-3 max-w-xl text-2xl font-extrabold leading-tight sm:text-3xl">{name}</h2> : null}
      {subtitle ? <p className="mt-1 text-sm font-semibold text-white/78">{subtitle}</p> : null}
    </section>
  );
}
