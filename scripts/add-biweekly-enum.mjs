import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe(`ALTER TYPE credit_type ADD VALUE IF NOT EXISTS 'biweekly';`);
  console.log("Enum credit_type updated successfully with 'biweekly'");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
