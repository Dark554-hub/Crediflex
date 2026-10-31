import https from 'https';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDynamic() {
  const client = await prisma.client.findFirst({ where: { credits: { some: {} } } });
  const credit = await prisma.credit.findFirst();
  const clientNoCredit = await prisma.client.findFirst({ where: { credits: { none: {} } } });

  console.log('Testing with client (with credit):', client?.id, client?.fullName);
  console.log('Testing with client (no credit):', clientNoCredit?.id, clientNoCredit?.fullName);
  console.log('Testing with credit:', credit?.id, credit?.creditNumber);

  const targets = [
    'https://crediflexapp.vercel.app',
    'https://crediflex-seven.vercel.app'
  ];

  for (const base of targets) {
    console.log(`\n--- Checking on ${base} ---`);
    const dynamicRoutes = [
      `/clientes/${client.id}`,
      `/clientes/${clientNoCredit.id}`,
      `/cobros/${client.id}`,
      `/cobros/${clientNoCredit.id}`,
      `/creditos/${credit.id}`
    ];

    for (const r of dynamicRoutes) {
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
              console.log('   Body preview:', body.slice(0, 400));
            }
            res();
          });
        }).end();
      });
    }
  }
}

checkDynamic()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
