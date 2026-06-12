import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

export type PdfReportColumn<T = Record<string, unknown>> = {
  header: string;
  key: keyof T | string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: (row: T) => string;
};

export type PdfReportOptions<T = Record<string, unknown>> = {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: PdfReportColumn<T>[];
  rows: T[];
  filters?: Array<{ label: string; value: string | number | boolean }>;
  generatedBy?: string;
  orientation?: "portrait" | "landscape";
  footerText?: string;
  emptyMessage?: string;
};

const formatDateTime = (date = new Date()) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

const safeText = (value: unknown) => String(value ?? "").trim() || "--";

export function generatePdfReport<T extends Record<string, unknown>>({
  title,
  subtitle,
  fileName,
  columns,
  rows,
  filters = [],
  generatedBy,
  orientation = "landscape",
  footerText = "Reporte generado automaticamente por el sistema",
  emptyMessage = "No se encontraron registros con los filtros seleccionados.",
}: PdfReportOptions<T>): Blob {
  const doc = new jsPDF({ orientation, unit: "pt", format: "letter" });
  doc.setProperties({ title: fileName });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const generatedAt = formatDateTime();

  doc.setFillColor(122, 61, 240);
  doc.rect(0, 0, pageWidth, 86, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, 34);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, margin, 52);
  }
  doc.setFontSize(9);
  doc.text(`Generado el: ${generatedAt}`, margin, 70);
  if (generatedBy) {
    doc.text(`Generado por: ${generatedBy}`, pageWidth - margin, 70, { align: "right" });
  }

  let cursorY = 110;
  doc.setTextColor(45, 45, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Filtros aplicados", margin, cursorY);
  cursorY += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const filterLines = [
    ...filters.map(({ label, value }) => `${label}: ${safeText(value)}`),
    `Total de registros: ${rows.length}`,
  ];
  filterLines.forEach((line) => {
    doc.text(line, margin, cursorY);
    cursorY += 12;
  });

  if (!rows.length) {
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margin, cursorY + 12, pageWidth - margin * 2, 70, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(emptyMessage, pageWidth / 2, cursorY + 52, { align: "center" });
  } else {
    const head = [columns.map((column) => column.header)];
    const body = rows.map((row) =>
      columns.map((column) => {
        if (column.format) return column.format(row);
        return safeText(row[column.key as keyof T]);
      })
    );
    const columnStyles: NonNullable<UserOptions["columnStyles"]> = {};
    columns.forEach((column, index) => {
      columnStyles[index] = {
        cellWidth: column.width,
        halign: column.align || "left",
      };
    });

    autoTable(doc, {
      head,
      body,
      startY: cursorY + 10,
      margin: { left: margin, right: margin },
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 5,
        overflow: "linebreak",
        valign: "middle",
        lineColor: [220, 220, 220],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [74, 74, 74],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles,
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(footerText, margin, pageHeight - 22);
    doc.text(`Pagina ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 22, {
      align: "right",
    });
  }

  return new File([doc.output("blob")], fileName, { type: "application/pdf" });
}

export function openPdfBlob(blob: Blob, targetWindow?: Window | null) {
  const url = URL.createObjectURL(blob);
  if (targetWindow) {
    targetWindow.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
