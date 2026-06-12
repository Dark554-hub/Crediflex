import { CreditStatus } from "@prisma/client";
import { twMerge } from "tailwind-merge";

export const creditStatusLabels: Record<CreditStatus, string> = {
  active: "Vigente",
  settled: "Liquidado",
  delinquent: "En mora",
  cancelled: "Cancelado",
};

const statusClassNames: Record<CreditStatus, string> = {
  active: "border-moss/25 bg-moss/10 text-moss",
  settled: "border-maize/30 bg-maize/15 text-stone-800",
  delinquent: "border-clay/30 bg-clay/10 text-clay",
  cancelled: "border-stone-300 bg-stone-100 text-stone-600",
};

export function CreditStatusBadge({ status, className }: { status: CreditStatus; className?: string }) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusClassNames[status],
        className,
      )}
    >
      {creditStatusLabels[status]}
    </span>
  );
}
