import fs from "fs";

const content = fs.readFileSync("scripts/final-raw-data.csv", "utf-8");
const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.replace(/,/g, "").replace(/"/g, "").trim()) continue;
  
  const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/);
  if (!match) continue;
  
  const [_, name, phone, address, zone, principalStr, quotaStr, freq, dayCobro, totalCuotasStr, cuotasPagadasStr, interesStr, fechaInicio] = match;
  if (!principalStr) {
    console.log(`L${i}: ${name} -> CLIENTE SIN CREDITO`);
    continue;
  }
  
  const principal = parseFloat(principalStr);
  const quota = parseFloat(quotaStr);
  const totalCuotas = parseInt(totalCuotasStr, 10);
  const cuotasPagadas = parseInt(cuotasPagadasStr, 10);
  const totalAmount = quota * totalCuotas;
  const interestAmount = totalAmount - principal;
  const computedPercent = Math.round((interestAmount / principal) * 10000) / 100;
  const givenPercent = interesStr ? parseFloat(interesStr) : null;
  
  const diff = givenPercent !== null ? Math.abs(computedPercent - givenPercent) : 0;
  if (diff > 1) {
    console.log(`L${i}: ${name} -> Principal: ${principal}, Quota: ${quota} * ${totalCuotas} = ${totalAmount}. Calc %: ${computedPercent}%, Given %: ${givenPercent}%`);
  }
}
console.log("Chequeo de numeros completado.");
