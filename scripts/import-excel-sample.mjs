import { PrismaClient } from "@prisma/client";
import { buildAmortizationSchedule } from "../lib/credit-calculations.ts";

const prisma = new PrismaClient();

const SAMPLE_DATA = [
  {
    name: "NORMA DEL SOCORRO MEDINA MATOS",
    phone: "9881099470",
    address: "C.30 #315B 35 Y 37",
    zone: "Izamal",
    principal: 6000,
    quota: 300,
    freq: "daily",
    day: null,
    totalCount: 24,
    paidCount: 5,
    interestPercent: 20,
    startDate: "2026-10-26",
  },
  {
    name: "NELSY DEL ROSARIO LUGO SABIDO",
    phone: "9889573140",
    address: "C46 #307 33 Y 35",
    zone: "Izamal",
    principal: 5000,
    quota: 500,
    freq: "semanal",
    day: 6, // Sabado
    totalCount: 16,
    paidCount: 0,
    interestPercent: 60,
    startDate: "2026-10-31",
  },
  {
    name: "ROGER AMBROSIO ESPADAS SOSA",
    phone: "9995542741",
    address: "C.30 S/N 45 Y 47",
    zone: "Izamal",
    principal: 10000,
    quota: 1350,
    freq: "semanal",
    day: 5, // Viernes
    totalCount: 12,
    paidCount: 4,
    interestPercent: 62,
    startDate: "2026-10-09",
  },
  {
    name: "PAULA MARISELA DUARTE CASTILLO",
    phone: "9911002537",
    address: "C.28a s/n 11Y 9",
    zone: "Izamal",
    principal: 6000,
    quota: 600,
    freq: "semanal",
    day: 3, // Miercoles
    totalCount: 16,
    paidCount: 2,
    interestPercent: 60,
    startDate: "2026-10-07",
  },
  {
    name: "NELSY DEL ROSARIO LUGO SABIDO",
    phone: "9889573140",
    address: "C46 #307 33 Y 35",
    zone: "Izamal",
    principal: 5000,
    quota: 500,
    freq: "semanal",
    day: 6, // Sabado
    totalCount: 16,
    paidCount: 2, // Basado en el PDF: 2 pagadas (10 y 17 Oct), 24 Oct vencida, 31 Oct para hoy -> 67% efectividad
    interestPercent: 60,
    startDate: "2026-10-10",
  },
];

