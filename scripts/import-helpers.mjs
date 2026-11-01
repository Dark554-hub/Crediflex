import fs from "fs";

// Mapeo canónico de nombres limpios y con acentos
const CANONICAL_NAMES = {
  "norma del socorro medina matos": "Norma del Socorro Medina Matos",
  "nelsy del rosario lugo sabido": "Nelsy del Rosario Lugo Sabido",
  "roger ambrosio espadas sosa": "Roger Ambrosio Espadas Sosa",
  "paula marisela duarte castillo": "Paula Marisela Duarte Castillo",
  "edgar massa burgos": "Edgar Massa Burgos",
  "anyely dayane castillo basto": "Anyely Dayane Castillo Basto",
  "rosa elena canche chi": "Rosa Elena Canché Chi",
  "andres dzul koyoc": "Andrés Dzul Koyoc",
  "sergio antonio pacheco cardeña": "Sergio Antonio Pacheco Cardeña",
  "jose enrique perera dzul": "José Enrique Perera Dzul",
  "jose gaspar alpuche cabrera": "José Gaspar Alpuche Cabrera",
  "cristian reynaldo eb poot": "Cristian Reynaldo Eb Poot",
  "miguel angel raz gamboa": "Miguel Ángel Raz Gamboa",
  "joel gabriel chale uicab": "Joel Gabriel Chalé Uicab",
  "jorge albertopool canul": "Jorge Alberto Pool Canul",
  "jorge alberto pool canul": "Jorge Alberto Pool Canul",
  "roberto martin pech dzib": "Roberto Martín Pech Dzib",
  "jose elias may madera": "José Elías May Madera",
  "alma delia uitz": "Alma Delia Uitz Araujo",
  "alma delia uitz araujo": "Alma Delia Uitz Araujo",
  "leonardo daniel mex hau": "Leonardo Daniel Mex Hau",
  "jazmin karina pacheco parra": "Jazmín Karina Pacheco Parra",
  "edgar efren mena garcia": "Edgar Efrén Mena García",
  "antonio de jesus koyoc canche": "Antonio de Jesús Koyoc Canché",
  "elias de la cruz raz gamboa": "Elías de la Cruz Raz Gamboa",
  "neyla selene pool adrian": "Neyla Selene Pool Adrián",
  "leydi leticia cetz cauich": "Leydi Leticia Cetz Cauich",
  "wendy rubi canche chi": "Wendy Rubí Canché Chi",
  "fabian lugo quijano": "Fabián Lugo Quijano",
  "julio velazquez cen": "Julio Velázquez Cen",
  "maria de lourdes rodriguez aldana": "María de Lourdes Rodríguez Aldana",
  "edwin ariel ake chale": "Edwin Ariel Aké Chalé",
  "ada luz canto mis": "Ada Luz Canto Mis",
  "maria esther sabido pat": "María Esther Sabido Pat",
  "wesly otoniel cen chab": "Wesly Otoniel Cen Chab",
  "manuela de jesus pech dzib": "Manuela de Jesús Pech Dzib",
  "roger samuel cox martinez": "Roger Samuel Cox Martínez",
  "regina noemi kuk mex": "Regina Noemí Kuk Mex",
  "ana maria salas cocom": "Ana María Salas Cocom",
  "antonia carolina delgado cruz": "Antonia Carolina Delgado Cruz",
  "fabian alejandro lugo sabido": "Fabián Alejandro Lugo Sabido",
  "william javier moreno baas": "William Javier Moreno Baas",
  "beatriz adriana sabido pat": "Beatriz Adriana Sabido Pat",
  "felipa de jesus balam castillo": "Felipa de Jesús Balam Castillo",
  "diana leticia cetz cauich": "Diana Leticia Cetz Cauich",
  "jorge luis isidro ordoñez tho": "Jorge Luis Isidro Ordóñez Tho",
  "julian alejandro castillo burgos": "Julián Alejandro Castillo Burgos",
  "daniel concepcion pech dzib": "Daniel Concepción Pech Dzib",
  "ladislao eddie maza lopez": "Ladislao Eddie Maza López",
  "edgar reyes cruz sanchez": "Edgar Reyes Cruz Sánchez",
  "mirna guadalupe mex barcelo": "Mirna Guadalupe Mex Barceló",
  "miguel angel chuc cetz": "Miguel Ángel Chuc Cetz",
  "rogelio kuk mex": "Rogelio Kuk Mex",
  "maria jaqueline ciau cauich": "María Jaqueline Ciau Cauich",
  "jose alfredo may dominguez": "José Alfredo May Domínguez",
  "jose angel ku canche": "José Ángel Ku Canché",
  "geni beatriz basto herrera": "Geni Beatriz Basto Herrera",
  "martin concepcion pech chan": "Martín Concepción Pech Chan",
  "rubi dianeli chi montalvo": "Rubí Dianeli Chi Montalvo",
  "maria eloisa mex aldana": "María Eloísa Mex Aldana",
  "isidro armin ruiz maldonado": "Isidro Armin Ruiz Maldonado",
  "flory noemi may matu": "Flory Noemí May Matú",
  "cesar mariano mex barcelo": "César Mariano Mex Barceló",
  "jose octavio koyoc canche": "José Octavio Koyoc Canché",
  "cesar gaspar montalvo aranda": "César Gaspar Montalvo Aranda",
  "wilbert uicab dzul": "Wilbert Uicab Dzul",
};

