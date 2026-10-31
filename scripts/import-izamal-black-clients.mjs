import { PrismaClient } from "@prisma/client";
import fs from "fs";

// Limit connection pool for script
const dbUrl = (process.env.DATABASE_URL || "").includes("connection_limit")
  ? process.env.DATABASE_URL
  : (process.env.DATABASE_URL || "") + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "connection_limit=2";

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

// Load known clients from seed-clients-map if available
let seedClientsMap = {};
try {
  seedClientsMap = JSON.parse(fs.readFileSync("scripts/seed-clients-map.json", "utf-8"));
} catch (e) {
  console.log("No seed-clients-map found, using defaults");
}

function parseDateUtc(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Map collector short codes to profiles
const COLLECTOR_NAMES = {
  CabFabian: "Fabian Cab",
  CabEmiliano: "Emiliano Cab",
  CabMajo: "Majo Valencia",
  CabRoman: "Roman Daniel Cab Estrella",
  CabMariceli: "Gidel Tamayo", // or Mariceli
  CabMaría: "Guadalupe Leal Cocom",
  CabCristo: "Roman Daniel Cab Estrella",
  CabJesús: "Roman Daniel Cab Estrella",
  CabSanJudas: "Gidel Tamayo",
  CabJenidi: "Jenidi Cab",
  CabDaniel: "Daniel Estrella",
  CabIzamal: "Roman Daniel Cab Estrella",
  DanielEstrella: "Daniel Estrella",
  Danielcab1: "Daniel Estrella",
  RomanD: "Roman Daniel Cab Estrella",
  RomanEstrella: "Roman Daniel Cab Estrella",
  GidelTamayo: "Gidel Tamayo",
  GilmerT: "Gilmer T",
  MajoValencia: "Majo Valencia",
  Jenidicab: "Jenidi Cab",
  Emilianocab: "Emiliano Cab",
  CabEstrella: "Daniel Estrella",
};

/*
 LISTA DE CLIENTES DE IZAMAL CON NOMBRE EN NEGRO (PÁGINAS 7 A 11 DEL PDF)
 EXCLUIDOS ESTRICTAMENTE LOS QUE TIENEN NOMBRE EN ROJO O EN VERDE
*/
const IZAMAL_BLACK_CLIENTS = [
  // --- PÁGINA 7 (PAGO DIARIO IZAMAL) ---
  {
    name: "NORMA DEL SOCORRO MEDINA MATOS",
    code: "CabFabian",
    principal: 6000,
    payment: 300,
    type: "daily",
    count: 24,
    day: null,
  },
  {
    name: "EDGAR ALEJANDRO MASSA BURGOS",
    code: "CabEmiliano",
    principal: 6000,
    payment: 250,
    type: "daily",
    count: 24,
    day: null,
  },
  {
    name: "JOSE GASPAR ALPUCHE CABRERA",
    code: "CabMajo",
    principal: 8000,
    payment: 300,
    type: "daily",
    count: 30,
    day: null,
  },
  {
    name: "SELENE CAROLINA ORDOÑEZ MADERA",
    code: "CabIzamal",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "MARTHA JOCABETH ESPADAS VALENCIA",
    code: "Emilianocab",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  // PÁGINA 7 (SEMANALES - sólo los que están en negro con guión)
  {
    name: "MARISSA DEL SOCORRO EUAN MENA",
    code: "GidelTamayo",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "CARLOS ISMAEL KU CHAN",
    code: "RomanEstrella",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },

  // --- PÁGINA 8 ---
  {
    name: "MARIA GREGORIA LUGO SABIDO",
    code: "RomanEstrella",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "MIGUEL ANTONIO ROSALES CHAN",
    code: "Danielcab1",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "VICTORIA JAZMINE REJON POLANCO",
    code: "GilmerT",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "CELIA DE LA CRUZ EUAN ESTRELLA",
    code: "GilmerT",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "REBECA ADRIANA CANCHE CHI",
    code: "MajoValencia",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "DAVID EDUARDO LUGO CHI",
    code: "Jenidicab",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "JORGE ALBERTO POOL CANUL",
    code: "Emilianocab",
    principal: 22800,
    payment: 950,
    type: "weekly",
    count: 24,
    day: 6, // Sábado
  },
  {
    name: "JESÚS ANTONIO ROSALES QUIÑONES",
    code: "Emilianocab",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "SERGIO IX BORGES",
    code: "Emilianocab",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "GEORGINA SARAI LORIA MARTIN",
    code: "Emilianocab",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "PEDRO PABLO PECH POOL",
    code: "CabEstrella",
    principal: 0,
    payment: 0,
    type: null,
    count: 0,
    day: null,
  },
  {
    name: "ROBERTO MARTIN PECH DZIB",
    code: "DanielEstrella",
    principal: 7000,
    payment: 850,
    type: "weekly",
    count: 12,
    day: 0, // Domingo
  },

  // --- PÁGINA 9 ---
  {
    name: "JOSE ELIAS MAY MADERA",
    code: "DanielEstrella",
    principal: 6600,
    payment: 700,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "EDGAR EFREN MENA GARCIA",
    code: "CabRoman",
    principal: 2000,
    payment: 350,
    type: "weekly",
    count: 8,
    day: 3, // Miércoles
  },
  {
    name: "ANTONIO DE JESUS KOYOC CANCHE",
    code: "CabRoman",
    principal: 4000,
    payment: 400,
    type: "weekly",
    count: 16,
    day: 1, // Lunes
  },
  {
    name: "ALMA DELIA UITZ ARAUJO",
    code: "CabRoman",
    principal: 5000,
    payment: 600,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "LEONARDO DANIEL MEX HAU",
    code: "CabRoman",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 0, // Domingo
  },
  {
    name: "JAZMIN KARINA PARRA PACHECO",
    code: "CabRoman",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "LEYDI LETICIA CETZ CAUICH",
    code: "CabMariceli",
    principal: 6000,
    payment: 630,
    type: "weekly",
    count: 16,
    day: 5, // Viernes
  },
  {
    name: "NEYLA SELENE POOL ADRIAN",
    code: "CabMariceli",
    principal: 6000,
    payment: 725,
    type: "weekly",
    count: 12,
    day: 1, // Lunes (Sitilpech)
  },
  {
    name: "MARIA DE LOURDES RODRIGUEZ ALDANA",
    code: "CabMariceli",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 16,
    day: 2, // Martes
  },
  {
    name: "WENDY RUBY CANCHE CHI",
    code: "CabMariceli",
    principal: 4000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 2, // Martes
  },
  {
    name: "JULIO VELAZQUEZ CEN",
    code: "CabMariceli",
    principal: 5000,
    payment: 600,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "ELIAS DE LA CRUZ RAZ GAMBOA",
    code: "CabMariceli",
    principal: 5000,
    payment: 720,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "MANUELA DE JESUS PECH DZIB",
    code: "CabMaría",
    principal: 6000,
    payment: 720,
    type: "weekly",
    count: 12,
    day: 0, // Domingo
  },
  {
    name: "WESLEY OTONIEL CEN CHAB",
    code: "CabMaría",
    principal: 6000,
    payment: 750,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "MARIA ESTHER SABIDO PAT",
    code: "CabMaría",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 16,
    day: 6, // Sábado
  },
  {
    name: "ANTONIO DE JESUS KOYOC CANCHE",
    code: "CabMaría",
    principal: 10000,
    payment: 1000,
    type: "weekly",
    count: 12,
    day: 6, // Sábado (2do crédito)
  },
  {
    name: "MANUELA DE JESUS PECH DZIB",
    code: "CabMaría",
    principal: 10000,
    payment: 1000,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles (2do crédito)
  },
  {
    name: "ROGER SAMUEL COX MARTINEZ",
    code: "CabMaría",
    principal: 5000,
    payment: 630,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "ADA LUZ CANTO MIS",
    code: "CabMaría",
    principal: 30000,
    payment: 3200,
    type: "weekly",
    count: 16,
    day: 2, // Martes
  },
  {
    name: "ANTONIA CAROLINA DELGADO CRUZ",
    code: "FabianCab",
    principal: 10000,
    payment: 1050,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "FABIAN ALEJANDRO LUGO SABIDO",
    code: "FabianCab",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "ANA MARIA DE JESUS SALAS COCOM",
    code: "FabianCab",
    principal: 2000,
    payment: 250,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "REGINA NOEMI KUK MEX",
    code: "FabianCab",
    principal: 3000,
    payment: 370,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "ALMA DELIA UITZ ARAUJO",
    code: "FabianCab",
    principal: 7000,
    payment: 850,
    type: "weekly",
    count: 12,
    day: 0, // Domingo (2do crédito)
  },

  // --- PÁGINA 10 ---
  {
    name: "JULIAN ALEJANDRO CASTILLO BURGOS",
    code: "CabCristo",
    principal: 3500,
    payment: 450,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "WILLIAM JAVIER MORENO BAAS",
    code: "CabCristo",
    principal: 6000,
    payment: 760,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "FELIPA DE JESUS BALAM CASTILLO",
    code: "CabCristo",
    principal: 10000,
    payment: 1000,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "FABIAN LUGO QUIJANO",
    code: "CabCristo",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "BEATRIZ ADRIANA SABIDO PAT",
    code: "CabCristo",
    principal: 5000,
    payment: 525,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "DIANA LETICIA CHUC CETZ",
    code: "CabCristo",
    principal: 5000,
    payment: 530,
    type: "weekly",
    count: 16,
    day: 1, // Lunes
  },
  {
    name: "JORGE LUIS ISIDRO ORDOÑEZ THO",
    code: "CabCristo",
    principal: 5000,
    payment: 650,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "EDWIN ADIEL AKE CHALE",
    code: "CabJesús",
    principal: 5000,
    payment: 630,
    type: "weekly",
    count: 12,
    day: 4, // Jueves
  },
  {
    name: "DANIEL CONCEPCION PECH DZIB",
    code: "CabJesús",
    principal: 6000,
    payment: 725,
    type: "weekly",
    count: 12,
    day: 0, // Domingo
  },
  {
    name: "BEATRIZ ADRIANA SABIDO PAT",
    code: "CabJesús",
    principal: 10000,
    payment: 1050,
    type: "weekly",
    count: 16,
    day: 6, // Sábado (2do crédito)
  },
  {
    name: "LADISLAO EDDIE MAZA LOPEZ",
    code: "CabJesús",
    principal: 3000,
    payment: 360,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "ROGELIO KUK MEX",
    code: "CabSanJudas",
    principal: 2000,
    payment: 250,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "MARIA JAQUELINE CIAU CAUICH",
    code: "CabSanJudas",
    principal: 5000,
    payment: 630,
    type: "weekly",
    count: 12,
    day: 2, // Martes
  },
  {
    name: "EDGAR REYES CRUZ SANCHEZ",
    code: "CabSanJudas",
    principal: 10500,
    payment: 1100,
    type: "weekly",
    count: 12,
    day: 4, // Jueves
  },
  {
    name: "MIRNA GUADALUPE MEX BARCELO",
    code: "CabSanJudas",
    principal: 2000,
    payment: 350,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "MIGUEL ANGEL CHUC CETZ",
    code: "CabSanJudas",
    principal: 4000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 0, // Domingo
  },
  {
    name: "MIGUEL ANGEL RAZ GAMBOA",
    code: "CabMajo",
    principal: 5000,
    payment: 630,
    type: "weekly",
    count: 12,
    day: 2, // Martes
  },
  {
    name: "JOEL GABRIEL CHALE UICAB",
    code: "CabMajo",
    principal: 5000,
    payment: 600,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "JOSE ENRIQUE PERERA DZUL",
    code: "CabMajo",
    principal: 5000,
    payment: 750,
    type: "weekly",
    count: 12,
    day: 4, // Jueves
  },
  {
    name: "CRISTIAN REYNALDO EB POOT",
    code: "CabMajo",
    principal: 1500,
    payment: 280,
    type: "weekly",
    count: 8,
    day: 6, // Sábado
  },
  {
    name: "JOSE ANGEL KU CANCHE",
    code: "CabJenidi",
    principal: 4000,
    payment: 800,
    type: "biweekly", // Quincenal
    count: 6,
    day: null,
  },
  {
    name: "LADISLAO EDDIE MAZA LOPEZ",
    code: "CabJenidi",
    principal: 3000,
    payment: 360,
    type: "weekly",
    count: 12,
    day: 4, // Jueves (2do crédito)
  },
  {
    name: "JOSE ALFREDO MAY DOMINGUEZ",
    code: "CabJenidi",
    principal: 5000,
    payment: 625,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "MARTIN CONCEPCION PECH CHAN",
    code: "CabJenidi",
    principal: 6000,
    payment: 725,
    type: "weekly",
    count: 12,
    day: 0, // Domingo
  },
  {
    name: "GENI BEATRIZ BASTO HERRERA",
    code: "CabJenidi",
    principal: 8500,
    payment: 850,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "FLORY NOEMI MAY MATU",
    code: "CabDaniel",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "CESAR MARIANO MEX BARCELO",
    code: "CabDaniel",
    principal: 4000,
    payment: 485,
    type: "weekly",
    count: 16,
    day: 4, // Jueves
  },
  {
    name: "CESAR GASPAR MONTALVO ARANDA",
    code: "CabDaniel",
    principal: 15000,
    payment: 1500,
    type: "weekly",
    count: 16,
    day: 2, // Martes
  },
  {
    name: "JOSE OCTAVIO KOYOC MOO",
    code: "CabDaniel",
    principal: 5000,
    payment: 630,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },

  // --- PÁGINA 11 ---
  {
    name: "RUBI DIANELI CHI MONTALVO",
    code: "CabIzamal",
    principal: 10000,
    payment: 1050,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "NORMA DEL SCORRO MEDINA MATOS",
    code: "CabIzamal",
    principal: 5000,
    payment: 530,
    type: "weekly",
    count: 12,
    day: 1, // Lunes (crédito semanal)
  },
  {
    name: "MARIA ELOISA MEX ALDANA",
    code: "CabIzamal",
    principal: 2000,
    payment: 250,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "LADISLAO EDDIE MAZA LOPEZ",
    code: "CabIzamal",
    principal: 3000,
    payment: 360,
    type: "weekly",
    count: 12,
    day: 4, // Jueves (3er crédito)
  },
  {
    name: "ISIDRO ARMIN RUIZ MALDONADO",
    code: "CabIzamal",
    principal: 20000,
    payment: 2150,
    type: "weekly",
    count: 12,
    day: 2, // Martes
  },
  {
    name: "ANYELY DAYANE CASTILLO BASTO",
    code: "CabEmiliano",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 2, // Martes
  },
  {
    name: "SERGIO ANTONIO PACHECO CARDEÑA",
    code: "CabEmiliano",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "ROSA ELENA CANCHE CHI",
    code: "CabEmiliano",
    principal: 5000,
    payment: 520,
    type: "weekly",
    count: 12,
    day: 6, // Sábado
  },
  {
    name: "WILBERT UICAB DZUL",
    code: "CabEmiliano",
    principal: 4000,
    payment: 450,
    type: "weekly",
    count: 12,
    day: 1, // Lunes
  },
  {
    name: "ANDRES DZUL KOYOC",
    code: "CabEmiliano",
    principal: 2000,
    payment: 350,
    type: "weekly",
    count: 8,
    day: 3, // Miércoles
  },
  {
    name: "PAULA MARISELA DUARTE CASTILLO",
    code: "CabFabian",
    principal: 6000,
    payment: 600,
    type: "weekly",
    count: 12,
    day: 3, // Miércoles
  },
  {
    name: "NELSY DEL ROSARIO LUGO SABIDO",
    code: "CabFabian",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 16,
    day: 6, // Sábado
  },
  {
    name: "NELSY DEL ROSARIO LUGO SABIDO",
    code: "CabFabian",
    principal: 5000,
    payment: 500,
    type: "weekly",
    count: 16,
    day: 6, // Sábado (2do crédito)
  },
  {
    name: "ROGER AMBROSIO ESPASAS SOSA",
    code: "CabFabian",
    principal: 10000,
    payment: 1350,
    type: "weekly",
    count: 12,
    day: 5, // Viernes
  },
  {
    name: "ERIK MIGUEL CASTILLO BURGOS",
    code: "Danielcab1",
    principal: 8000,
    payment: 900,
    type: "weekly",
    count: 12,
    day: 2, // Martes
  },
  {
    name: "ALEJANDRO MORENO UITZ",
    code: "RomanD",
    principal: 7500,
    payment: 155,
    type: "daily",
    count: 50,
    day: null,
  },
];

async function main() {
  console.log("🌟 Importando clientes de Izamal con nombres en negro (Páginas 7-11)...");

  // 1. Zona Izamal
  let izamalZone = await prisma.zone.findFirst({ where: { name: "Izamal" } });
  if (!izamalZone) {
    izamalZone = await prisma.zone.create({
      data: { name: "Izamal", description: "Ruta Izamal y comisarías" }
    });
  }
  console.log(`📍 Zona lista: ${izamalZone.name} (${izamalZone.id})`);

  // 2. Unique clients map
  const uniqueClients = new Map();
  for (const item of IZAMAL_BLACK_CLIENTS) {
    const cleanName = item.name.trim().toUpperCase();
    if (!uniqueClients.has(cleanName)) {
      uniqueClients.set(cleanName, {
        fullName: cleanName,
        collector: COLLECTOR_NAMES[item.code] || "Roman Daniel Cab Estrella",
        credits: [],
      });
    }
    if (item.principal > 0 && item.payment > 0) {
      uniqueClients.get(cleanName).credits.push(item);
    }
  }

  console.log(`👤 Clientes únicos en negro a importar: ${uniqueClients.size}`);

  let clientCounter = 1;
  const createdClientDbMap = new Map();

  for (const [fullName, info] of uniqueClients.entries()) {
    const clientNumber = `IZM-${String(clientCounter).padStart(3, "0")}`;
    clientCounter++;

    // Check if details exist in seed map
    const seedInfo = seedClientsMap[fullName] || {};

    const client = await prisma.client.create({
      data: {
        clientNumber,
        fullName,
        identification: seedInfo.folio ? `INE-${seedInfo.folio}` : `INE-${clientNumber}`,
        phone: seedInfo.phone || "988-100-0000",
        address: seedInfo.address || "Centro, Izamal, Yucatán",
        personalReferenceName: seedInfo.avalName || "Aval Registrado",
        personalReferencePhone: seedInfo.avalPhone || "988-100-0001",
        personalReferenceAddress: seedInfo.avalAddress || "Centro, Izamal, Yucatán",
        zoneId: izamalZone.id,
        status: "active",
        notes: `Cobrador asignado: ${info.collector}. Origen: Payo PDF Págs 7-11`,
      }
    });

    createdClientDbMap.set(fullName, client.id);
    console.log(`   + Cliente [${clientNumber}]: ${fullName} (Cobrador: ${info.collector})`);
  }

  // 3. Crear los créditos activos de estos clientes
  console.log("\n💳 Creando créditos activos y calendario de cobranza...");
  let creditCounter = 101;
  const today = parseDateUtc("2026-10-01");

  for (const item of IZAMAL_BLACK_CLIENTS) {
    if (!item.principal || !item.payment) continue;

    const clientId = createdClientDbMap.get(item.name.trim().toUpperCase());
    if (!clientId) continue;

    const count = item.count || 12;
    const totalAmount = item.payment * count;
    const interest = totalAmount - item.principal;
    const rate = Math.round((interest / item.principal) * 10000) / 10000;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (item.type === "daily" ? count : count * 7));

    const credit = await prisma.credit.create({
      data: {
        clientId,
        zoneId: izamalZone.id,
        productType: "standard",
        type: item.type,
        principalAmount: item.principal,
        interestRate: rate,
        interestAmount: interest,
        totalAmount,
        installmentCount: count,
        installmentAmount: item.payment,
        weeklyCollectionDay: item.day,
        lateFeeGraceDays: item.type === "daily" ? 2 : 0,
        startDate: today,
        expectedEndDate: endDate,
        status: "active",
      }
    });

    // Cuotas amortizadas
    const principalPerInst = Math.round((item.principal / count) * 100) / 100;
    const interestPerInst = Math.round((item.payment - principalPerInst) * 100) / 100;

    const installments = [];
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(today);
      if (item.type === "daily") {
        dueDate.setDate(dueDate.getDate() + i);
      } else if (item.type === "biweekly") {
        dueDate.setDate(dueDate.getDate() + (i * 14));
      } else {
        dueDate.setDate(dueDate.getDate() + (i * 7));
      }

      installments.push({
        creditId: credit.id,
        installmentNumber: i,
        dueDate,
        scheduledAmount: item.payment,
        principalComponent: principalPerInst,
        interestComponent: interestPerInst,
        paidAmount: 0,
        status: "pending",
      });
    }

    await prisma.creditInstallment.createMany({
      data: installments
    });

    console.log(`   + Crédito #${credit.creditNumber}: ${item.name} - $${item.principal} (${item.type.toUpperCase()}, ${count} cuotas de $${item.payment})`);
  }

  console.log("\n✅ ¡Importación completada con éxito!");
}

main()
  .catch((e) => {
    console.error("❌ Error en la importación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
