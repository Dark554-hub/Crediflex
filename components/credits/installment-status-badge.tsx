import { InstallmentStatus } from "@prisma/client";
import { twMerge } from "tailwind-merge";

const labels: Record<InstallmentStatus, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagado",
  overdue: "Vencido",
};

const classNames: Record<InstallmentStatus, string> = {
  pending: "border-stone-300 bg-white text-stone-700",
  partial: "border-maize/35 bg-maize/15 text-stone-800",
  paid: "border-moss/25 bg-moss/10 text-moss",
  overdue: "border-clay/30 bg-clay/10 text-clay",
};

export function InstallmentStatusBadge({
  status,
  className,
}: {
  status: InstallmentStatus;
  className?: string;
}) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        classNames[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
