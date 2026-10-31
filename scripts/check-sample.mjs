import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.findMany({
    where: {
      fullName: {
        in: [
          "NORMA DEL SOCORRO MEDINA MATOS",
          "NELSY DEL ROSARIO LUGO SABIDO",
          "ROGER AMBROSIO ESPADAS SOSA",
          "PAULA MARISELA DUARTE CASTILLO"
        ]
      }
    },
    include: {
      credits: {
        include: {
          installments: {
            orderBy: { installmentNumber: "asc" }
          }
        }
      }
    }
  });

  const todayStr = "2026-10-31";

  for (const c of clients) {
    console.log("==================================================");
    console.log(`CLIENTE: [${c.clientNumber}] ${c.fullName} (Tel: ${c.phone}, Dir: ${c.address})`);
    for (const cr of c.credits) {
      console.log(`\n  CRÉDITO #${cr.creditNumber} | Monto: $${cr.principalAmount} | Tipo: ${cr.type} | Día de cobro: ${cr.weeklyCollectionDay ?? "Diario"} | Inicio: ${cr.startDate.toISOString().slice(0, 10)}`);
      let paid = 0;
      let pastDue = 0;
      for (const inst of cr.installments) {
        const d = inst.dueDate.toISOString().slice(0, 10);
        if (inst.status === "paid") paid++;
        if (d < todayStr) pastDue++;
        console.log(`    Cuota #${String(inst.installmentNumber).padStart(2, "0")} | Vence: ${d} | Monto: $${inst.scheduledAmount} (Cap: $${inst.principalComponent}, Int: $${inst.interestComponent}) | Estado: ${inst.status.toUpperCase()}`);
      }
      const eff = pastDue === 0 ? 100 : Math.round((paid / pastDue) * 100);
      console.log(`  -> Efectividad acumulada a hoy (31-Oct): ${paid} pagadas de ${pastDue} vencidas = ${eff}%`);
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
