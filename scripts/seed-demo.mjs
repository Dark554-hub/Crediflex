import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const zones = [
  { name: "Motul", description: "Ruta de cobranza en Motul, Yucatan" },
  { name: "Izamal", description: "Ruta de cobranza en Izamal, Yucatan" },
];

const clients = [
  {
    clientNumber: "MVP-001",
    fullName: "Mariana Guadalupe Pech Cen",
    identification: "INE-MER-MPC-001",
    phone: "991 112 4580",
    homePhone: "991 915 2244",
    email: "mariana.pech@example.com",
    address: "Calle 28 x 31 y 33, Centro, Motul",
    personalReferenceName: "Jose Luis Pech May",
    personalReferencePhone: "991 104 7721",
    personalReferenceAddress: "Calle 30, Motul",
    zone: "Motul",
    notes: "Venta de antojitos por la tarde.",
    credits: [
      {
        type: "weekly",
        principalAmount: 3500,
        interestRate: 0.18,
        installmentCount: 6,
        startDate: dateUtc("2026-03-13"),
        weeklyCollectionDay: 5,
        paidInstallments: 6,
        latePaidInstallments: 0,
        lateFeeAmount: 80,
        lateFeeRate: 0,
        lateFeeGraceDays: 1,
      },
      {
        type: "daily",
        principalAmount: 2500,
        interestRate: 0.2,
        installmentCount: 10,
        startDate: dateUtc("2026-04-28"),
        weeklyCollectionDay: null,
        paidInstallments: 8,
        latePaidInstallments: 2,
        lateFeeAmount: 70,
        lateFeeRate: 0,
        lateFeeGraceDays: 1,
      },
      {
        type: "weekly",
        principalAmount: 5000,
        interestRate: 0.2,
        installmentCount: 8,
        startDate: dateUtc("2026-05-01"),
        weeklyCollectionDay: 5,
        paidInstallments: 4,
        latePaidInstallments: 1,
        lateFeeAmount: 100,
        lateFeeRate: 0,
        lateFeeGraceDays: 1,
      },
    ],
  },
  {
    clientNumber: "MVP-002",
    fullName: "Carlos Alberto Canul Uc",
    identification: "INE-MOT-CCU-002",
    phone: "991 223 0194",
    homePhone: "991 917 3308",
    email: "",
    address: "Calle 21 s/n x 18 y 20, Motul",
    personalReferenceName: "Rosa Maria Uc Balam",
    personalReferencePhone: "991 141 2099",
    personalReferenceAddress: "Colonia San Roque, Motul",
    zone: "Motul",
    notes: "Tienda pequena de abarrotes.",
    credit: {
      type: "daily",
      principalAmount: 3000,
      interestRate: 0.15,
      installmentCount: 15,
      startDate: dateUtc("2026-05-20"),
      weeklyCollectionDay: null,
      paidInstallments: 9,
      latePaidInstallments: 2,
      lateFeeAmount: 80,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-003",
    fullName: "Leticia del Socorro Moo Tun",
    identification: "INE-IZA-LMT-003",
    phone: "988 118 9032",
    homePhone: "988 954 2210",
    email: "leticia.moo@example.com",
    address: "Calle 33 x 30 y 32, Izamal",
    personalReferenceName: "Manuel Moo Tun",
    personalReferencePhone: "988 132 4419",
    personalReferenceAddress: "Barrio de San Antonio, Izamal",
    zone: "Izamal",
    notes: "Venta de ropa por catalogo.",
    credit: {
      type: "weekly",
      principalAmount: 8000,
      interestRate: 0.18,
      installmentCount: 10,
      startDate: dateUtc("2026-04-24"),
      weeklyCollectionDay: 5,
      paidInstallments: 5,
      latePaidInstallments: 0,
      lateFeeAmount: 120,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-004",
    fullName: "Ruben Antonio Cocom Pat",
    identification: "INE-IZA-RCP-004",
    phone: "988 221 7860",
    homePhone: "",
    email: "",
    address: "Calle 26 x 35, Colonia San Marcos, Izamal",
    personalReferenceName: "Ana Patricia Pat Chi",
    personalReferencePhone: "988 145 6720",
    personalReferenceAddress: "Calle 24, Izamal",
    zone: "Izamal",
    notes: "Mototaxi y reparaciones menores.",
    credit: {
      type: "daily",
      principalAmount: 4500,
      interestRate: 0.2,
      installmentCount: 18,
      startDate: dateUtc("2026-05-10"),
      weeklyCollectionDay: null,
      paidInstallments: 12,
      latePaidInstallments: 4,
      lateFeeAmount: 100,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-005",
    fullName: "Nayeli Itzel Dzib Poot",
    identification: "INE-MOT-NDP-005",
    phone: "991 309 5541",
    homePhone: "991 911 7088",
    email: "",
    address: "Calle 19 x 24 y 26, Motul",
    personalReferenceName: "Santiago Dzib Poot",
    personalReferencePhone: "991 202 4418",
    personalReferenceAddress: "Calle 17, Motul",
    zone: "Motul",
    notes: "Estetica en casa.",
    credit: {
      type: "weekly",
      principalAmount: 3000,
      interestRate: 0.2,
      installmentCount: 6,
      startDate: dateUtc("2026-05-08"),
      weeklyCollectionDay: 5,
      paidInstallments: 6,
      latePaidInstallments: 1,
      lateFeeAmount: 80,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-006",
    fullName: "Domingo de Jesus Balam Ku",
    identification: "INE-IZA-DBK-006",
    phone: "988 305 7012",
    homePhone: "",
    email: "domingo.balam@example.com",
    address: "Calle 40 x 31, Izamal",
    personalReferenceName: "Cecilia Ku Puc",
    personalReferencePhone: "988 165 9033",
    personalReferenceAddress: "Calle 42, Izamal",
    zone: "Izamal",
    notes: "Compra y venta de frutas.",
    credit: {
      type: "daily",
      principalAmount: 6000,
      interestRate: 0.15,
      installmentCount: 12,
      startDate: dateUtc("2026-05-25"),
      weeklyCollectionDay: null,
      paidInstallments: 3,
      latePaidInstallments: 0,
      lateFeeAmount: 100,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-007",
    fullName: "Adriana Isabel Chan Ek",
    identification: "INE-MOT-ACE-007",
    phone: "991 410 2350",
    homePhone: "991 913 1181",
    email: "",
    address: "Calle 31 x 20, Colonia Felipe Carrillo Puerto, Motul",
    personalReferenceName: "Miguel Angel Chan Ek",
    personalReferencePhone: "991 244 6710",
    personalReferenceAddress: "Calle 33, Motul",
    zone: "Motul",
    notes: "Cocina economica.",
    credit: {
      type: "weekly",
      principalAmount: 10000,
      interestRate: 0.16,
      installmentCount: 12,
      startDate: dateUtc("2026-05-15"),
      weeklyCollectionDay: 5,
      paidInstallments: 2,
      latePaidInstallments: 0,
      lateFeeAmount: 150,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-008",
    fullName: "Hector Manuel Xool Ceh",
    identification: "INE-IZA-HXC-008",
    phone: "988 411 8033",
    homePhone: "988 952 7011",
    email: "",
    address: "Calle 28 x 23, Izamal",
    personalReferenceName: "Lucia Ceh Chuc",
    personalReferencePhone: "988 177 4521",
    personalReferenceAddress: "Centro, Izamal",
    zone: "Izamal",
    notes: "Carpinteria y trabajos por encargo.",
    credit: {
      type: "daily",
      principalAmount: 2500,
      interestRate: 0.2,
      installmentCount: 10,
      startDate: dateUtc("2026-05-28"),
      weeklyCollectionDay: null,
      paidInstallments: 1,
      latePaidInstallments: 0,
      lateFeeAmount: 70,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-009",
    fullName: "Beatriz Elena May Puc",
    identification: "INE-MOT-BMP-009",
    phone: "991 518 3302",
    homePhone: "991 916 4401",
    email: "beatriz.may@example.com",
    address: "Calle 34 x 27 y 29, Motul",
    personalReferenceName: "Felipe May Puc",
    personalReferencePhone: "991 274 1180",
    personalReferenceAddress: "Fraccionamiento San Juan, Motul",
    zone: "Motul",
    notes: "Venta de postres por pedido.",
    credit: {
      type: "weekly",
      principalAmount: 6500,
      interestRate: 0.18,
      installmentCount: 10,
      startDate: dateUtc("2026-05-22"),
      weeklyCollectionDay: 5,
      paidInstallments: 1,
      latePaidInstallments: 0,
      lateFeeAmount: 120,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
  {
    clientNumber: "MVP-010",
    fullName: "Jorge Luis Poot Chuc",
    identification: "INE-IZA-JPC-010",
    phone: "988 520 9407",
    homePhone: "",
    email: "",
    address: "Calle 31 x 36 y 38, Izamal",
    personalReferenceName: "Teresa Chuc Cime",
    personalReferencePhone: "988 201 4578",
    personalReferenceAddress: "Barrio de San Idelfonso, Izamal",
    zone: "Izamal",
    notes: "Herreria y soldadura.",
    credit: {
      type: "daily",
      principalAmount: 7000,
      interestRate: 0.17,
      installmentCount: 14,
      startDate: dateUtc("2026-05-18"),
      weeklyCollectionDay: null,
      paidInstallments: 6,
      latePaidInstallments: 1,
      lateFeeAmount: 120,
      lateFeeRate: 0,
      lateFeeGraceDays: 1,
    },
  },
];

function dateUtc(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getWeeklyDueDate(startDate, weeklyCollectionDay, installmentNumber) {
  const startDay = startDate.getUTCDay();
  let daysUntilCollection = (weeklyCollectionDay - startDay + 7) % 7;

  if (daysUntilCollection === 0) {
    daysUntilCollection = 7;
  }

  return addDays(startDate, daysUntilCollection + (installmentNumber - 1) * 7);
}

function money(amount) {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function buildSchedule(credit) {
  const principalCents = Math.round(credit.principalAmount * 100);

  // Interes fijo simple:
  // interest_amount = principal_amount * interest_rate.
  // Ejemplo: $5,000 con tasa 20% genera $1,000 de interes total del plazo.
  const interestCents = Math.round(credit.principalAmount * credit.interestRate * 100);

  // Total a pagar:
  // total_amount = principal_amount + interest_amount.
  const totalCents = principalCents + interestCents;

  // La amortizacion se reparte en centavos para que la suma de cuotas cierre exacta.
  const basePrincipalCents = Math.floor(principalCents / credit.installmentCount);
  const principalRemainder = principalCents % credit.installmentCount;
  const baseInterestCents = Math.floor(interestCents / credit.installmentCount);
  const interestRemainder = interestCents % credit.installmentCount;

  const installments = Array.from({ length: credit.installmentCount }, (_, index) => {
    const installmentNumber = index + 1;
    const dueDate =
      credit.type === "daily"
        ? addDays(credit.startDate, installmentNumber)
        : getWeeklyDueDate(credit.startDate, credit.weeklyCollectionDay, installmentNumber);
    const principalComponentCents =
      basePrincipalCents + (index >= credit.installmentCount - principalRemainder ? 1 : 0);
    const interestComponentCents =
      baseInterestCents + (index >= credit.installmentCount - interestRemainder ? 1 : 0);
    const scheduledCents = principalComponentCents + interestComponentCents;

    return {
      installmentNumber,
      dueDate,
      scheduledAmount: scheduledCents / 100,
      principalComponent: principalComponentCents / 100,
      interestComponent: interestComponentCents / 100,
    };
  });

  return {
    interestAmount: interestCents / 100,
    totalAmount: totalCents / 100,
    installmentAmount: totalCents / 100 / credit.installmentCount,
    expectedEndDate: installments.at(-1)?.dueDate ?? credit.startDate,
    installments,
  };
}

function statusForCredit(credit, schedule) {
  if (credit.paidInstallments >= credit.installmentCount) {
    return "settled";
  }

  const today = dateUtc("2026-06-03");
  const hasOverdue = schedule.installments.some(
    (installment, index) => index >= credit.paidInstallments && installment.dueDate < today,
  );

  return hasOverdue ? "delinquent" : "active";
}

async function upsertZones() {
  const result = {};

  for (const zone of zones) {
    const created = await prisma.zone.upsert({
      where: { name: zone.name },
      update: {
        description: zone.description,
        isActive: true,
      },
      create: {
        name: zone.name,
        description: zone.description,
        isActive: true,
      },
    });

    result[created.name] = created;
  }

  return result;
}

async function createPaymentsForCredit(client, credit, schedule, demoCredit) {
  const installments = await prisma.creditInstallment.findMany({
    where: { creditId: credit.id },
    orderBy: { installmentNumber: "asc" },
  });

  for (const installment of installments.slice(0, demoCredit.paidInstallments)) {
    const isLate = installment.installmentNumber <= demoCredit.latePaidInstallments;
    const paymentDate = isLate ? addDays(installment.dueDate, 2) : installment.dueDate;
    const amount = Number(installment.scheduledAmount);

    const payment = await prisma.payment.create({
      data: {
        clientId: client.id,
        creditId: credit.id,
        paymentDate,
        amount: money(amount),
        method: "cash",
        notes: isLate ? "Pago de ejemplo realizado fuera de fecha." : "Pago de ejemplo en tiempo.",
        receiptGenerated: true,
      },
    });

    await prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        installmentId: installment.id,
        amountApplied: money(amount),
        lateFeeApplied: "0.00",
      },
    });

    await prisma.creditInstallment.update({
      where: { id: installment.id },
      data: {
        paidAmount: money(amount),
        status: "paid",
        paidAt: paymentDate,
      },
    });
  }

  const today = dateUtc("2026-06-03");
  const unpaid = installments.slice(demoCredit.paidInstallments);

  for (const installment of unpaid) {
    const overdue = installment.dueDate < today;

    await prisma.creditInstallment.update({
      where: { id: installment.id },
      data: {
        status: overdue ? "overdue" : "pending",
      },
    });
  }
}

async function seed() {
  const zoneByName = await upsertZones();
  let createdClients = 0;
  let skippedClients = 0;
  let createdCredits = 0;

  for (const item of clients) {
    const zone = zoneByName[item.zone];
    const existing = await prisma.client.findUnique({
      where: { clientNumber: item.clientNumber },
      include: { credits: true },
    });

    const client =
      existing ??
      (await prisma.client.create({
        data: {
          fullName: item.fullName,
          identification: item.identification,
          clientNumber: item.clientNumber,
          phone: item.phone,
          homePhone: item.homePhone || null,
          email: item.email || null,
          address: item.address,
          personalReferenceName: item.personalReferenceName,
          personalReferencePhone: item.personalReferencePhone,
          personalReferenceAddress: item.personalReferenceAddress,
          zoneId: zone.id,
          status: "active",
          notes: item.notes,
        },
      }));

    if (existing) {
      skippedClients += 1;
    } else {
      createdClients += 1;
    }

    const demoCredits = item.credits ?? [item.credit];
    const existingCredits =
      existing?.credits ??
      (await prisma.credit.findMany({
        where: { clientId: client.id },
      }));
    let clientHasDelinquentCredit = false;
    let clientHasActiveCredit = false;
    let clientHasSettledCredit = false;

    for (const demoCredit of demoCredits) {
      const alreadyCreated = existingCredits.some(
        (credit) =>
          credit.type === demoCredit.type &&
          Number(credit.principalAmount) === demoCredit.principalAmount &&
          credit.installmentCount === demoCredit.installmentCount &&
          credit.startDate.toISOString().slice(0, 10) === demoCredit.startDate.toISOString().slice(0, 10),
      );

      if (alreadyCreated) {
        const existingMatch = existingCredits.find(
          (credit) =>
            credit.type === demoCredit.type &&
            Number(credit.principalAmount) === demoCredit.principalAmount &&
            credit.installmentCount === demoCredit.installmentCount &&
            credit.startDate.toISOString().slice(0, 10) === demoCredit.startDate.toISOString().slice(0, 10),
        );

        clientHasDelinquentCredit ||= existingMatch?.status === "delinquent";
        clientHasActiveCredit ||= existingMatch?.status === "active";
        clientHasSettledCredit ||= existingMatch?.status === "settled";
        continue;
      }

      const schedule = buildSchedule(demoCredit);
      const status = statusForCredit(demoCredit, schedule);

      const credit = await prisma.credit.create({
        data: {
          clientId: client.id,
          zoneId: zone.id,
          type: demoCredit.type,
          principalAmount: money(demoCredit.principalAmount),
          interestRate: demoCredit.interestRate.toFixed(4),
          interestAmount: money(schedule.interestAmount),
          totalAmount: money(schedule.totalAmount),
          installmentCount: demoCredit.installmentCount,
          installmentAmount: money(schedule.installmentAmount),
          lateFeeAmount: money(demoCredit.lateFeeAmount),
          lateFeeRate: demoCredit.lateFeeRate.toFixed(4),
          lateFeeGraceDays: demoCredit.lateFeeGraceDays,
          printReceiptDefault: true,
          weeklyCollectionDay: demoCredit.type === "weekly" ? demoCredit.weeklyCollectionDay : null,
          startDate: demoCredit.startDate,
          expectedEndDate: schedule.expectedEndDate,
          status,
          settledAt: status === "settled" ? addDays(schedule.expectedEndDate, 1) : null,
          installments: {
            create: schedule.installments.map((installment) => ({
              installmentNumber: installment.installmentNumber,
              dueDate: installment.dueDate,
              scheduledAmount: money(installment.scheduledAmount),
              principalComponent: money(installment.principalComponent),
              interestComponent: money(installment.interestComponent),
            })),
          },
        },
      });

      await createPaymentsForCredit(client, credit, schedule, demoCredit);
      createdCredits += 1;
      clientHasDelinquentCredit ||= status === "delinquent";
      clientHasActiveCredit ||= status === "active";
      clientHasSettledCredit ||= status === "settled";
    }

    const nextClientStatus = clientHasDelinquentCredit
      ? "delinquent"
      : clientHasActiveCredit
        ? "active"
        : clientHasSettledCredit
          ? "settled"
          : "active";

    await prisma.client.update({
      where: { id: client.id },
      data: { status: nextClientStatus },
    });
  }

  console.log(`Zonas listas: ${zones.map((zone) => zone.name).join(", ")}`);
  console.log(`Clientes creados: ${createdClients}`);
  console.log(`Clientes ya existentes omitidos: ${skippedClients}`);
  console.log(`Creditos creados: ${createdCredits}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
