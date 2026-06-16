import * as XLSX from "xlsx-js-style";

type ExcelCell = string | number | boolean | Date | null | undefined;

export type ExcelSheet = {
  name: string;
  rows: ExcelCell[][];
  columnWidths?: number[];
};

type CellStyle = Record<string, unknown>;

type XlsxRuntime = typeof XLSX & { default?: typeof XLSX };

const palette = {
  purple: "5F00D6",
  purpleDark: "372355",
  purpleSoft: "F2EAFE",
  grayText: "5F6472",
  grayLine: "D9D9E3",
  graySoft: "F7F5FB",
  white: "FFFFFF",
};

function safeSheetName(name: string) {
  return String(name || "Reporte")
    .replace(/[\\/?*[\]:]/g, " ")
    .trim()
    .slice(0, 31) || "Reporte";
}

function getXlsxRuntime() {
  const candidates = [
    XLSX,
    (XLSX as XlsxRuntime).default,
    (globalThis as typeof globalThis & { XLSX?: typeof XLSX }).XLSX,
  ].filter(Boolean) as typeof XLSX[];
  const runtime = candidates.find((candidate) => typeof candidate.write === "function");

  if (!runtime) {
    throw new Error("No se pudo inicializar el generador de Excel.");
  }

  return runtime;
}

function encodeColumn(columnIndex: number) {
  let column = "";
  let value = columnIndex + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - remainder - 1) / 26);
  }

  return column;
}

function encodeCell(rowIndex: number, columnIndex: number) {
  return `${encodeColumn(columnIndex)}${rowIndex + 1}`;
}

function encodeRange(rowCount: number, columnCount: number) {
  return `A1:${encodeCell(Math.max(rowCount - 1, 0), Math.max(columnCount - 1, 0))}`;
}

function getCellType(value: ExcelCell): XLSX.ExcelDataType {
  if (typeof value === "number") return "n";
  if (typeof value === "boolean") return "b";
  if (value instanceof Date) return "d";
  return "s";
}

function rowsToWorksheet(rows: ExcelCell[][]): XLSX.WorkSheet {
  const worksheet: XLSX.WorkSheet = {};
  const maxColumns = getMaxColumns(rows);

  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (isEmptyValue(value)) return;
      worksheet[encodeCell(rowIndex, columnIndex)] = {
        t: getCellType(value),
        v: value,
      };
    });
  });

  worksheet["!ref"] = encodeRange(Math.max(rows.length, 1), maxColumns);
  return worksheet;
}

function getMaxColumns(rows: ExcelCell[][]) {
  return Math.max(1, ...rows.map((row) => row.length));
}

function isEmptyValue(value: ExcelCell) {
  return value === null || value === undefined || String(value).trim() === "";
}

function countFilledCells(row: ExcelCell[]) {
  return row.filter((value) => !isEmptyValue(value)).length;
}

function isBlankRow(row: ExcelCell[]) {
  return countFilledCells(row) === 0;
}

function isSingleTextRow(row: ExcelCell[]) {
  return countFilledCells(row) === 1 && typeof row.find((value) => !isEmptyValue(value)) === "string";
}

function isTableHeader(row: ExcelCell[]) {
  const values = row.map((value) => String(value ?? "").toLowerCase());
  const headerHits = [
    "nombre",
    "persona",
    "empresa",
    "entradas",
    "salidas",
    "correo",
    "fecha",
    "movimiento",
  ];

  return row.length >= 4 && headerHits.some((header) => values.includes(header));
}

function borderStyle(color = palette.grayLine) {
  return {
    top: { style: "thin", color: { rgb: color } },
    bottom: { style: "thin", color: { rgb: color } },
    left: { style: "thin", color: { rgb: color } },
    right: { style: "thin", color: { rgb: color } },
  };
}

function getCell(worksheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number) {
  const address = encodeCell(rowIndex, columnIndex);
  worksheet[address] ??= { t: "s", v: "" };
  return worksheet[address] as XLSX.CellObject & { s?: CellStyle };
}

