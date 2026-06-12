# Crediflex

MVP de gestion de creditos y cobranza para un prestamista personal en Yucatan.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma
- Supabase PostgreSQL
- Vercel

## Configuracion local

1. Instalar dependencias:

```powershell
npm install
```

2. Crear `.env.local` usando `.env.example` como base.

3. Generar Prisma:

```powershell
npm run prisma:generate
```

4. Iniciar:

```powershell
npm run dev
```

5. Abrir:

```text
http://localhost:3000
```

## Base de datos

Los SQL de Supabase estan en:

```text
database/supabase
```

Orden aplicado:

1. `schema.sql`
2. `002_mobile_fields.sql`
3. `003_credit_weekly_renewal.sql`
4. `004_credit_express.sql`
5. `005_clear_overdue_for_demo.sql`

## Datos demo

Para crear datos realistas de Motul e Izamal:

```powershell
npm run seed:demo
```

La semilla evita duplicar clientes `MVP-001` a `MVP-010`.

## Revision con cliente

Usar la guia:

```text
docs/MVP_REVISION_CLIENTE.md
```

## Flujos principales

- Clientes: alta, edicion, perfil y metricas.
- Creditos normales: diario/semanal.
- Creditos express: $500 a $3,000, 5% semanal, 4 pagos.
- Cobros del dia: agrupado por cliente y luego por credito.
- Pagos: registro y comprobante PDF.
- Liquidacion: calculo con descuento por pago anticipado.
- Dashboard: resumen de cartera y accesos rapidos.

## Deploy en Vercel

Variables requeridas:

```text
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Comando de build:

```powershell
npm run build
```

## Notas de operacion

- Los creditos liquidados no aparecen por defecto en la lista principal.
- Para verlos, usar el filtro `Liquidado`.
- Desde el perfil del cliente se pueden renovar creditos liquidados.
- Las fechas se manejan con referencia a `America/Mexico_City`.
