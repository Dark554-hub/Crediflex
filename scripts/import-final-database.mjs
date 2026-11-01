import fs from "fs";
import { PrismaClient } from "@prisma/client";
import {
  cleanClientName,
  cleanAddress,
  cleanZone,
  parseCustomDate,
  calcDueDate,
} from "./import-helpers.mjs";

const prisma = new PrismaClient();

const DAY_MAP = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sabados: 6,
};

async function main() {
  console.log("🚀 Iniciando migración limpia de la base de datos final...");

  // 1. Leer y estructurar el CSV final
  const content = fs.readFileSync("scripts/final-raw-data.csv", "utf-8");
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const rawRows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.replace(/,/g, "").replace(/"/g, "").trim()) continue;

    const match = line.match(
      /^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/
    );
    if (!match) continue;

    const [
      _,
      name,
      phone,
      address,
      zone,
      principal,
      quota,
      freq,
      dayCobro,
      totalCuotas,
      cuotasPagadas,
      interes,
      fechaInicio,
    ] = match;

    if (!name.trim() && !principal.trim()) continue;

    rawRows.push({
      line: i,
      rawName: name.trim(),
      cleanName: cleanClientName(name.trim()),
      phone: phone.trim(),
      address: cleanAddress(address.trim()),
      zoneName: cleanZone(zone.trim()),
      principal: principal.trim() ? parseFloat(principal.trim()) : null,
      quota: quota.trim() ? parseFloat(quota.trim()) : null,
      freq: freq.trim().toLowerCase(),
      dayCobro: dayCobro.trim().toLowerCase(),
      totalCuotas: totalCuotas.trim() ? parseInt(totalCuotas.trim(), 10) : null,
      cuotasPagadas: cuotasPagadas.trim() ? parseInt(cuotasPagadas.trim(), 10) : 0,
      interes: interes.trim() ? parseFloat(interes.trim()) : null,
      fechaInicio: fechaInicio.trim(),
    });
  }

  console.log(`📄 Filas procesadas del CSV: ${rawRows.length}`);

  // 2. Agrupar clientes unicos
  const clientsMap = new Map();

  for (const row of rawRows) {
    const normKey = row.rawName.toLowerCase().replace(/\s+/g, " ").trim();
    if (!clientsMap.has(normKey)) {
      clientsMap.set(normKey, {
        cleanName: row.cleanName,
        phone: row.phone,
        address: row.address,
        zoneName: row.zoneName,
        credits: [],
      });
    }

    const clientObj = clientsMap.get(normKey);
    // Si la fila actual tiene mejor telefono o direccion, enriquecer el cliente
    if (!clientObj.phone && row.phone) clientObj.phone = row.phone;
    if (!clientObj.address && row.address) clientObj.address = row.address;

    if (row.principal !== null) {
      clientObj.credits.push(row);
    }
  }

  console.log(`👥 Clientes únicos consolidados: ${clientsMap.size}`);

  // 3. LIMPIAR COMPLETAMENTE LA BASE DE DATOS
  console.log("🧹 Vaciando datos anteriores de la base de datos...");
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.collectionItem.deleteMany();
  await prisma.collectionDay.deleteMany();
  await prisma.creditInstallment.deleteMany();
  await prisma.delinquencyAgreement.deleteMany();
  await prisma.credit.deleteMany();
  await prisma.client.deleteMany();
  console.log("   ✓ Tablas operativas limpiadas exitosamente");

  // 4. Asegurar Zonas existentes
  const zonesToEnsure = ["Izamal", "Sitilpech", "Motul"];
  const zoneRecords = new Map();
  for (const zName of zonesToEnsure) {
    let z = await prisma.zone.findFirst({
      where: { name: { equals: zName, mode: "insensitive" } },
    });
    if (!z) {
      z = await prisma.zone.create({
        data: { name: zName, description: `Zona ${zName}` },
      });
    }
    zoneRecords.set(zName.toLowerCase(), z);
  }

  // 5. Crear Clientes y sus Créditos
  let clientCounter = 0;
  const todayOnly = new Date(Date.UTC(2026, 9, 31, 0, 0, 0));

  for (const [normKey, cData] of clientsMap.entries()) {
    clientCounter++;
    const zoneKey = cData.zoneName.toLowerCase();
    const zone = zoneRecords.get(zoneKey) || zoneRecords.get("izamal");

    const prefix = zone.name.slice(0, 3).toUpperCase();
    const clientNumber = `${prefix}-${String(clientCounter).padStart(3, "0")}`;

    const client = await prisma.client.create({
      data: {
        clientNumber,
        fullName: cData.cleanName,
        phone: cData.phone || null,
        address: cData.address || "Domicilio conocido",
        zoneId: zone.id,
        status: "active",
      },
    });

    console.log(
      `\n👤 [${client.clientNumber}] ${client.fullName} (${cData.credits.length} créditos)`
    );

    // Si no tiene créditos, queda como cliente registrado sin crédito
    if (cData.credits.length === 0) {
      console.log(`   ℹ️ Cliente registrado en cartera (sin crédito activo)`);
      continue;
    }

    // Procesar cada crédito del cliente
    for (const cr of cData.credits) {
      let startDate = parseCustomDate(cr.fechaInicio);

      // Corrección de fechas erróneas en el Excel contra el día de cobro real pactado:
      if (normKey.includes("beatriz") && cr.quota === 525) {
        // En Excel decía 6-Sep (domingo), pero su día es sábado -> 5-Sep-2026
        startDate = new Date(Date.UTC(2026, 8, 5, 0, 0, 0));
      } else if (normKey.includes("manuela") && cr.quota === 1000) {
        // En Excel decía 27-Jul (lunes), pero su día es miércoles -> 29-Jul-2026
        startDate = new Date(Date.UTC(2026, 6, 29, 0, 0, 0));
      } else if (normKey.includes("manuela") && cr.quota === 720) {
        // En Excel decía 13-Sep (domingo), pero su día es miércoles -> 16-Sep-2026
        startDate = new Date(Date.UTC(2026, 8, 16, 0, 0, 0));
      }

      const creditType =
        cr.freq.includes("diario")
          ? "daily"
          : cr.freq.includes("quincenal")
          ? "biweekly"
          : "weekly";

      const principal = cr.principal;
      const count = cr.totalCuotas;
      const quota = cr.quota;
      const totalAmount = quota * count;
      const interestAmount = Math.max(totalAmount - principal, 0);
      const interestRate = principal > 0 ? interestAmount / principal : 0;

      const weeklyCobroDay = cr.dayCobro ? DAY_MAP[cr.dayCobro] ?? null : null;
      const expectedEndDate = calcDueDate(startDate, creditType, count - 1);
      const isSettled = cr.cuotasPagadas >= count;

      // Calcular cuotas que debieron pagarse antes de hoy para definir morosidad
      let pastDueBeforeToday = 0;
      for (let i = 1; i <= count; i++) {
        const dDate = calcDueDate(startDate, creditType, i - 1);
        if (dDate < todayOnly) {
          pastDueBeforeToday++;
        }
      }
      const isDelinquent = !isSettled && cr.cuotasPagadas < pastDueBeforeToday;

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
          weeklyCollectionDay: weeklyCobroDay,
          startDate,
          expectedEndDate,
          status: isSettled ? "settled" : isDelinquent ? "delinquent" : "active",
        },
      });

      if (isDelinquent) {
        await prisma.client.update({
          where: { id: client.id },
          data: { status: "delinquent" },
        });
      }

      console.log(
        `   💳 Crédito #${credit.creditNumber}: $${principal} (${creditType}, ${count} de $${quota}, ${cr.cuotasPagadas} pagadas, estado: ${credit.status})`
      );

      // Desglose de cuotas con componentes exactos
      const principalCents = Math.floor((principal * 100) / count);
      const principalRemainder = Math.round(principal * 100) % count;

      const installmentRecords = [];
      for (let i = 1; i <= count; i++) {
        const isPaid = i <= cr.cuotasPagadas;
        const pCents = principalCents + (i > count - principalRemainder ? 1 : 0);
        const pComponent = pCents / 100;
        const iComponent = Math.round((quota - pComponent) * 100) / 100;
        const dueDate = calcDueDate(startDate, creditType, i - 1);

        const isOverdue = !isPaid && dueDate < todayOnly;

        installmentRecords.push({
          creditId: credit.id,
          installmentNumber: i,
          dueDate,
          scheduledAmount: quota,
          principalComponent: pComponent,
          interestComponent: iComponent,
          paidAmount: isPaid ? quota : 0,
          status: isPaid ? "paid" : isOverdue ? "overdue" : "pending",
          paidAt: isPaid ? dueDate : null,
        });
      }

      await prisma.creditInstallment.createMany({
        data: installmentRecords,
      });

      // Registrar los pagos en el historial financiero
      if (cr.cuotasPagadas > 0) {
        const createdInstallments = await prisma.creditInstallment.findMany({
          where: { creditId: credit.id, status: "paid" },
          orderBy: { installmentNumber: "asc" },
        });

        for (const inst of createdInstallments) {
          await prisma.payment.create({
            data: {
              clientId: client.id,
              creditId: credit.id,
              paymentDate: inst.dueDate,
              amount: quota,
              method: "cash",
              notes: `Pago de cuota #${inst.installmentNumber} registrado en Excel`,
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
      }
    }
  }

  console.log("\n========================================================");
  console.log("🎉 ¡MIGRACIÓN COMPLETA FINALIZADA EXITOSAMENTE!");
  console.log(`Total Clientes: ${await prisma.client.count()}`);
  console.log(`Total Créditos: ${await prisma.credit.count()}`);
  console.log(`Total Cuotas: ${await prisma.creditInstallment.count()}`);
  console.log(`Total Pagos registrados: ${await prisma.payment.count()}`);
  console.log("========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Error en la importación final:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
