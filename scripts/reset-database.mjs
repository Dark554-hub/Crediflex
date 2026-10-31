import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDb() {
  console.log("Iniciando vaciado de base de datos...");

  // Eliminamos en orden respetando las claves foráneas
  const allocationsDeleted = await prisma.paymentAllocation.deleteMany();
  console.log(`- PaymentAllocations eliminados: ${allocationsDeleted.count}`);

  const paymentsDeleted = await prisma.payment.deleteMany();
  console.log(`- Payments eliminados: ${paymentsDeleted.count}`);

  const collectionItemsDeleted = await prisma.collectionItem.deleteMany();
  console.log(`- CollectionItems eliminados: ${collectionItemsDeleted.count}`);

  const collectionDaysDeleted = await prisma.collectionDay.deleteMany();
  console.log(`- CollectionDays eliminados: ${collectionDaysDeleted.count}`);

  const agreementsDeleted = await prisma.delinquencyAgreement.deleteMany();
  console.log(`- DelinquencyAgreements eliminados: ${agreementsDeleted.count}`);

  const installmentsDeleted = await prisma.creditInstallment.deleteMany();
  console.log(`- CreditInstallments eliminados: ${installmentsDeleted.count}`);

  // Para evitar restricción autoreferencial de renewals en credits
  await prisma.credit.updateMany({
    data: {
      renewedFromCreditId: null,
    },
  });

  const creditsDeleted = await prisma.credit.deleteMany();
  console.log(`- Credits eliminados: ${creditsDeleted.count}`);

  const clientsDeleted = await prisma.client.deleteMany();
  console.log(`- Clients eliminados: ${clientsDeleted.count}`);

  const expensesDeleted = await prisma.expense.deleteMany();
  console.log(`- Expenses eliminados: ${expensesDeleted.count}`);

  const financeEntriesDeleted = await prisma.dailyFinanceEntry.deleteMany();
  console.log(`- DailyFinanceEntries eliminados: ${financeEntriesDeleted.count}`);

  const exportJobsDeleted = await prisma.exportJob.deleteMany();
  console.log(`- ExportJobs eliminados: ${exportJobsDeleted.count}`);

  const auditLogsDeleted = await prisma.auditLog.deleteMany();
  console.log(`- AuditLogs eliminados: ${auditLogsDeleted.count}`);

  // Reiniciar la secuencia de credit_number si existe
  try {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS credit_number_seq RESTART WITH 1;`);
    console.log("- Secuencia credit_number_seq reiniciada a 1");
  } catch (err) {
    console.log("- Nota: secuencia credit_number_seq:", err.message);
  }

  // Verificamos estado final
  const clients = await prisma.client.count();
  const credits = await prisma.credit.count();
  const zones = await prisma.zone.count();
  const profiles = await prisma.profile.count();

  console.log("\nBase de datos limpia:");
  console.log(`- Clientes: ${clients}`);
  console.log(`- Creditos: ${credits}`);
  console.log(`- Zonas conservadas: ${zones}`);
  console.log(`- Perfiles conservados: ${profiles}`);
}

resetDb()
  .catch((err) => {
    console.error("Error al vaciar base de datos:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
