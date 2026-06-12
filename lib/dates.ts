const mexicoTimeZone = "America/Mexico_City";

function mexicoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: mexicoTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function todayInMexicoAsUtcDate() {
  const { year, month, day } = mexicoDateParts();
  return new Date(Date.UTC(year, month - 1, day));
}

export function currentMexicoYear() {
  return mexicoDateParts().year;
}

export function todayInputValueInMexico() {
  const { year, month, day } = mexicoDateParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
