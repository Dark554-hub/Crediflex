import { prisma } from "@/lib/prisma";

export async function getSettingsData() {
  let creditSettings = await prisma.creditSetting.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!creditSettings) {
    creditSettings = await prisma.creditSetting.create({
      data: {},
    });
  }

  let profile = await prisma.profile.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        fullName: "Operador principal",
      },
    });
  }

  const zones = await prisma.zone.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return { creditSettings, profile, zones };
}
