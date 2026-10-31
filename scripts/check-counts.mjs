import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const clients = await prisma.client.count();
  const credits = await prisma.credit.count();
  const payments = await prisma.payment.count();
  const installments = await prisma.creditInstallment.count();
  const collectionDays = await prisma.collectionDay.count();
  const collectionItems = await prisma.collectionItem.count();
  const expenses = await prisma.expense.count();
  const financeEntries = await prisma.dailyFinanceEntry.count();
  const zones = await prisma.zone.count();

  console.log(JSON.stringify({
    clients,
    credits,
    payments,
    installments,
    collectionDays,
    collectionItems,
    expenses,
    financeEntries,
    zones,
  }, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
