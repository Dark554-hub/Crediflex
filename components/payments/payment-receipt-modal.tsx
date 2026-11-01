"use client";

import { Download, Eye, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type PaymentTicketData = {
  paymentId: string;
  creditId: string;
  companyName?: string;
  clientName: string;
  cedula: string;
  address: string;
  zoneName: string;
  paymentDate: string; // DD/MM/YYYY
  abonado: string; // formatted currency e.g. $450.00
  mora: string; // formatted currency e.g. $0.00
  total: string; // formatted currency e.g. $450.00
  saldo: string; // formatted currency e.g. $1,800.00
  cuotasPagadas: string; // e.g. "12.0 de 16.0"
  cuotasAbonadas: string; // e.g. "1.0"
  diaPrestado: string; // DD/MM/YYYY
  reciboGenerado: string; // DD/MM/YYYY
};

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

export async function generateTicketImageBlob(data: PaymentTicketData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const width = 760;
  const height = 1340;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el lienzo de imagen.");
  }

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const marginX = 44;
  const rightX = width - marginX;
  const contentWidth = width - marginX * 2;
  let y = 96;

  // Company title
  ctx.fillStyle = "#3d3d3d";
  ctx.font = "bold 62px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.companyName || "Crediflex", width / 2, y);
  y += 110;

  // Top line
  ctx.strokeStyle = "#141414";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(rightX, y);
  ctx.stroke();
  y += 52;

  // RECIBO DE PAGO
  ctx.fillStyle = "#3d3d3d";
  ctx.font = "bold 40px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("RECIBO DE PAGO", width / 2, y);
  y += 22;

  // Bottom line of header
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(rightX, y);
  ctx.stroke();
  y += 56;

  // CLIENTE
  ctx.fillStyle = "#111111";
  ctx.textAlign = "left";
  ctx.font = "42px Arial, Helvetica, sans-serif";
  ctx.fillText("CLIENTE", marginX, y);
  y += 54;

  ctx.font = "33px Arial, Helvetica, sans-serif";
  const clientLines = wrapCanvasText(ctx, `Sr(a) ${data.clientName}`, contentWidth);
  for (const line of clientLines) {
    ctx.fillText(line, marginX, y);
    y += 44;
  }

  ctx.fillText(`CED: ${data.cedula}`, marginX, y);
  y += 46;

  const addressLines = wrapCanvasText(ctx, `Direccion: ${data.address}`, contentWidth);
  for (const line of addressLines) {
    ctx.fillText(line, marginX, y);
    y += 42;
  }

  ctx.fillText(data.zoneName.toUpperCase(), marginX, y);
  y += 50;

  ctx.fillText(`Fecha: ${data.paymentDate}`, marginX, y);
  y += 88;

  // Centered amounts
  ctx.textAlign = "center";
  ctx.font = "34px Arial, Helvetica, sans-serif";
  ctx.fillText(`ABONADO: ${data.abonado}`, width / 2, y);
  y += 52;

  ctx.fillText(`Intereses/Mora: ${data.mora}`, width / 2, y);
  y += 52;

  ctx.fillText(`TOTAL:${data.total}`, width / 2, y);
  y += 52;

  ctx.fillText(`SALDO: ${data.saldo}`, width / 2, y);
  y += 56;

  // Divider before cuotas
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(rightX, y);
  ctx.stroke();
  y += 48;

  // Left-Right rows
  const drawRow = (label: string, val: string) => {
    ctx.textAlign = "left";
    ctx.font = "33px Arial, Helvetica, sans-serif";
    ctx.fillText(label, marginX, y);
    ctx.textAlign = "right";
    ctx.fillText(val, rightX, y);
    y += 50;
  };

  drawRow("Cuotas Pagadas:", data.cuotasPagadas);
  drawRow("Cuotas abonadas:", data.cuotasAbonadas);
  drawRow("Dia Prestado:", data.diaPrestado);
  y -= 26;

  // Bottom divider
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(rightX, y);
  ctx.stroke();
  y += 50;

  ctx.textAlign = "left";
  ctx.font = "33px Arial, Helvetica, sans-serif";
  ctx.fillText("Gracias por confiar en nosotros.", marginX, y);
  y += 48;
  ctx.fillText(`Recibo generado: ${data.reciboGenerado}`, marginX, y);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("No se pudo generar la imagen del recibo."));
      }
    }, "image/png");
  });
}

