import { PrismaClient } from "@prisma/client";

// Ensure small connection limit for script execution
const dbUrl = (process.env.DATABASE_URL || "").includes("connection_limit")
  ? process.env.DATABASE_URL
  : (process.env.DATABASE_URL || "") + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "connection_limit=2";

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

function parseDateUtc(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// 1. ZONAS
const ZONES_DATA = [
  { name: "Motul", description: "Ruta principal y municipios circunvecinos (Centro, Uci, Kini, Dzununcán)" },
  { name: "Izamal", description: "Ruta Izamal (Centro, San Juan, San Román, San Francisco, Kimbilá, Citilcum)" },
  { name: "Sitilpech", description: "Sub-ruta Sitilpech y comisarías de Izamal" },
];

// 2. GESTORES / COBRADORES (Página 1 del PDF)
const PROFILES_DATA = [
  { fullName: "Roman Daniel Cab Estrella", phone: "9881030374", mainZone: "Izamal" },
  { fullName: "Gidel Tamayo", phone: "9995955904", mainZone: "Izamal" },
  { fullName: "Guadalupe Leal Cocom", phone: "9889575430", mainZone: "Motul" },
  { fullName: "Jessica Beatriz Perera Pech", phone: "9881038698", mainZone: "Motul" },
  { fullName: "Gilmer T", phone: "7403038198", mainZone: "Izamal" },
  { fullName: "Majo Valencia", phone: "9889677156", mainZone: "Izamal" },
  { fullName: "Jenidi Cab", phone: "9889665929", mainZone: "Izamal" },
  { fullName: "Emiliano Cab", phone: "9889579379", mainZone: "Izamal" },
  { fullName: "Fabian Cab", phone: "1234567890", mainZone: "Izamal" },
  { fullName: "Daniel Estrella", phone: "1234567890", mainZone: "Izamal" },
];

// 3. TABULADOR DE CREDITOS Y POLITICAS
const CREDIT_SETTING_DATA = {
  defaultDailyInterestRate: 0.20,
  defaultWeeklyInterestRate: 0.25,
  defaultLateFeeAmount: 50.00,
  defaultLateFeeRate: 0.05, // 5% semanal base
  lateFeeGraceDays: 2, // 2 atrasos permitidos en diarios
};

// 4. CLIENTES REALES (Páginas 46 - 60 del PDF)
const CLIENTS_DATA = [
  // --- MOTUL (Págs 54 & 56) ---
  {
    folio: "1752",
    fullName: "CRUZ AKE GUILLERMO RAFAEL",
    capital: 7000,
    address: "C- 31 # 265 entre 14 Y 16 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-3870055",
    avalName: "DZUL CUEVAS DAVID CONCEPCION",
    avalPhone: "991-1723282",
    avalAddress: "C- 31 # 265 entre 14 Y 16 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1849",
    fullName: "KUK JARAMILLO MAYRA YANELI",
    capital: 6000,
    address: "C- C 36 # 313 entre 29 Y 31 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1100126",
    avalName: "JARAMILLO Y MARIA GUADALUPE",
    avalPhone: "991-1070139",
    avalAddress: "C- C. 36 # #313 entre X29 Y 31 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1850",
    fullName: "AKE CHALE EDWIN ADIEL",
    capital: 6000,
    address: "C- C 20 X 21 Y 23 # 103 E C.P. 97440 Uci, Motul",
    zone: "Motul",
    phone: "991-3408578",
    avalName: "CHALE MOO BRIGIDA",
    avalPhone: "991-5960529",
    avalAddress: "C- C 20 X 21 Y 23 # 103 E C.P. 97440 Uci, Motul",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "1851",
    fullName: "HOMA MEDINA JAVIER DE JESUS",
    capital: 3000,
    address: "C- C. 42 X 39 Y 41 NO. 421 A C.P. 97430 San Roque, Motul",
    zone: "Motul",
    phone: "9911182492",
    avalName: "DEYSI VAZQUEZ HERNANDEZ",
    avalPhone: "9911072757",
    avalAddress: "C- C. 42 X 39 Y 41 C.P. 97430 San Roque, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1854",
    fullName: "AGUILAR PINO ARGEL HERBE",
    capital: 10000,
    address: "C- C 27 # 0 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1181024",
    avalName: "JUAREZ CAHIC ANEL DE JESUS",
    avalPhone: "991-1040604",
    avalAddress: "C- C 27 # 0 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1855",
    fullName: "OTILIO CAUICH DZIB",
    capital: 11000,
    address: "C- C 16 X 31 Y 33 # 310 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-3409167",
    avalName: "MARIA JESUS DEL SOCORRO PUC UITZ",
    avalPhone: "999-3409169",
    avalAddress: "C- C 16 X 31 Y 33 # 310 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1856",
    fullName: "ORTIZ SUNZA GUADALUPE ARLENE",
    capital: 12000,
    address: "C- C 9 # 230 entre 26 Y 24 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1156094",
    avalName: "ORTIZ SUNZA JESUS EDILBERTO",
    avalPhone: "991-1155918",
    avalAddress: "C- C 9 # 293 entre 24A Y 16 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1857",
    fullName: "CANTON MALDONADO RICARDO JAVIER",
    capital: 6000,
    address: "C- 27 # S/N entre 26 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-5258873",
    avalName: "MOLINA GONZALEZ CRISTIANA",
    avalPhone: "999-4527410",
    avalAddress: "C- 27 # S/N entre 26 C.P. 97430 Centro, Motul",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "1858",
    fullName: "JONATHAN ALFREDO GAMBOA CAN",
    capital: 5000,
    address: "C- 26 # 221 entre 7 Y 9 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-3409744",
    avalName: "CYNTHIA YAZMIN CAMPO MAY",
    avalPhone: "991-1015139",
    avalAddress: "C- 15 # 38 entre 38A C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1860",
    fullName: "GEOVANNI PECH YAM",
    capital: 3000,
    address: "C- 20 # S/N entre 37 Y 39 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-7370644",
    avalName: "TAMAY ESPINOSA LANDY AURORA",
    avalPhone: "991-1085557",
    avalAddress: "C- 18 # S/N entre 3 Y 5 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1861",
    fullName: "GONZALEZ VELASQUEZ MARIA JOSE",
    capital: 3000,
    address: "C- 12 # 301 L entre 25 Y 27 C.P. 97444 Dzununcan, Motul",
    zone: "Motul",
    phone: "999-6467762",
    avalName: "CANTON MALDONADO RICARDO JAVIER",
    avalPhone: "999-1226332",
    avalAddress: "C- 12 # 301 L C.P. 97444 Dzununcan, Motul",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "1862",
    fullName: "CANUL POOL JOSE CARLOS",
    capital: 3000,
    address: "C- C. 32 S/N X 19 Y 19 A C.P. 97430 Mario H. Cuevas, Motul",
    zone: "Motul",
    phone: "9919590995",
    avalName: "PUC CANUL MARIA CRISTINA",
    avalPhone: "9911064250",
    avalAddress: "C- C. 32 X 19 Y 19 A C.P. 97430 Mario H. Cuevas, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1863",
    fullName: "GAMBOA CAN ABIGAIL ALEJANDRA",
    capital: 5000,
    address: "C- 26 # 221 entre 7 Y 9 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1094845",
    avalName: "CAAMAL NOH JOSE DAVID",
    avalPhone: "991-1024454",
    avalAddress: "C- 26 # 221 entre 7 Y 9 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1864",
    fullName: "PECH KU JUAN GABRIEL",
    capital: 11000,
    address: "C- 29 # 291 entre 24 Y 22 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1116803",
    avalName: "SANDRA RUBI CAAMAL CANUL",
    avalPhone: "991-1136955",
    avalAddress: "C- 29 # 291 entre 24 Y 22 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1865",
    fullName: "CANCHE CANUL ROBERTO ADOLFO",
    capital: 7000,
    address: "C- 21 # S/N entre 12 Y 14 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-2733304",
    avalName: "PECH CAN INGRIT DEL ROSARIO",
    avalPhone: "999-4475981",
    avalAddress: "C- 13 # 309 entre 30 Y 32 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1867",
    fullName: "CAN KUK ELSA ARACELI",
    capital: 3000,
    address: "C- 32 # 266 L entre 12 Y 14 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1115450",
    avalName: "CAN KUK ILEANA ARACELY",
    avalPhone: "991-3405174",
    avalAddress: "C- 23 # S/N entre 42 Y 44 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1868",
    fullName: "SUNZA Y ORTEGA ROSA MARIA",
    capital: 5000,
    address: "C- C. 9 # 293 entre 26 Y 24 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1156094",
    avalName: "TAMAYO PECH JOSE JACINTO",
    avalPhone: "999-2744795",
    avalAddress: "C- C. 21 # S/N entre 20 Y 22 C.P. 97440 Uci, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1869",
    fullName: "CANUL VILLANUEVA RINA MARIA",
    capital: 4000,
    address: "C- C. 35 X 20 Y 22 NO. 296 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "9911162089",
    avalName: "MALDONADO CANUL JANETH ELISA",
    avalPhone: "9911162089",
    avalAddress: "C- C. 35 X 20 Y 22 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1870",
    fullName: "ESCOBEDO PECH MARIA SANDRA GABRIELA",
    capital: 3000,
    address: "C- 47 # 0 entre 16 Y 18 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1135622",
    avalName: "X CHALE BLANCA MARIA",
    avalPhone: "991-1093502",
    avalAddress: "C- 41 # 0 entre 46 Y 48 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1871",
    fullName: "KUK COUOH JORGE BRAYAN",
    capital: 5000,
    address: "C- 36 # 313 entre 29 Y 31 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1110495",
    avalName: "KUK JARAMILLO JOSE KUK",
    avalPhone: "991-1070139",
    avalAddress: "C- 36 # 313 entre 29 Y 31 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1872",
    fullName: "GONZALEZ AGUILAR DEISY GEORGINA",
    capital: 5000,
    address: "C- 28 # 310A entre 31 Y 33 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1155832",
    avalName: "AGUILAR PINO DEISY NOEMI",
    avalPhone: "991-1155832",
    avalAddress: "C- 28 # 310A entre 31 Y 33 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1873",
    fullName: "PAMELA GUADALUPE VIDAL ESCOBEDO",
    capital: 3000,
    address: "C- 28 # 327E entre 35 Y 37 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-4107389",
    avalName: "ESCOBEDO COUOH REYNA GUADALUPE",
    avalPhone: "991-1099361",
    avalAddress: "C- 28 # 327E entre 35 Y 37 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1874",
    fullName: "CAAMAL CASTRO SULEMY NOEMI",
    capital: 3000,
    address: "C- 31 # 308D entre 30 Y 4 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1135135",
    avalName: "CAAMAL CASTRO JENNIFER GUADALUPE",
    avalPhone: "999-9070437",
    avalAddress: "C- 37 # 308D entre 30 Y 34 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1875",
    fullName: "FLORES DZIB MAXIMILIANO",
    capital: 7000,
    address: "C- 11 # 125 entre 22 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1180007",
    avalName: "FLORES DZIB MIGUEL ANGEL",
    avalPhone: "991-1018031",
    avalAddress: "C- 11 # 125 entre 22 Y 22 A C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1876",
    fullName: "PENICHE UITZ JORGE ENRIQUE",
    capital: 3000,
    address: "C- C. 46 X 37 Y 39 C.P. 97430 San Roque, Motul",
    zone: "Motul",
    phone: "9911027090",
    avalName: "SABIDO CHAVEZ ROSELVET PALOMA",
    avalPhone: "9911027090",
    avalAddress: "C- C 46 X 37 Y 39 C.P. 97430 San Roque, Motul",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "1877",
    fullName: "POOL MUKUL CARMEN GUADALUPE",
    capital: 4000,
    address: "C- 21 # 330 entre 34A Y 36 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1039664",
    avalName: "PECH POOL GABRIELA GUADALUPE",
    avalPhone: "991-1021495",
    avalAddress: "C- 21 # 330 entre 34A Y 36 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1878",
    fullName: "AKE RAMIREZ FREDDY ARMANDO",
    capital: 11000,
    address: "C- 26 # 97 entre 25 Y 27 C.P. 97437 Kini, Motul",
    zone: "Motul",
    phone: "999-3395408",
    avalName: "AKE RAMIREZ TERESA DE JESUS",
    avalPhone: "991-1163833",
    avalAddress: "C- 25 # 97 entre 26 Y 27 C.P. 97437 Kini, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1879",
    fullName: "ESTRADA Y POOT MANUELA DE JESUS",
    capital: 5000,
    address: "C- C 27 X 42 Y 44 # 377 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-3400754",
    avalName: "DZUL ESTRADA ESMERALDA DEL CARMEN",
    avalPhone: "991-1014742",
    avalAddress: "C- CALLE 24 X 15 Y 17 #235 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1880",
    fullName: "MAC EUAN MARIA DEL ROSARIO",
    capital: 12000,
    address: "C- C 30 X 19 Y 21 N276 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-5277208",
    avalName: "EUAN PECH ROSAMARIA",
    avalPhone: "999-5277208",
    avalAddress: "C- C 30 X 19 Y 21 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1881",
    fullName: "PENICHE UITZ IRIANA ESTEFANI",
    capital: 5000,
    address: "C- C. 48 X 39 Y 41 C.P. 97430 San Roque, Motul",
    zone: "Motul",
    phone: "9911181436",
    avalName: "CANUL PAREDES ADRIAN ISRAEL",
    avalPhone: "9911181436",
    avalAddress: "C- C. 48 X 39 Y 41 C.P. 97430 San Roque, Motul",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "1882",
    fullName: "EDER MANUEL BALAM CASTILLO",
    capital: 3000,
    address: "C- C. 9 # 649 X 38 Y 40 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "991-1039580",
    avalName: "GEORGINA ANGELICA NOH VARGUEZ",
    avalPhone: "991-1039580",
    avalAddress: "C- C 9 X 38 Y 40 # 649 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "1883",
    fullName: "CANCHE LIZEAS RUTH ESTHER",
    capital: 5000,
    address: "C- C. 24 X 21 Y 23 # 272 C.P. 97430 Centro, Motul",
    zone: "Motul",
    phone: "999-3460926",
    avalName: "KOH CANUL RAUL VALENTIN",
    avalPhone: "991-1116801",
    avalAddress: "C- C. 24 X 21 Y 23 C.P. 97430 Centro, Motul",
    collector: "Guadalupe Leal Cocom"
  },

  // --- IZAMAL & SITILPECH (Págs 46 - 53, 57 - 60) ---
  {
    folio: "1249",
    fullName: "REJON MARTINEZ ELINA ARACELLY",
    capital: 5000,
    address: "C- C 36 X 35 Y 37 # 306 C.P. 97540 Centro, Izamal",
    zone: "Izamal",
    phone: "9881051797",
    avalName: "ROBERTO MARTIN PECH DZIB",
    avalPhone: "9889578185",
    avalAddress: "C- C 36 X 35 Y 37 C.P. 97540 Centro, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1289",
    fullName: "FRANCISCA CHUNAB POOT",
    capital: 4000,
    address: "C- C 14 X 23 S/N C.P. 97545 Sitilpech, Izamal",
    zone: "Sitilpech",
    phone: "9889579579",
    avalName: "MARIA CONCEPCION EUAN PECH",
    avalPhone: "9889669812",
    avalAddress: "C- C 14 X 23 C.P. 97545 Sitilpech, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1293",
    fullName: "ROSA DE LA CRUZ TRUJEQUE CHEL",
    capital: 4000,
    address: "C- C. 35 X 20 Y 22 S/N C.P. 97540 Santo Domingo, Izamal",
    zone: "Izamal",
    phone: "9995959435",
    avalName: "CARLOS ISMAEL KU CHAN",
    avalPhone: "9981094568",
    avalAddress: "C- C. 35 X 20 Y 22 C.P. 97540 Santo Domingo, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1295",
    fullName: "QUIJANO MARTINEZ FERNANDO",
    capital: 5000,
    address: "C- C. 14 X 31 Y 33 C.P. 97540 San Juan, Izamal",
    zone: "Izamal",
    phone: "9881030374",
    avalName: "LADISLAO EDDIE MAZA LOPEZ",
    avalPhone: "9889669442",
    avalAddress: "C- C. 14 X 31 Y 33 C.P. 97540 San Juan, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1296",
    fullName: "JOSE RODOLFO UITZ MAY",
    capital: 6000,
    address: "C- C. 43 X 28 Y 30 #285 C.P. 97540 San Jose, Izamal",
    zone: "Izamal",
    phone: "9889579712",
    avalName: "NORMA DEL SOCORRO MEDINA MATOS",
    avalPhone: "9881058143",
    avalAddress: "C- C. 43 X 28 Y 30 C.P. 97540 San Jose, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1301",
    fullName: "LUGO CETINA WILLIAM ALBERTO",
    capital: 5000,
    address: "C- C. 9 X 26 Y 28 C.P. 97540 Yaxche, Izamal",
    zone: "Izamal",
    phone: "9881030125",
    avalName: "PEDRO PABLO PECH POOL",
    avalPhone: "9889672752",
    avalAddress: "C- C. 9 X 26 Y 28 C.P. 97540 Yaxche, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1308",
    fullName: "FANNY BEATRIZ CHAN MANZANERO",
    capital: 4000,
    address: "C- C 42 X 37 Y 39 # 318 C.P. 97540 San Roman, Izamal",
    zone: "Izamal",
    phone: "9994078432",
    avalName: "JULIO ALBERTO VELAZQUEZ UC",
    avalPhone: "9889664900",
    avalAddress: "C- C 42 X 37 Y 39 C.P. 97540 San Roman, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1324",
    fullName: "PUC PUC FELIPA ESTHER",
    capital: 5000,
    address: "C- C 15 X 26A X 26B C.P. 97540 Yaxche, Izamal",
    zone: "Izamal",
    phone: "988-9663297",
    avalName: "MANUELA DE JESUS PECH DZIB",
    avalPhone: "988-9572413",
    avalAddress: "C- C 15 X 26A X 26B C.P. 97540 Yaxche, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1353",
    fullName: "PAT MAZUN MARCO ANTONIO",
    capital: 6000,
    address: "C- C. 14 X 31 Y 33 S/N C.P. 97540 San Juan, Izamal",
    zone: "Izamal",
    phone: "9889665645",
    avalName: "EDGAR ALEJANDRO MASSA BURGOS",
    avalPhone: "9995019723",
    avalAddress: "C- C. 14 X 31 Y 33 C.P. 97540 San Juan, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1375",
    fullName: "JUDITH ARGELY DZIB CIAU",
    capital: 4000,
    address: "C- C. 26 # 255 Y 19 C.P. 97540 Guadalupe, Izamal",
    zone: "Izamal",
    phone: "9889668195",
    avalName: "FELIPA DE JESUS BALAM CASTILLO",
    avalPhone: "9992557667",
    avalAddress: "C- C. 26 # 255 Y 19 C.P. 97540 Guadalupe, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1379",
    fullName: "MENDOZA MADERA ANDRES AVELINO",
    capital: 6000,
    address: "C- C. 36 X 35 Y 37 NO.311B C.P. 97540 Centro, Izamal",
    zone: "Izamal",
    phone: "988-9670951",
    avalName: "NORFOEL ALEJANDRO ESPADAS GONZALEZ",
    avalPhone: "999-3392889",
    avalAddress: "C- C. 36 X 35 Y 37 C.P. 97540 Centro, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1462",
    fullName: "VICTOR JESUS OXTE PISTE",
    capital: 5000,
    address: "C- C 15 X 30 Y 28 S/N C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "9889679566",
    avalName: "ISIDRO ARMIN RUIZ MALDONADO",
    avalPhone: "9999942653",
    avalAddress: "C- C 15 X 30 Y 28 C.P. 97540 Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1526",
    fullName: "PECH PECH LILIA BEATRIZ",
    capital: 5000,
    address: "C- C 19 # 101 X 20 Y 22 C.P. 97545 Sitilpech, Izamal",
    zone: "Sitilpech",
    phone: "9889579504",
    avalName: "SUEMY CAROLINA HERRERA UITZ",
    avalPhone: "9889673443",
    avalAddress: "C- C 19 # 101 X 20 Y 22 C.P. 97545 Sitilpech, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1662",
    fullName: "MARTHA MARIELA CUPUL ALDANA",
    capital: 4000,
    address: "C- C. 41 S/N POR 30 Y 28 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1091814",
    avalName: "RUBI DIANELI CHI MONTALVO",
    avalPhone: "988-1035278",
    avalAddress: "C- C. 41 S/N POR 30 Y 28 C.P. 97540 Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "1719",
    fullName: "WILBERTH BOBADILLA MENDEZ",
    capital: 7000,
    address: "C- C 25 X 38 Y 40 # 304 C.P. 97540 San Francisco, Izamal",
    zone: "Izamal",
    phone: "9889670160",
    avalName: "JOSE ANGEL KU CANCHE",
    avalPhone: "9889666447",
    avalAddress: "C- C 25 X 38 Y 40 # 304 C.P. 97540 San Francisco, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "2273",
    fullName: "SAURI VERDEJO MARIA MAGDALENA",
    capital: 3000,
    address: "C- C. 38 X 21 Y 23 N. 269A C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "998-5252926",
    avalName: "LEONARDO DANIEL MEX HAU",
    avalPhone: "988-9665206",
    avalAddress: "C- C. 38 X 21 Y 23 C.P. 97540 Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2333",
    fullName: "TUN PECH GELMY CHEVEL",
    capital: 4000,
    address: "C- C 40 # 288 C entre 23 Y 25 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "999-3599956",
    avalName: "GENI BEATRIZ BASTO HERRERA",
    avalPhone: "999-3599956",
    avalAddress: "C- C 40 # 288 C C.P. 97540 Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2460",
    fullName: "CONCEPCION PERERA CAT",
    capital: 4000,
    address: "C- 24 # 289 A entre 27 Y 29 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1036003",
    avalName: "WESLEY OTONIEL CEN CHAB",
    avalPhone: "999-1754741",
    avalAddress: "C- 24 # 289 A C.P. 97540 Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2470",
    fullName: "XOOL CANUL JORGE ALBERTO",
    capital: 5000,
    address: "C- C 42 # 163 entre 19 Y 21 C.P. 97540 San Francisco, Izamal",
    zone: "Izamal",
    phone: "999-2502880",
    avalName: "NELSY DEL ROSARIO LUGO SABIDO",
    avalPhone: "999-3244681",
    avalAddress: "C- C 42 # 163 C.P. 97540 San Francisco, Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2508",
    fullName: "CHALE KU MARIA RAQUEL",
    capital: 5000,
    address: "C- C 30 # N205 entre 11 Y 13 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "999-8994386",
    avalName: "LEYDI LETICIA CETZ CAUICH",
    avalPhone: "999-8994386",
    avalAddress: "C- C 30 # N205 C.P. 97540 Izamal",
    collector: "Emiliano Cab"
  },
  {
    folio: "2529",
    fullName: "MAY Y MAY MARIA ELSY",
    capital: 4000,
    address: "C- C. 33 X 40 Y 42 N. 319 C.P. 97540 Centro, Izamal",
    zone: "Izamal",
    phone: "9994866578",
    avalName: "WILBERT JESUS RUIZ GALA",
    avalPhone: "9994866578",
    avalAddress: "C- C. 33 X 40 Y 42 C.P. 97540 Centro, Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2625",
    fullName: "UITZ PERERA JOSE ANTONIO",
    capital: 5000,
    address: "C- C. 32 # 321 A entre 35 Y 37 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-9577368",
    avalName: "MARIA GENOVEVA CHI HAU",
    avalPhone: "988-9667306",
    avalAddress: "C- C. 32 # 321 A C.P. 97540 Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2649",
    fullName: "VAZQUEZ GONZALEZ BEATRIZ ADRIANA",
    capital: 6000,
    address: "C- 47 # 286 entre 24 Y 24 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-0000000",
    avalName: "JORGE ALBERTO POOL CANUL",
    avalPhone: "988-0000000",
    avalAddress: "C- 47 # 286 C.P. 97540 Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "2701",
    fullName: "RICHARD JOSUE XOOL CANUL",
    capital: 5000,
    address: "C- C 18 X 33 Y 35 SN C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1031965",
    avalName: "INGRID ROCELA CORAL ROSADO",
    avalPhone: "988-9576092",
    avalAddress: "C- C 18 X 33 Y 35 C.P. 97540 Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2750",
    fullName: "ARCILA MOO JOSE GREGORIO",
    capital: 4000,
    address: "C- C. 32 X 21 Y 19 N 6 C.P. 97540 Estacion, Izamal",
    zone: "Izamal",
    phone: "9889575961",
    avalName: "ALMA DELIA UITZ ARAUJO",
    avalPhone: "9991030981",
    avalAddress: "C- C. 32 X 21 Y 19 C.P. 97540 Estacion, Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2754",
    fullName: "PEREZ SHILON MARIA JOSEFINA",
    capital: 4000,
    address: "C- C. 40 # 283 entre 19 Y 21 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1031412",
    avalName: "DIANA LETICIA CHUC CETZ",
    avalPhone: "988-9674937",
    avalAddress: "C- C. 40 # 283 C.P. 97540 Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2792",
    fullName: "CARVAJAL ORDONEZ MARIA MARCELINA",
    capital: 3000,
    address: "C- C. 39 # 388 entre 40 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1057613",
    avalName: "GUADALUPE DEL SOCORRO TZUC CHIM",
    avalPhone: "988-1057630",
    avalAddress: "C- C. 39 # 388 C.P. 97540 Izamal",
    collector: "Daniel Estrella"
  },
  {
    folio: "2815",
    fullName: "CIME CARVAJAL PRISCILA DEL CARMEN",
    capital: 3000,
    address: "C- C 20 # 96 entre 17 C.P. 97545 Sitilpech, Izamal",
    zone: "Sitilpech",
    phone: "228-3102652",
    avalName: "RUSEL ABEL MOO VALENCIA",
    avalPhone: "988-9674053",
    avalAddress: "C- C 20 # 96 C.P. 97545 Sitilpech, Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2853",
    fullName: "CAUICH CHI MARIA VALENTINA",
    capital: 4000,
    address: "C- C. 27 X 42 Y 44 # 235 C.P. 97540 San Francisco, Izamal",
    zone: "Izamal",
    phone: "988-9665908",
    avalName: "JOSE GUADALUPE LUGO AZCORRA",
    avalPhone: "999-1282437",
    avalAddress: "C- C. 27 X 42 Y 44 C.P. 97540 San Francisco, Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2873",
    fullName: "GARCIA CHAN GILBERTO DAVID",
    capital: 5000,
    address: "C- C 50 entre 33 Y 35 # 429 C.P. 97540 San Genaro, Izamal",
    zone: "Izamal",
    phone: "988-1035952",
    avalName: "ANTONIA CAROLINA DELGADO CRUZ",
    avalPhone: "988-9662173",
    avalAddress: "C- C 50 entre 33 Y 35 C.P. 97540 San Genaro, Izamal",
    collector: "Emiliano Cab"
  },
  {
    folio: "2895",
    fullName: "JOSE FELIPE CHUNAB CHI",
    capital: 4000,
    address: "C- C 19 # 76 entre 16 C.P. 97545 Sitilpech, Izamal",
    zone: "Sitilpech",
    phone: "988-1057187",
    avalName: "EDGAR EFREN MENA GARCIA",
    avalPhone: "988-1057187",
    avalAddress: "C- C 19 # 76 C.P. 97545 Sitilpech, Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "2902",
    fullName: "PERERA DZUL JOSE ENRIQUE",
    capital: 5000,
    address: "C- C. 22 X 21 Y 23 #279C C.P. 97540 San Rafael, Izamal",
    zone: "Izamal",
    phone: "9881058810",
    avalName: "SERGIO ANTONIO PACHECO CARDENA",
    avalPhone: "9881055340",
    avalAddress: "C- C. 22 X 21 Y 23 C.P. 97540 San Rafael, Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2915",
    fullName: "CHE CAN ELVIA DEL SOCORRO",
    capital: 4000,
    address: "C- C 22 X 21 Y 23 N279C C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1055340",
    avalName: "ANTONIO DE JESUS KOYOC CANCHE",
    avalPhone: "988-1055340",
    avalAddress: "C- C 22 X 21 Y 23 C.P. 97540 Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2928",
    fullName: "COUOH CIME YOLANDA",
    capital: 5000,
    address: "C- C. 40 X 37 Y 39 S/N C.P. 97540 San Roman, Izamal",
    zone: "Izamal",
    phone: "999-1986873",
    avalName: "JOSE MARIA MAY OY",
    avalPhone: "988-9579885",
    avalAddress: "C- C. 40 X 37 Y 39 C.P. 97540 San Roman, Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2959",
    fullName: "DORANTES HAU TRIN RAFAEL",
    capital: 6000,
    address: "C- C 31 A # SN entre 8 Y 10 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-9675453",
    avalName: "JOSE ELIAS MAY MADERA",
    avalPhone: "988-1036295",
    avalAddress: "C- C 31 A # SN C.P. 97540 Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2968",
    fullName: "EUAN MOO FRANCISCA",
    capital: 5000,
    address: "C- 26 # 303 entre 31 Y 33 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "999-4308856",
    avalName: "MARIA JAQUELINE CIAU CAUICH",
    avalPhone: "988-1054601",
    avalAddress: "C- 26 # 303 C.P. 97540 Izamal",
    collector: "Jessica Beatriz Perera Pech"
  },
  {
    folio: "2976",
    fullName: "MARIA MARGARITA CANCHE TUYU",
    capital: 4000,
    address: "C- C 17 X 30 Y 36 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1036925",
    avalName: "CESAR MARIANO MEX BARCELO",
    avalPhone: "999-1328021",
    avalAddress: "C- C 17 X 30 Y 36 C.P. 97540 Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "2988",
    fullName: "MAY MATU FLORY NOEMI",
    capital: 4200,
    address: "C- 27 # 271 entre 16 C.P. 97540 San Juan, Izamal",
    zone: "Izamal",
    phone: "988-1055233",
    avalName: "CESAR GASPAR MONTALVO ARANDA",
    avalPhone: "988-1030715",
    avalAddress: "C- 27 # 271 C.P. 97540 San Juan, Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "3002",
    fullName: "GABINO MONTALVO PARRA",
    capital: 15000,
    address: "C- C. 25 X 12 Y 14 S/N C.P. 97540 Emiliano Zapata, Izamal",
    zone: "Izamal",
    phone: "998-3410706",
    avalName: "ALMA DELIA UITZ ARAUJO",
    avalPhone: "998-3410706",
    avalAddress: "C- C. 25 X 12 Y 14 C.P. 97540 Emiliano Zapata, Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "3014",
    fullName: "ESPADAS CHALE ARISBE MARGARITA",
    capital: 15000,
    address: "C- C. 31 X 18 Y 20 N. 235D C.P. 97540 San Juan, Izamal",
    zone: "Izamal",
    phone: "988-1034916",
    avalName: "MANUELA DE JESUS PECH DZIB",
    avalPhone: "988-1057609",
    avalAddress: "C- C. 31 X 18 Y 20 C.P. 97540 San Juan, Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "3023",
    fullName: "UITZ ARAUJO ALMA DELIA",
    capital: 10000,
    address: "C- C. 16 X 19 Y 21 S/N C.P. 97540 San Juan, Izamal",
    zone: "Izamal",
    phone: "988-9665667",
    avalName: "ISIDRO ARMIN RUIZ MALDONADO",
    avalPhone: "988-9666120",
    avalAddress: "C- C. 16 X 19 Y 21 C.P. 97540 San Juan, Izamal",
    collector: "Emiliano Cab"
  },
  {
    folio: "3028",
    fullName: "FRIAS CHABLE VICTOR",
    capital: 5000,
    address: "C- 31 # SN entre 8 Y 10 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1033824",
    avalName: "GENI BEATRIZ BASTO HERRERA",
    avalPhone: "988-9665210",
    avalAddress: "C- 31 # SN C.P. 97540 Izamal",
    collector: "Guadalupe Leal Cocom"
  },
  {
    folio: "3029",
    fullName: "ORDONEZ MADERA SELENE CAROLINA",
    capital: 6000,
    address: "C- 19 # S/N entre 19 Y 14 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "989-1753453",
    avalName: "EDGAR REYES CRUZ SANCHEZ",
    avalPhone: "988-9666215",
    avalAddress: "C- 19 # S/N C.P. 97540 Izamal",
    collector: "Roman Daniel Cab Estrella"
  },
  {
    folio: "3030",
    fullName: "MEDINA MATOS NORMA DEL SOCORRO",
    capital: 8000,
    address: "C- C. 30 X 35 Y 37 N. 316A C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1099470",
    avalName: "FELIPA DE JESUS BALAM CASTILLO",
    avalPhone: "988-9675564",
    avalAddress: "C- C. 30 X 35 Y 37 C.P. 97540 Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "3032",
    fullName: "LUGO SABIDO NELSY DEL ROSARIO",
    capital: 5000,
    address: "C- C 46 # 306 entre 33 Y 35 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-9573140",
    avalName: "MARIA ESTHER SABIDO PAT",
    avalPhone: "988-9579580",
    avalAddress: "C- C 46 # 306 C.P. 97540 Izamal",
    collector: "Jenidi Cab"
  },
  {
    folio: "3038",
    fullName: "MEX HAU LEONARDO DANIEL",
    capital: 5000,
    address: "C- C 47 # 0 entre 30 Y 32 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "984-1579756",
    avalName: "LADISLAO EDDIE MAZA LOPEZ",
    avalPhone: "999-1750785",
    avalAddress: "C- C 47 # 0 C.P. 97540 Izamal",
    collector: "Jenidi Cab"
  },
  {
    folio: "3059",
    fullName: "NEYLA SELENE POOL ADRIAN",
    capital: 12000,
    address: "C- C 16 X 21C Y 23 #101 C.P. 97545 Sitilpech, Izamal",
    zone: "Sitilpech",
    phone: "988-9668221",
    avalName: "ROGER AMBROSIO ESPASAS SOSA",
    avalPhone: "999-9045504",
    avalAddress: "C- C 16 X 21C Y 23 C.P. 97545 Sitilpech, Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "3066",
    fullName: "BALAM CASTILLO FELIPA DE JESUS",
    capital: 11000,
    address: "C- 28A # SN entre 9 Y 11 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "988-1054233",
    avalName: "NORFOEL ALEJANDRO ESPADAS GONZALEZ",
    avalPhone: "988-1054233",
    avalAddress: "C- 28A # SN C.P. 97540 Izamal",
    collector: "Fabian Cab"
  },
  {
    folio: "3084",
    fullName: "RUIZ MALDONADO ISIDRO ARMIN",
    capital: 25000,
    address: "C- C 15 # SN entre 10 Y 8 C.P. 97540 Izamal",
    zone: "Izamal",
    phone: "998-2576467",
    avalName: "ELIAS DE LA CRUZ RAZ GAMBOA",
    avalPhone: "988-9662482",
    avalAddress: "C- C 15 # SN C.P. 97540 Izamal",
    collector: "Fabian Cab"
  }
];

// 5. CREDITOS Y PAGOS SEMANALES / DIARIOS REALES (Pág. 4, 5, 27, 28, 29)
const CREDITS_DATA = [
  // --- DIARIOS MOTUL (Pág. 4) ---
  { clientFolio: "1856", type: "daily", principal: 5000, rate: 0.20, count: 24, payment: 250, day: null, status: "active" },
  { clientFolio: "1868", type: "daily", principal: 4000, rate: 0.20, count: 24, payment: 200, day: null, status: "active" },
  { clientFolio: "1875", type: "daily", principal: 10000, rate: 0.22, count: 48, payment: 305, day: null, status: "active" },
  { clientFolio: "1876", type: "daily", principal: 2000, rate: 0.25, count: 24, payment: 125, day: null, status: "active" },
  { clientFolio: "1861", type: "daily", principal: 25000, rate: 0.20, count: 60, payment: 500, day: null, status: "active" },

  // --- SEMANALES MOTUL (Pág. 4 & 5) ---
  { clientFolio: "1867", type: "weekly", principal: 5000, rate: 0.26, count: 12, payment: 525, day: 4, status: "active" }, // Jueves
  { clientFolio: "1865", type: "weekly", principal: 10000, rate: 0.34, count: 10, payment: 1340, day: 4, status: "active" },
  { clientFolio: "1857", type: "weekly", principal: 4000, rate: 0.35, count: 12, payment: 450, day: 5, status: "active" }, // Viernes
  { clientFolio: "1864", type: "weekly", principal: 5000, rate: 0.368, count: 12, payment: 570, day: 5, status: "active" },
  { clientFolio: "1850", type: "weekly", principal: 5000, rate: 0.368, count: 12, payment: 570, day: 4, status: "active" },

  // --- DIARIOS IZAMAL (Pág. 5 & 27) ---
  { clientFolio: "3029", type: "daily", principal: 6000, rate: 0.20, count: 40, payment: 180, day: null, status: "active" },
  { clientFolio: "3023", type: "daily", principal: 10000, rate: 0.20, count: 24, payment: 500, day: null, status: "active" },
  { clientFolio: "3002", type: "daily", principal: 15000, rate: 0.20, count: 36, payment: 500, day: null, status: "active" },
  { clientFolio: "3030", type: "daily", principal: 8000, rate: 0.20, count: 24, payment: 400, day: null, status: "active" },

  // --- SEMANALES IZAMAL POR DIA (Pág. 27 & 28) ---
  // Lunes:
  { clientFolio: "3038", type: "weekly", principal: 5000, rate: 0.20, count: 12, payment: 500, day: 1, status: "active" },
  { clientFolio: "2873", type: "weekly", principal: 10000, rate: 0.26, count: 12, payment: 1050, day: 1, status: "active" },
  // Martes:
  { clientFolio: "3084", type: "weekly", principal: 25000, rate: 0.296, count: 12, payment: 2700, day: 2, status: "active" },
  { clientFolio: "3059", type: "weekly", principal: 12000, rate: 0.20, count: 12, payment: 1200, day: 2, status: "active" },
  // Miércoles:
  { clientFolio: "3066", type: "weekly", principal: 11000, rate: 0.20, count: 12, payment: 1100, day: 3, status: "active" },
  // Jueves:
  { clientFolio: "2988", type: "weekly", principal: 4200, rate: 0.19, count: 10, payment: 500, day: 4, status: "active" },
  // Viernes:
  { clientFolio: "3032", type: "weekly", principal: 5000, rate: 0.20, count: 12, payment: 500, day: 5, status: "active" },
  // Sitilpech:
  { clientFolio: "2508", type: "weekly", principal: 5000, rate: 0.20, count: 12, payment: 500, day: 6, status: "active" }
];

async function main() {
  console.log("🚀 Iniciando migración de datos reales de Crediflex a Supabase...\n");

  // 1. ZONAS
  console.log("📍 Sincronizando Zonas...");
  const zoneMap = new Map();
  for (const z of ZONES_DATA) {
    const zone = await prisma.zone.upsert({
      where: { name: z.name },
      update: { description: z.description, isActive: true },
      create: { name: z.name, description: z.description, isActive: true },
    });
    zoneMap.set(z.name, zone.id);
    console.log(`   ✓ Zona: ${zone.name}`);
  }

  // 2. PERFILES / GESTORES
  console.log("\n👥 Sincronizando Perfiles de Gestores...");
  const profileMap = new Map();
  for (const p of PROFILES_DATA) {
    const existing = await prisma.profile.findFirst({
      where: { fullName: p.fullName }
    });
    const zoneId = zoneMap.get(p.mainZone);

    if (existing) {
      const updated = await prisma.profile.update({
        where: { id: existing.id },
        data: { phone: p.phone, mainZoneId: zoneId },
      });
      profileMap.set(p.fullName, updated.id);
      console.log(`   ✓ Perfil actualizado: ${p.fullName}`);
    } else {
      const created = await prisma.profile.create({
        data: {
          fullName: p.fullName,
          phone: p.phone,
          mainZoneId: zoneId,
        },
      });
      profileMap.set(p.fullName, created.id);
      console.log(`   + Perfil creado: ${p.fullName}`);
    }
  }

  // 3. TABULADOR DE CREDITOS
  console.log("\n⚙️ Configurando Tabulador de Crédito y Tasas...");
  const existingSetting = await prisma.creditSetting.findFirst();
  if (existingSetting) {
    await prisma.creditSetting.update({
      where: { id: existingSetting.id },
      data: CREDIT_SETTING_DATA,
    });
    console.log("   ✓ Tabulador actualizado con reglas de mora y plazos oficiales.");
  } else {
    await prisma.creditSetting.create({
      data: CREDIT_SETTING_DATA,
    });
    console.log("   + Tabulador creado con reglas de mora y plazos oficiales.");
  }

  // 4. CLIENTES Y AVALES
  console.log("\n📑 Insertando Directorio de Clientes y Avales...");
  const clientMap = new Map();
  for (const c of CLIENTS_DATA) {
    const zoneId = zoneMap.get(c.zone) || zoneMap.get("Izamal");
    const clientNumber = `CTE-${c.folio}`;

    const existing = await prisma.client.findFirst({
      where: {
        OR: [{ clientNumber }, { fullName: c.fullName }]
      }
    });

    let client;
    if (existing) {
      client = await prisma.client.update({
        where: { id: existing.id },
        data: {
          clientNumber,
          fullName: c.fullName,
          phone: c.phone,
          address: c.address,
          personalReferenceName: c.avalName,
          personalReferencePhone: c.avalPhone,
          personalReferenceAddress: c.avalAddress,
          zoneId: zoneId,
          status: "active",
          notes: `Cobrador asignado: ${c.collector}. Folio original: ${c.folio}`,
        },
      });
      console.log(`   ✓ Cliente actualizado [${clientNumber}]: ${c.fullName}`);
    } else {
      client = await prisma.client.create({
        data: {
          clientNumber,
          fullName: c.fullName,
          identification: `INE-${c.folio}`,
          phone: c.phone,
          address: c.address,
          personalReferenceName: c.avalName,
          personalReferencePhone: c.avalPhone,
          personalReferenceAddress: c.avalAddress,
          zoneId: zoneId,
          status: "active",
          notes: `Cobrador asignado: ${c.collector}. Folio original: ${c.folio}`,
        },
      });
      console.log(`   + Cliente creado [${clientNumber}]: ${c.fullName}`);
    }
    clientMap.set(c.folio, client.id);
  }

  // 5. CREDITOS Y CALENDARIO DE CUOTAS
  console.log("\n💳 Generando Créditos y Calendario de Amortización...");
  let creditSeq = 1000;
  for (const item of CREDITS_DATA) {
    const clientId = clientMap.get(item.clientFolio);
    if (!clientId) continue;

    const client = CLIENTS_DATA.find(c => c.folio === item.clientFolio);
    const zoneId = zoneMap.get(client.zone) || zoneMap.get("Izamal");
    const collectorId = profileMap.get(client.collector);

    const principal = item.principal;
    const count = item.count;
    const installmentAmount = item.payment;
    const totalAmount = installmentAmount * count;
    const interest = totalAmount - principal;
    const rate = Math.round((interest / principal) * 10000) / 10000;
    const startDate = parseDateUtc("2026-10-01");
    const endDate = parseDateUtc(item.type === "daily" ? "2026-11-15" : "2026-12-31");

    // Verificar si el cliente ya tiene este crédito
    const existingCredit = await prisma.credit.findFirst({
      where: { clientId, principalAmount: principal, status: "active" }
    });

    if (!existingCredit) {
      const credit = await prisma.credit.create({
        data: {
          clientId,
          zoneId,
          productType: "standard",
          type: item.type,
          principalAmount: principal,
          interestRate: rate,
          interestAmount: interest,
          totalAmount: totalAmount,
          installmentCount: count,
          installmentAmount: installmentAmount,
          weeklyCollectionDay: item.day,
          lateFeeGraceDays: item.type === "daily" ? 2 : 0,
          startDate,
          expectedEndDate: endDate,
          status: item.status,
          createdBy: collectorId,
        }
      });

      // Crear cuotas
      const installmentsToCreate = [];
      const principalPerInstallment = Math.round((principal / count) * 100) / 100;
      const interestPerInstallment = Math.round((installmentAmount - principalPerInstallment) * 100) / 100;
      const scheduledAmount = principalPerInstallment + interestPerInstallment;

      for (let i = 1; i <= count; i++) {
        const dueDate = new Date(startDate);
        if (item.type === "daily") {
          dueDate.setDate(dueDate.getDate() + i);
        } else {
          dueDate.setDate(dueDate.getDate() + (i * 7));
        }

        // Simular las primeras cuotas pagadas si estamos a finales de octubre
        const isPaid = i <= Math.floor(count * 0.3);

        installmentsToCreate.push({
          creditId: credit.id,
          installmentNumber: i,
          dueDate,
          scheduledAmount: scheduledAmount,
          principalComponent: principalPerInstallment,
          interestComponent: interestPerInstallment,
          paidAmount: isPaid ? scheduledAmount : 0,
          status: isPaid ? "paid" : "pending",
          paidAt: isPaid ? dueDate : null,
        });
      }

      await prisma.creditInstallment.createMany({
        data: installmentsToCreate
      });

      console.log(`   + Crédito #${credit.creditNumber}: ${client.fullName} - $${principal} (${item.type.toUpperCase()}, ${count} cuotas de $${installmentAmount})`);
    } else {
      console.log(`   ✓ Crédito ya existente: ${client.fullName} ($${principal})`);
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 ¡MIGRACIÓN DE DATOS DEL CLIENTE COMPLETADA CON ÉXITO!");
  console.log("=======================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Error en la migración:", err);
  process.exit(1);
});