export function cleanClientName(rawName) {
  const normKey = rawName.toLowerCase().replace(/\s+/g, " ").trim();
  if (CANONICAL_NAMES[normKey]) {
    return CANONICAL_NAMES[normKey];
  }
  // Title case fallback
  return normKey
    .split(" ")
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && ["de", "del", "la", "las", "los", "y"].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function cleanAddress(raw) {
  if (!raw) return "";
  let addr = raw.trim().replace(/\s+/g, " ");
  // Capitalize nicely
  addr = addr
    .replace(/^c\./i, "C.")
    .replace(/^c(?=\d)/i, "C. ")
    .replace(/\bs\/n\b/i, "S/N")
    .replace(/\bfrac\./i, "Fracc.")
    .replace(/\by\b/gi, "y");
  return addr;
}

export function cleanZone(raw) {
  if (!raw) return "Izamal";
  const z = raw.trim().toLowerCase();
  if (z.includes("sitilpech")) return "Sitilpech";
  if (z.includes("motul")) return "Motul";
  return "Izamal";
}

const monthMap = {
  "ene": 0, "feb": 1, "mar": 2, "abr": 3, "may": 4, "jun": 5,
  "jul": 6, "ago": 7, "sep": 8, "oct": 9, "nov": 10, "dic": 11
};

export function parseCustomDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  const day = parseInt(parts[0], 10);
  const monStr = parts[1].toLowerCase().slice(0, 3);
  const month = monthMap[monStr];
  let year = 2026;
  if (parts.length === 3) {
    const yr = parseInt(parts[2], 10);
    year = yr < 100 ? 2000 + yr : yr;
  }
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

export function calcDueDate(startDate, freq, index) {
  const d = new Date(startDate);
  if (freq === "daily") {
    let count = 0;
    while (count < index) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (d.getUTCDay() !== 0) { // Omitir domingos
        count++;
      }
    }
    return d;
  } else if (freq === "biweekly") {
    // 01 y 16 de cada mes
    const startDay = d.getUTCDate();
    const startMonth = d.getUTCMonth();
    const startYear = d.getUTCFullYear();
    const isFirstHalf = startDay <= 15;
    const totalHalfMonths = (isFirstHalf ? 0 : 1) + index;
    const targetMonth = startMonth + Math.floor(totalHalfMonths / 2);
    const targetDay = totalHalfMonths % 2 === 0 ? 1 : 16;
    return new Date(Date.UTC(startYear, targetMonth, targetDay, 12, 0, 0));
  } else {
    // Semanal (+7 dias)
    d.setUTCDate(d.getUTCDate() + (index * 7));
    return d;
  }
}
