export function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .trim();
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    throw new Error("Ingresa un monto valido.");
  }

  return Math.round(amount * 100) / 100;
}

export function toDecimalString(amount: number) {
  return amount.toFixed(2);
}

export function formatCurrency(amount: number | { toString(): string }) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(amount.toString()));
}
