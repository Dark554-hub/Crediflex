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
  const numericAmount = Number(amount.toString());
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericAmount) ? Math.round(numericAmount) : 0);
}

