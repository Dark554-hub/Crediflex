import { ClientStatus } from "@prisma/client";
import { twMerge } from "tailwind-merge";

const statusLabels: Record<ClientStatus, string> = {
  active: "Activo",
  settled: "Liquidado",
  delinquent: "En mora",
  inactive: "Inactivo",
};

const statusClassNames: Record<ClientStatus, string> = {
  active: "border-moss/25 bg-moss/10 text-moss",
  settled: "border-maize/30 bg-maize/15 text-stone-800",
  delinquent: "border-clay/30 bg-clay/10 text-clay",
  inactive: "border-stone-300 bg-stone-100 text-stone-600",
};

export function StatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusClassNames[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export { statusLabels };