export function PaymentReceiptActions({
  data,
  autoOpen = false,
}: {
  data: PaymentTicketData;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [sharingImage, setSharingImage] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen]);

  const pdfUrl = `/creditos/${data.creditId}/pagos/${data.paymentId}/comprobante`;

  async function handleShareImage() {
    setSharingImage(true);
    setFeedback(null);
    try {
      const blob = await generateTicketImageBlob(data);
      const filename = `recibo-${data.paymentId.slice(0, 8)}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Recibo de Pago",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setFeedback("Imagen descargada lista para adjuntar en WhatsApp.");
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        setFeedback("No se pudo compartir la imagen.");
      }
    } finally {
      setSharingImage(false);
    }
  }

  async function handleSharePdf() {
    setSharingPdf(true);
    setFeedback(null);
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const filename = `recibo-${data.paymentId.slice(0, 8)}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Recibo de Pago PDF",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setFeedback("PDF descargado listo para adjuntar en WhatsApp.");
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        setFeedback("No se pudo compartir el PDF.");
      }
    } finally {
      setSharingPdf(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto"
        >
          <Eye size={17} aria-hidden />
          Comprobante
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleShareImage}
          disabled={sharingImage}
          className="w-full sm:w-auto"
        >
          <Share2 size={17} aria-hidden />
          {sharingImage ? "Generando..." : "Compartir Recibo"}
        </Button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200"
              aria-label="Cerrar recibo"
            >
              <X size={18} />
            </button>

            {/* Visual Receipt matching the exact screenshot structure */}
            <div className="mx-auto max-w-[330px] bg-white px-2 py-3 font-sans text-ink">
              <h2 className="text-center text-3xl font-bold tracking-tight text-stone-700">
                {data.companyName || "Crediflex"}
              </h2>

              <div className="mt-6 border-y-2 border-stone-900 py-1.5 text-center">
                <p className="text-lg font-bold tracking-wide text-stone-700">RECIBO DE PAGO</p>
              </div>

              <div className="mt-3 space-y-1 text-sm text-stone-950">
                <p className="text-base font-normal uppercase">CLIENTE</p>
                <p className="text-[15px] leading-snug">Sr(a) {data.clientName}</p>
                <p className="text-[15px]">CED: {data.cedula}</p>
                <p className="text-[15px] leading-snug">Direccion: {data.address}</p>
                <p className="text-[15px] uppercase">{data.zoneName}</p>
                <p className="pt-0.5 text-[15px]">Fecha: {data.paymentDate}</p>
              </div>

              <div className="my-5 space-y-1 text-center text-[15px] text-stone-950">
                <p>ABONADO: {data.abonado}</p>
                <p>Intereses/Mora: {data.mora}</p>
                <p>TOTAL:{data.total}</p>
                <p>SALDO: {data.saldo}</p>
              </div>

              <div className="border-y-2 border-stone-900 py-2 text-[15px] text-stone-950">
                <div className="flex justify-between py-0.5">
                  <span>Cuotas Pagadas:</span>
                  <span>{data.cuotasPagadas}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Cuotas abonadas:</span>
                  <span>{data.cuotasAbonadas}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Dia Prestado:</span>
                  <span>{data.diaPrestado}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-[15px] text-stone-950">
                <p>Gracias por confiar en nosotros.</p>
                <p>Recibo generado: {data.reciboGenerado}</p>
              </div>
            </div>

            {feedback ? (
              <p className="mt-3 rounded-md bg-mint/60 px-3 py-2 text-center text-xs font-semibold text-ink">
                {feedback}
              </p>
            ) : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleShareImage}
                disabled={sharingImage}
                className="w-full"
              >
                <Share2 size={17} aria-hidden />
                {sharingImage ? "Compartiendo..." : "Compartir Imagen"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSharePdf}
                disabled={sharingPdf}
                className="w-full"
              >
                <Download size={17} aria-hidden />
                {sharingPdf ? "Preparando..." : "Compartir PDF"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
