import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

export type PdfReportColumn<T = Record<string, unknown>> = {
  header: string;
  key: keyof T | string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: (row: T) => string;
  badge?: (row: T) => { label: string; tone: PdfReportSummaryTone };
};

type PdfReportSummaryTone = "primary" | "success" | "danger" | "warning" | "neutral";

export type PdfReportOptions<T = Record<string, unknown>> = {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: PdfReportColumn<T>[];
  rows: T[];
  filters?: Array<{ label: string; value: string | number | boolean }>;
  summaryCards?: Array<{ label: string; value: string | number; tone?: PdfReportSummaryTone }>;
  generatedBy?: string;
  generatedAt?: Date;
  orientation?: "portrait" | "landscape";
  footerText?: string;
  emptyMessage?: string;
  showFilters?: boolean;
  executiveSummary?: string;
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

const toneColors: Record<PdfReportSummaryTone, [number, number, number]> = {
  primary: [122, 61, 240],
  success: [46, 125, 50],
  danger: [198, 40, 40],
  warning: [237, 108, 2],
  neutral: [80, 86, 96],
};

const toneSoftColors: Record<PdfReportSummaryTone, [number, number, number]> = {
  primary: [239, 232, 255],
  success: [230, 244, 234],
  danger: [253, 232, 232],
  warning: [255, 243, 224],
  neutral: [241, 243, 246],
};

export function generatePdfReport<T extends Record<string, unknown>>({
  title,
  subtitle,
  fileName,
  columns,
  rows,
  filters = [],
  summaryCards = [],
  generatedBy,
  generatedAt = new Date(),
  orientation = "landscape",
  footerText = "Reporte generado automaticamente por el sistema",
  emptyMessage = "No se encontraron registros con los filtros seleccionados.",
  showFilters = true,
  executiveSummary,
}: PdfReportOptions<T>): Blob {
  const doc = new jsPDF({ orientation, unit: "pt", format: "letter" });
  doc.setProperties({ title: fileName });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const generatedText = formatDateTime(generatedAt);

  doc.setFillColor(111, 50, 220);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setFillColor(91, 38, 175);
  doc.triangle(pageWidth * 0.62, 0, pageWidth, 0, pageWidth, 96, "F");
  doc.setDrawColor(143, 101, 238);
  doc.setLineWidth(0.8);
  doc.circle(pageWidth - 42, 22, 52, "S");
  doc.circle(pageWidth - 96, 84, 34, "S");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, margin, 34);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(subtitle, margin, 54);
  }
  doc.setFontSize(9.5);
  doc.text(`Generado el ${generatedText}`, margin, 74);
  if (generatedBy) {
    doc.text(`Generado por: ${generatedBy}`, pageWidth - margin, 74, { align: "right" });
  }

  let cursorY = 118;
  doc.setTextColor(45, 45, 45);
  if (summaryCards.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Resumen", margin, cursorY);
    cursorY += 12;

    const gap = 10;
    const cardsPerRow = Math.min(summaryCards.length, 5);
    const cardWidth = (pageWidth - margin * 2 - gap * (cardsPerRow - 1)) / cardsPerRow;
    const cardHeight = 48;
    summaryCards.forEach((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = margin + col * (cardWidth + gap);
      const y = cursorY + row * (cardHeight + 10);
      const color = toneColors[card.tone || "neutral"];
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, cardWidth, cardHeight, 8, 8, "F");
      doc.setDrawColor(226, 226, 232);
      doc.roundedRect(x, y, cardWidth, cardHeight, 8, 8, "S");
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x + 7, y + 8, 3, cardHeight - 16, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 106, 116);
      doc.text(card.label, x + 18, y + 17, { maxWidth: cardWidth - 28 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(String(card.value), x + 18, y + 38, { maxWidth: cardWidth - 28 });
    });
    cursorY += Math.ceil(summaryCards.length / cardsPerRow) * (cardHeight + 10) + 14;
  }

  if (showFilters && filters.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text("Filtros aplicados", margin, cursorY);
    cursorY += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    filters.forEach(({ label, value }) => {
      doc.text(`${label}: ${safeText(value)}`, margin, cursorY);
      cursorY += 12;
    });
    cursorY += 4;
  }

  if (executiveSummary) {
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 34, 8, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(98, 103, 113);
    doc.text(executiveSummary, margin + 14, cursorY + 21, {
      maxWidth: pageWidth - margin * 2 - 28,
    });
    cursorY += 50;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(45, 45, 45);
  doc.text("Listado de visitantes", margin, cursorY);
  cursorY += 14;

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
        if (column.badge) return column.badge(row).label;
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
      theme: "plain",
      head,
      body,
      startY: cursorY + 10,
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      styles: {
        font: "helvetica",
        fontSize: 8.8,
        textColor: [42, 44, 49],
        cellPadding: { top: 8, right: 7, bottom: 8, left: 7 },
        overflow: "linebreak",
        valign: "middle",
        lineColor: [235, 235, 240],
        lineWidth: 0,
      },
      headStyles: {
        fillColor: [55, 35, 85],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.8,
        minCellHeight: 28,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 252],
      },
      columnStyles,
      didParseCell: (data) => {
        if (data.section === "body") {
          const column = columns[data.column.index];
          if (column?.badge) {
            data.cell.text = [""];
          }
          data.cell.styles.lineWidth = { top: 0.2, right: 0, bottom: 0.2, left: 0 };
        }
        if (data.section === "head") {
          data.cell.styles.lineWidth = 0;
        }
      },
      didDrawPage: () => {
        doc.setDrawColor(224, 224, 228);
        doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
      },
      didDrawCell: (data) => {
        if (data.section === "body") {
          const column = columns[data.column.index];
          const sourceRow = rows[data.row.index];
          if (column?.badge && sourceRow) {
            const badge = column.badge(sourceRow);
            const soft = toneSoftColors[badge.tone];
            const strong = toneColors[badge.tone];
            const text = badge.label;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.3);
            const textWidth = doc.getTextWidth(text);
            const badgeWidth = Math.min(data.cell.width - 8, textWidth + 16);
            const badgeHeight = 16;
            const x = data.cell.x + (data.cell.width - badgeWidth) / 2;
            const y = data.cell.y + (data.cell.height - badgeHeight) / 2;
            doc.setFillColor(soft[0], soft[1], soft[2]);
            doc.roundedRect(x, y, badgeWidth, badgeHeight, 7, 7, "F");
            doc.setTextColor(strong[0], strong[1], strong[2]);
            doc.text(text, x + badgeWidth / 2, y + 10.8, { align: "center" });
          }
          doc.setDrawColor(235, 235, 240);
          doc.setLineWidth(0.2);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
        if (data.section === "head") {
          doc.setDrawColor(55, 35, 85);
          doc.setLineWidth(0.5);
        }
      },
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.setDrawColor(224, 224, 228);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    doc.text(footerText, margin, pageHeight - 20);
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
