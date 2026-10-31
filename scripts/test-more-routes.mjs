import https from 'https';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMoreRoutes() {
  const client = await prisma.client.findFirst({ where: { credits: { some: {} } } });
  const credit = await prisma.credit.findFirst();
  const day = await prisma.collectionDay.findFirst();

  const targets = [
    'https://crediflexapp.vercel.app',
    'https://crediflex-seven.vercel.app'
  ];

  const routes = [
    '/creditos/nuevo',
    '/clientes/nuevo',
    `/clientes/${client.id}/editar`,
    `/creditos/${credit.id}/pagos/nuevo`,
    '/estadisticas',
    '/reportes',
    '/configuracion',
    day ? `/jornadas/${day.id}` : '/jornadas'
  ];

  for (const base of targets) {
    console.log(`\n=== Testing ${base} ===`);
    for (const r of routes) {
      await new Promise((res) => {
        https.request(base + r, { headers: { 'Cookie': 'crediflex_access=granted' } }, (resp) => {
          let body = '';
          resp.on('data', d => body += d);
          resp.on('end', () => {
            const isErr = resp.statusCode >= 400 || body.includes('Application error') || body.includes('Digest:');
            console.log(r, '=>', resp.statusCode, isErr ? '❌ ERROR' : '✅ OK');
            if (isErr) {
              const m = body.match(/Digest:\s*([^\s<]+)/);
              console.log('   Digest:', m ? m[1] : 'unknown');
              console.log('   Preview:', body.slice(0, 300));
            }
            res();
          });
        }).end();
      });
    }
  }
}

checkMoreRoutes()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
