import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Corrigiendo cuotas con paid_amount > scheduled_amount ===");

  const updatedCount = await prisma.$executeRaw`
    UPDATE credit_installments
    SET paid_amount = scheduled_amount
    WHERE paid_amount > scheduled_amount;
  `;

  console.log(`Filas actualizadas: ${updatedCount}`);

  // Verificar que ya no queden cuotas inconsistentes
  const remainingBad = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM credit_installments WHERE paid_amount > scheduled_amount;
  `;
  console.log(`Cuotas restantes con paid_amount > scheduled_amount: ${remainingBad[0].count}`);

  // Verificar Crédito #166 (Norma)
  const credit166 = await prisma.credit.findFirst({
    where: { creditNumber: 166 },
    include: { installments: { orderBy: { installmentNumber: "asc" } } },
  });
  if (credit166) {
    const paidSum = credit166.installments.reduce((s, i) => s + Number(i.paidAmount), 0);
    const paidCount = credit166.installments.filter((i) => i.status === "paid").length;
    const saldo = Number(credit166.totalAmount) - paidSum;
    console.log("\n--- Crédito #166 (Norma del Socorro Medina Matos) ---");
    console.log(`Total crédito: $${credit166.totalAmount}`);
    console.log(`Cuotas pagadas: ${paidCount} de ${credit166.installmentCount}`);
    console.log(`Total abonado ordinario: $${paidSum}`);
    console.log(`Saldo de la deuda: $${saldo}`);
  }

  // Verificar Crédito #172 (Edgar)
  const credit172 = await prisma.credit.findFirst({
    where: { creditNumber: 172 },
    include: { installments: { orderBy: { installmentNumber: "asc" } } },
  });
  if (credit172) {
    const paidSum = credit172.installments.reduce((s, i) => s + Number(i.paidAmount), 0);
    const paidCount = credit172.installments.filter((i) => i.status === "paid").length;
    const saldo = Number(credit172.totalAmount) - paidSum;
    console.log("\n--- Crédito #172 (Edgar Massa Burgos) ---");
    console.log(`Total crédito: $${credit172.totalAmount}`);
    console.log(`Cuotas pagadas: ${paidCount} de ${credit172.installmentCount}`);
    console.log(`Total abonado ordinario: $${paidSum}`);
    console.log(`Saldo de la deuda: $${saldo}`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