function parseDateUtc(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

async function main() {
  console.log("🚀 Iniciando importación de la muestra de Excel...");

  // 1. Obtener o crear Zona
  let zone = await prisma.zone.findFirst({
    where: { name: { equals: "Izamal", mode: "insensitive" } },
  });
  if (!zone) {
    zone = await prisma.zone.create({
      data: { name: "Izamal", description: "Municipio de Izamal, Yucatán" },
    });
  }
  console.log(`📍 Zona: ${zone.name} (${zone.id})`);

  // Agrupar créditos por cliente
  const clientsMap = new Map();
  for (const row of SAMPLE_DATA) {
    const key = row.name.trim().toUpperCase();
    if (!clientsMap.has(key)) {
      clientsMap.set(key, {
        name: key,
        phone: row.phone,
        address: row.address,
        zoneId: zone.id,
        credits: [],
      });
    }
    clientsMap.get(key).credits.push(row);
  }

  for (const [clientName, data] of clientsMap.entries()) {
    console.log(`\n👤 Procesando cliente: ${clientName}`);

    // Buscar si ya existe el cliente en la base
    let client = await prisma.client.findFirst({
      where: { fullName: { equals: clientName, mode: "insensitive" } },
      include: { credits: true },
    });

    if (client) {
      // Actualizar teléfono y dirección reales
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          phone: data.phone,
          address: data.address,
          zoneId: data.zoneId,
          status: "active",
        },
        include: { credits: true },
      });
      console.log(`   ✓ Datos del cliente actualizados (Tel: ${data.phone}, Dir: ${data.address})`);

      // Eliminar créditos temporales anteriores para reemplazarlos con los exactos del Excel
      if (client.credits.length > 0) {
        console.log(`   Limpiando ${client.credits.length} créditos anteriores del cliente...`);
        for (const cr of client.credits) {
          await prisma.paymentAllocation.deleteMany({ where: { installment: { creditId: cr.id } } });
          await prisma.payment.deleteMany({ where: { creditId: cr.id } });
          await prisma.collectionItem.deleteMany({ where: { creditId: cr.id } });
          await prisma.creditInstallment.deleteMany({ where: { creditId: cr.id } });
          await prisma.credit.delete({ where: { id: cr.id } });
        }
      }
    } else {
      // Crear nuevo cliente
      const count = await prisma.client.count();
      const clientNumber = `IZM-${String(count + 1).padStart(3, "0")}`;
      client = await prisma.client.create({
        data: {
          clientNumber,
          fullName: clientName,
          phone: data.phone,
          address: data.address,
          zoneId: data.zoneId,
          status: "active",
        },
      });
      console.log(`   + Nuevo cliente creado: [${clientNumber}] ${clientName}`);
    }

    // 2. Crear los créditos del cliente
    for (let idx = 0; idx < data.credits.length; idx++) {
      const cr = data.credits[idx];
      const startDate = parseDateUtc(cr.startDate);
      const creditType = cr.freq === "daily" ? "daily" : cr.freq === "biweekly" ? "biweekly" : "weekly";
      const interestRate = cr.interestPercent / 100;
      const principal = cr.principal;
      const interestAmount = Math.round(principal * interestRate);
      const totalAmount = principal + interestAmount;
      const count = cr.totalCount;
      const quota = cr.quota;

      function calcDueDate(start, freq, index) {
        const d = new Date(start);
        if (freq === "daily") {
          d.setUTCDate(d.getUTCDate() + index);
        } else if (freq === "biweekly") {
          d.setUTCDate(d.getUTCDate() + (index * 14));
        } else {
          d.setUTCDate(d.getUTCDate() + (index * 7));
        }
        return d;
      }

      const expectedEndDate = calcDueDate(startDate, creditType, count - 1);

      const credit = await prisma.credit.create({
        data: {
          clientId: client.id,
          zoneId: zone.id,
          productType: "standard",
          type: creditType,
          principalAmount: principal,
          interestRate,
          interestAmount,
          totalAmount,
          installmentCount: count,
          installmentAmount: quota,
          weeklyCollectionDay: cr.day,
          startDate,
          expectedEndDate,
          status: "active",
        },
      });

      console.log(`   💳 Crédito #${credit.creditNumber}: $${principal} (${creditType}, ${count} pagos de $${quota}, ${cr.paidCount} pagados)`);

      // 3. Crear cuotas (la cuota #1 vence en startDate)
      const principalCents = Math.floor((principal * 100) / count);
      const principalRemainder = Math.round(principal * 100) % count;

      const installmentRecords = [];
      const todayOnly = new Date();
      todayOnly.setUTCHours(0, 0, 0, 0);

      for (let i = 1; i <= count; i++) {
        const isPaid = i <= cr.paidCount;
        const pCents = principalCents + (i > count - principalRemainder ? 1 : 0);
        const pComponent = pCents / 100;
        const iComponent = Math.round((quota - pComponent) * 100) / 100;
        const dueDate = calcDueDate(startDate, creditType, i - 1);

        installmentRecords.push({
          creditId: credit.id,
          installmentNumber: i,
          dueDate,
          scheduledAmount: quota,
          principalComponent: pComponent,
          interestComponent: iComponent,
          paidAmount: isPaid ? quota : 0,
          status: isPaid ? "paid" : dueDate < todayOnly ? "overdue" : "pending",
          paidAt: isPaid ? dueDate : null,
        });
      }

      await prisma.creditInstallment.createMany({
        data: installmentRecords,
      });

      // 4. Si hay cuotas pagadas, registrar los pagos para que coincidan las finanzas e historial
      if (cr.paidCount > 0) {
        const createdInstallments = await prisma.creditInstallment.findMany({
          where: { creditId: credit.id, status: "paid" },
          orderBy: { installmentNumber: "asc" },
        });

        for (const inst of createdInstallments) {
          const p = await prisma.payment.create({
            data: {
              clientId: client.id,
              creditId: credit.id,
              paymentDate: inst.dueDate,
              amount: quota,
              method: "cash",
              notes: `Pago de cuota #${inst.installmentNumber} importado de Excel`,
              allocations: {
                create: [
                  {
                    installmentId: inst.id,
                    amountApplied: quota,
                    lateFeeApplied: 0,
                  },
                ],
              },
            },
          });
        }
        console.log(`      ✓ Registrados ${cr.paidCount} pagos de $${quota} en el historial`);
      }
    }
  }

  // 5. Limpiar items viejos de cobranza para que la jornada se actualice limpia
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayDay = await prisma.collectionDay.findFirst({
    where: { collectionDate: today },
  });
  if (todayDay) {
    await prisma.collectionItem.deleteMany({
      where: { collectionDayId: todayDay.id },
    });
    console.log("🔄 Jornada del día reiniciada para sincronizar las nuevas cuotas");
  }

  console.log("\n🎉 ¡Importación de los datos completada con éxito al 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Error en la importación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
