import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showAmortization() {
  const credits = await prisma.credit.findMany({
    where: {
      client: {
        fullName: {
          in: [
            'NORMA DEL SOCORRO MEDINA MATOS',
            'NELSY DEL ROSARIO LUGO SABIDO',
            'ROGER AMBROSIO ESPADAS SOSA',
            'PAULA MARISELA DUARTE CASTILLO'
          ]
        }
      }
    },
    include: {
      client: true,
      installments: {
        orderBy: { installmentNumber: 'asc' }
      }
    },
    orderBy: { creditNumber: 'asc' }
  });

  for (const c of credits) {
    console.log(`\n========================================================================================`);
    console.log(`CRÉDITO #${c.creditNumber} | Cliente: ${c.client.fullName} | ${c.type.toUpperCase()} | Monto: $${c.principalAmount} | Total: $${c.totalAmount}`);
    console.log(`Inicio: ${c.startDate.toISOString().slice(0,10)} | Cuota: $${c.installmentAmount} | Cuotas totales: ${c.installmentCount}`);
    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`Cuota | Fecha Venc. | Programado | Capital | Interés | Pagado | Estado`);
    console.log(`----------------------------------------------------------------------------------------`);
    for (const inst of c.installments) {
      console.log(
        `${String(inst.installmentNumber).padStart(5)} | ` +
        `${inst.dueDate.toISOString().slice(0,10)}  | ` +
        `$${String(Number(inst.scheduledAmount).toFixed(2)).padStart(8)} | ` +
        `$${String(Number(inst.principalComponent).toFixed(2)).padStart(7)} | ` +
        `$${String(Number(inst.interestComponent).toFixed(2)).padStart(7)} | ` +
        `$${String(Number(inst.paidAmount).toFixed(2)).padStart(6)} | ` +
        `${inst.status}`
      );
    }
  }
}

showAmortization().finally(() => prisma.$disconnect());
