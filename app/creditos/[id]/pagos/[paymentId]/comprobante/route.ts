import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { formatCurrency } from "@/lib/money";
import { getPaymentReceipt } from "@/lib/payments";

const methodLabels = {
  cash: "Efectivo",
  transfer: "Transferencia",
  other: "Otro",
};

const typeLabels = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function drawLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 10,
) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0.13, 0.14, 0.12),
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string; paymentId: string } },
) {
  const payment = await getPaymentReceipt(params.paymentId);

  if (!payment || payment.creditId !== params.id) {
    return new NextResponse("Comprobante no encontrado", { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const now = new Date();
  const allocations = payment.allocations;
  const lateFeeTotal = allocations.reduce((total, item) => total + Number(item.lateFeeApplied), 0);
  const ordinaryTotal = allocations.reduce((total, item) => total + Number(item.amountApplied), 0);
  const paidAmount = payment.credit.installments.reduce(
    (total, installment) => total + Number(installment.paidAmount),
    0,
  );
  const pendingAmount = Math.max(Number(payment.credit.totalAmount) - paidAmount, 0);
  const installmentNumbers = allocations
    .map((item) => `#${item.installment.installmentNumber}`)
    .join(", ");

  page.drawRectangle({
    x: 0,
    y: 730,
    width: 612,
    height: 62,
    color: rgb(0.13, 0.14, 0.12),
  });
  page.drawText("Crediflex", {
    x: 42,
    y: 756,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Comprobante de pago", {
    x: 410,
    y: 760,
    size: 11,
    font: regular,
    color: rgb(1, 1, 1),
  });

  drawLine(page, `Folio: ${payment.id.slice(0, 8).toUpperCase()}`, 42, 700, bold, 12);
  drawLine(page, `Emitido: ${formatDateTime(now)}`, 360, 700, regular, 10);

  page.drawLine({
    start: { x: 42, y: 682 },
    end: { x: 570, y: 682 },
    thickness: 1,
    color: rgb(0.82, 0.8, 0.74),
  });

  let y = 655;
  const rows = [
    ["Cliente", payment.client.fullName],
    ["Zona", payment.credit.zone.name],
    ["Fecha del pago", formatDate(payment.paymentDate)],
    ["Credito", `${typeLabels[payment.credit.type]} - ${payment.credit.installmentCount} pagos`],
    ["Metodo", methodLabels[payment.method]],
    ["Cuota(s) aplicada(s)", installmentNumbers || "Sin asignacion"],
    ["Monto ordinario aplicado", formatCurrency(ordinaryTotal)],
    ["Mora aplicada", lateFeeTotal > 0 ? formatCurrency(lateFeeTotal) : "No se aplico mora"],
    ["Total pagado", formatCurrency(payment.amount)],
    ["Saldo pendiente despues del pago", formatCurrency(pendingAmount)],
  ];

  for (const [label, value] of rows) {
    drawLine(page, label, 42, y, bold, 10);
    drawLine(page, value, 230, y, regular, 10);
    y -= 28;
  }

  page.drawRectangle({
    x: 42,
    y: 88,
    width: 528,
    height: 74,
    borderColor: rgb(0.82, 0.8, 0.74),
    borderWidth: 1,
    color: rgb(0.96, 0.95, 0.92),
  });
  drawLine(page, "Comprobante generado por Crediflex.", 62, 128, regular, 9);
  drawLine(page, "Conserve este folio para cualquier aclaracion.", 62, 108, regular, 9);

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"comprobante-${payment.id.slice(0, 8)}.pdf\"`,
    },
  });
}
