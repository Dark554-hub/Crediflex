import fs from "fs";

const content = fs.readFileSync("scripts/final-raw-data.csv", "utf-8");
const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);

console.log(`Total lineas: ${lines.length}`);

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.replace(/,/g, "").replace(/"/g, "").trim()) continue;
  
  // CSV parse simple
  const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/);
  if (!match) {
    console.error(`Error parseando linea ${i}:`, line);
    continue;
  }
  
  const [_, name, phone, address, zone, principal, quota, freq, dayCobro, totalCuotas, cuotasPagadas, interes, fechaInicio] = match;
  rows.push({
    lineIndex: i,
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    zone: zone.trim(),
    principal: principal.trim(),
    quota: quota.trim(),
    freq: freq.trim(),
    dayCobro: dayCobro.trim(),
    totalCuotas: totalCuotas.trim(),
    cuotasPagadas: cuotasPagadas.trim(),
    interes: interes.trim(),
    fechaInicio: fechaInicio.trim(),
  });
}

console.log(`Filas validas encontradas: ${rows.length}`);

// Analizar clientes unicos y creditos
const clientsMap = new Map();
const clientsWithoutCredit = [];

for (const r of rows) {
  const cleanName = r.name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  
  if (!cleanName) continue;

  if (!r.principal) {
    clientsWithoutCredit.push(r);
  }

  if (!clientsMap.has(cleanName)) {
    clientsMap.set(cleanName, []);
  }
  clientsMap.get(cleanName).push(r);
}

console.log(`Clientes unicos: ${clientsMap.size}`);
console.log(`Filas sin credito: ${clientsWithoutCredit.length}`);
for (const c of clientsWithoutCredit) {
  console.log(`  - Sin credito: ${c.name} | Tel: ${c.phone} | Dir: ${c.address} | Zona: ${c.zone}`);
}

// Clientes con multiples creditos
console.log("\nClientes con mas de 1 credito:");
for (const [name, list] of clientsMap.entries()) {
  if (list.length > 1) {
    console.log(`  - ${name.toUpperCase()}: ${list.length} creditos`);
  }
}