function applyRowStyle(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  maxColumns: number,
  style: CellStyle
) {
  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    const cell = getCell(worksheet, rowIndex, columnIndex);
    cell.s = { ...(cell.s || {}), ...style };
  }
}

function applyExcelStyles(worksheet: XLSX.WorkSheet, rows: ExcelCell[][]) {
  const maxColumns = getMaxColumns(rows);
  const merges: XLSX.Range[] = [];
  const rowHeights: Array<{ hpt: number }> = [];
  let currentTableHeader = -1;

  rows.forEach((row, rowIndex) => {
    if (isBlankRow(row)) {
      rowHeights[rowIndex] = { hpt: 8 };
      return;
    }

    if (rowIndex === 0) {
      merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: maxColumns - 1 } });
      rowHeights[rowIndex] = { hpt: 28 };
      applyRowStyle(worksheet, rowIndex, maxColumns, {
        fill: { fgColor: { rgb: palette.purple } },
        font: { bold: true, color: { rgb: palette.white }, sz: 16 },
        alignment: { horizontal: "left", vertical: "center" },
        border: borderStyle(palette.purple),
      });
      return;
    }

    if (isTableHeader(row)) {
      currentTableHeader = rowIndex;
      rowHeights[rowIndex] = { hpt: 23 };
      applyRowStyle(worksheet, rowIndex, maxColumns, {
        fill: { fgColor: { rgb: palette.purpleDark } },
        font: { bold: true, color: { rgb: palette.white }, sz: 10 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: borderStyle("4C3671"),
      });
      return;
    }

    if (isSingleTextRow(row)) {
      const text = String(row.find((value) => !isEmptyValue(value)) ?? "");
      merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: maxColumns - 1 } });
      rowHeights[rowIndex] = { hpt: text.length > 90 ? 34 : 22 };
      applyRowStyle(worksheet, rowIndex, maxColumns, {
        fill: { fgColor: { rgb: rowIndex <= 2 ? palette.purpleSoft : palette.white } },
        font: {
          bold: rowIndex <= 2 || text.toLowerCase().includes("filtros"),
          color: { rgb: rowIndex <= 2 ? palette.purpleDark : palette.grayText },
          sz: rowIndex <= 2 ? 11 : 10,
        },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: borderStyle(rowIndex <= 2 ? "E3D4FF" : palette.white),
      });
      return;
    }

    const isDataRow = currentTableHeader >= 0 && rowIndex > currentTableHeader;
    const fillColor = isDataRow && (rowIndex - currentTableHeader) % 2 === 0
      ? palette.graySoft
      : palette.white;

    rowHeights[rowIndex] = { hpt: isDataRow ? 28 : 21 };
    applyRowStyle(worksheet, rowIndex, maxColumns, {
      fill: { fgColor: { rgb: fillColor } },
      font: { color: { rgb: "24242A" }, sz: 10 },
      alignment: { vertical: "center", wrapText: true },
      border: borderStyle(),
    });

    if (!isDataRow && row.length <= 2) {
      const labelCell = getCell(worksheet, rowIndex, 0);
      labelCell.s = {
        ...(labelCell.s || {}),
        fill: { fgColor: { rgb: palette.purpleSoft } },
        font: { bold: true, color: { rgb: palette.purpleDark }, sz: 10 },
      };
    }
  });

  worksheet["!merges"] = merges;
  worksheet["!rows"] = rowHeights;
}

export function downloadExcelWorkbook(fileName: string, sheets: ExcelSheet[]) {
  const runtime = getXlsxRuntime();
  const workbook: XLSX.WorkBook = {
    SheetNames: [],
    Sheets: {},
  };

  sheets.forEach((sheet) => {
    const sheetName = safeSheetName(sheet.name);
    const worksheet = rowsToWorksheet(sheet.rows);
    if (sheet.columnWidths?.length) {
      worksheet["!cols"] = sheet.columnWidths.map((width) => ({ wch: width }));
    }
    applyExcelStyles(worksheet, sheet.rows);
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = worksheet;
  });

  const output = runtime.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  });
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
