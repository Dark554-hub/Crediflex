import { NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { formatCurrency } from "@/lib/money";
import { getPaymentReceipt } from "@/lib/payments";

function formatShortDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 11,
  color = rgb(0.08, 0.08, 0.08),
) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.08, 0.08, 0.08),
) {
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  const x = Math.max((pageWidth - textWidth) / 2, 16);
  drawText(page, text, x, y, font, size, color);
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.08, 0.08, 0.08),
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  drawText(page, text, rightX - textWidth, y, font, size, color);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function getOverduePdfColors(count: number) {
  if (count === 0) {
    return {
      text: rgb(0.08, 0.5, 0.24), // green
      bg: rgb(0.86, 0.99, 0.91),
    };
  }
  if (count <= 5) {
    return {
      text: rgb(0.71, 0.33, 0.04), // amber/yellow
      bg: rgb(1.0, 0.95, 0.78),
    };
  }
  return {
    text: rgb(0.73, 0.11, 0.11), // red
    bg: rgb(1.0, 0.89, 0.89),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string; paymentId: string } },
) {
  const payment = await getPaymentReceipt(params.paymentId);

  if (!payment || payment.creditId !== params.id) {
    return new NextResponse("Comprobante no encontrado", { status: 404 });
  }

  const pageWidth = 280;
  const pageHeight = 545;
  const marginX = 18;
  const rightX = pageWidth - marginX;
  const contentWidth = pageWidth - marginX * 2;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const allocations = payment.allocations;
  const lateFeeTotal = allocations.reduce((total, item) => total + Number(item.lateFeeApplied), 0);
  const ordinaryTotal = allocations.reduce((total, item) => total + Number(item.amountApplied), 0);

  // Calculate cumulative ordinary paid up to this payment
  const paymentsUpToThis = payment.credit.payments.filter(
    (item) => new Date(item.createdAt).getTime() <= new Date(payment.createdAt).getTime(),
  );
  const cumulativeOrdinaryPaid = paymentsUpToThis.reduce(
    (sum, p) =>
      sum + p.allocations.reduce((allocSum, alloc) => allocSum + Number(alloc.amountApplied), 0),
    0,
  );

  // Calculate overdue installments as of the payment date
  const paidByInstallment = new Map<string, number>();
  for (const p of paymentsUpToThis) {
    for (const alloc of p.allocations) {
      paidByInstallment.set(
        alloc.installmentId,
        (paidByInstallment.get(alloc.installmentId) ?? 0) + Number(alloc.amountApplied),
      );
    }
  }
  const isSettlementPayment =
    Boolean(payment.notes?.toLowerCase().includes("liquidacion")) ||
    payment.credit.status === "settled";
  const paymentDateTime = new Date(payment.paymentDate).getTime();
  const pagosAtrasados = isSettlementPayment
    ? 0
    : payment.credit.installments.filter((inst) => {
        const dueTime = new Date(inst.dueDate).getTime();
        const paid = paidByInstallment.get(inst.id) ?? 0;
        const scheduled = Number(inst.scheduledAmount);
        return dueTime < paymentDateTime && paid + 0.01 < scheduled;
      }).length;

  const totalAmount = Number(payment.credit.totalAmount);
  const pendingBalance = isSettlementPayment ? 0 : Math.max(totalAmount - cumulativeOrdinaryPaid, 0);
  const installmentAmount = Number(payment.credit.installmentAmount) || 1;
  const totalInstallments = Number(payment.credit.installmentCount);
  const paidInstallments = isSettlementPayment
    ? totalInstallments
    : Math.min(Math.round(cumulativeOrdinaryPaid / installmentAmount), totalInstallments);
  const abonadasInstallments = Math.max(Math.round(ordinaryTotal / installmentAmount), 1);

  let y = pageHeight - 40;

  // Brand title
  drawCenteredText(page, "Crediflex", y, bold, 24, rgb(0.24, 0.24, 0.24));
  y -= 42;

  // Top divider
  page.drawLine({
    start: { x: marginX, y },
    end: { x: rightX, y },
    thickness: 1.2,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 19;

  drawCenteredText(page, "RECIBO DE PAGO", y, bold, 14, rgb(0.24, 0.24, 0.24));
  y -= 8;

  // Bottom divider of header
  page.drawLine({
    start: { x: marginX, y },
    end: { x: rightX, y },
    thickness: 1.2,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  // CLIENTE section
  drawText(page, "CLIENTE", marginX, y, regular, 14);
  y -= 20;

  const clientLines = wrapText(`Sr(a) ${payment.client.fullName}`, regular, 11, contentWidth);
  for (const line of clientLines) {
    drawText(page, line, marginX, y, regular, 11);
    y -= 15;
  }

  const cedula = payment.client.identification || payment.client.clientNumber || "-";
  drawText(page, `CED: ${cedula}`, marginX, y, regular, 11);
  y -= 16;

  const addressLines = wrapText(`Direccion: ${payment.client.address}`, regular, 11, contentWidth);
  for (const line of addressLines) {
    drawText(page, line, marginX, y, regular, 11);
    y -= 15;
  }

  drawText(page, payment.credit.zone.name.toUpperCase(), marginX, y, regular, 11);
  y -= 18;

  drawText(page, `Fecha: ${formatShortDate(payment.paymentDate)}`, marginX, y, regular, 11);
  y -= 32;

  // Amounts centered block
  drawCenteredText(page, `ABONADO: ${formatCurrency(ordinaryTotal)}`, y, regular, 12);
  y -= 18;
  drawCenteredText(page, `Intereses/Mora: ${formatCurrency(lateFeeTotal)}`, y, regular, 12);
  y -= 18;
  drawCenteredText(page, `TOTAL: ${formatCurrency(payment.amount)}`, y, bold, 12);
  y -= 18;
  drawCenteredText(page, `SALDO: ${formatCurrency(pendingBalance)}`, y, regular, 12);
  y -= 22;

  // Divider before installments
  page.drawLine({
    start: { x: marginX, y },
    end: { x: rightX, y },
    thickness: 1.2,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 17;

  // Installments & Dates rows
  drawText(page, "Cuotas Pagadas:", marginX, y, regular, 11);
  drawRightText(
    page,
    `${Math.round(paidInstallments)} de ${Math.round(totalInstallments)}`,
    rightX,
    y,
    regular,
    11,
  );
  y -= 17;

  drawText(page, "Cuotas abonadas:", marginX, y, regular, 11);
  drawRightText(page, String(Math.round(abonadasInstallments)), rightX, y, regular, 11);
  y -= 18;

  // Pagos atrasados row with traffic-light color
  const overdueColors = getOverduePdfColors(pagosAtrasados);
  const overdueText = String(pagosAtrasados);
  const overdueWidth = Math.max(bold.widthOfTextAtSize(overdueText, 11) + 12, 22);
  page.drawRectangle({
    x: rightX - overdueWidth,
    y: y - 3,
    width: overdueWidth,
    height: 15,
    color: overdueColors.bg,
  });
  drawText(page, "Pagos atrasados:", marginX, y, bold, 11, overdueColors.text);
  drawText(
    page,
    overdueText,
    rightX - overdueWidth + (overdueWidth - bold.widthOfTextAtSize(overdueText, 11)) / 2,
    y,
    bold,
    11,
    overdueColors.text,
  );
  y -= 18;

  drawText(page, "Dia Prestado:", marginX, y, regular, 11);
  drawRightText(page, formatShortDate(payment.credit.startDate), rightX, y, regular, 11);
  y -= 8;

  // Bottom divider
  page.drawLine({
    start: { x: marginX, y },
    end: { x: rightX, y },
    thickness: 1.2,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 18;

  drawText(page, "Gracias por confiar en nosotros.", marginX, y, regular, 11);
  y -= 16;
  drawText(page, `Recibo generado: ${formatShortDate(payment.paymentDate)}`, marginX, y, regular, 11);

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"comprobante-${payment.id.slice(0, 8)}.pdf\"`,
    },
  });
}
