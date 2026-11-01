import fs from "fs";

const content = fs.readFileSync("scripts/final-raw-data.csv", "utf-8");
const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);

const monthMap = {
  "ene": 0, "feb": 1, "mar": 2, "abr": 3, "may": 4, "jun": 5,
  "jul": 6, "ago": 7, "sep": 8, "oct": 9, "nov": 10, "dic": 11
};

const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function parseCustomDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  const day = parseInt(parts[0], 10);
  const monStr = parts[1].toLowerCase().slice(0, 3);
  const month = monthMap[monStr];
  let year = 2026;
  if (parts.length === 3) {
    const yr = parseInt(parts[2], 10);
    year = yr < 100 ? 2000 + yr : yr;
  }
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.replace(/,/g, "").replace(/"/g, "").trim()) continue;
  
  const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/);
  if (!match) continue;
  
  const [_, name, phone, address, zone, principal, quota, freq, dayCobro, totalCuotas, cuotasPagadas, interes, fechaInicio] = match;
  if (!principal) continue;
  
  const d = parseCustomDate(fechaInicio);
  const dow = d ? dayNames[d.getUTCDay()] : "N/A";
  const dateIso = d ? d.toISOString().slice(0, 10) : "N/A";
  const statedDay = dayCobro.toLowerCase().replace(/s$/, ""); // sabados -> sabado
  
  const matchesDay = statedDay ? statedDay.includes(dow) : true;
  console.log(`L${i.toString().padStart(2, "0")} | ${name.slice(0, 25).padEnd(25)} | ${freq.padEnd(8)} | Cobro: ${statedDay.padEnd(9)} | Fecha: ${fechaInicio.padEnd(9)} (${dateIso}, ${dow}) | Match: ${matchesDay ? "OK" : "DIFERENTE"}`);
}
