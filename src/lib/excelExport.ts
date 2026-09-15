import ExcelJS from "exceljs";

type Column = {
  header: string;
  key: string;
  width?: number;
  format?: "currency" | "date";
};

export type ExportSheet = {
  name: string;
  columns: Column[];
  rows: Record<string, unknown>[];
};

const teal = "0F766E";
const lightTeal = "E6FFFB";
const navy = "0F172A";

function addOverview(workbook: ExcelJS.Workbook, generatedAt: Date, summary: Array<[string, string | number]>) {
  const sheet = workbook.addWorksheet("Resumo", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  sheet.columns = [{ width: 30 }, { width: 26 }, { width: 18 }, { width: 18 }];
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "Backup das suas finanças";
  sheet.getCell("A1").font = { bold: true, size: 20, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: teal } };
  sheet.getRow(1).height = 34;

  sheet.mergeCells("A2:D2");
  sheet.getCell("A2").value = `Gerado em ${generatedAt.toLocaleString("pt-BR")}`;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF475569" } };

  sheet.mergeCells("A4:D4");
  sheet.getCell("A4").value = "Resumo do arquivo";
  sheet.getCell("A4").font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };

  summary.forEach(([label, value], index) => {
    const row = sheet.getRow(index + 5);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.getCell(1).font = { bold: true, color: { argb: "FF334155" } };
    row.getCell(2).font = { bold: true, color: { argb: "FF0F766E" } };
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    }
  });

  const notesRow = summary.length + 7;
  sheet.mergeCells(`A${notesRow}:D${notesRow}`);
  sheet.getCell(`A${notesRow}`).value =
    "Use as abas abaixo para consultar os detalhes. Os valores são apresentados em reais (R$).";
  sheet.getCell(`A${notesRow}`).alignment = { wrapText: true };
  sheet.getCell(`A${notesRow}`).font = { color: { argb: "FF475569" }, italic: true };
}

function addDataSheet(workbook: ExcelJS.Workbook, definition: ExportSheet) {
  const sheet = workbook.addWorksheet(definition.name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = definition.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 20,
  }));

  definition.rows.forEach((row) => sheet.addRow(row));

  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: teal } };
  });

  definition.rows.forEach((_, rowIndex) => {
    const row = sheet.getRow(rowIndex + 2);
    row.alignment = { vertical: "middle", wrapText: true };
    if (rowIndex % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightTeal } };
      });
    }
  });

  definition.columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    if (column.format === "currency") {
      excelColumn.numFmt = '"R$" #,##0.00';
    }
    if (column.format === "date") {
      excelColumn.numFmt = "dd/mm/yyyy";
    }
  });

  if (definition.rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: definition.rows.length + 1, column: definition.columns.length },
    };
  }
}

export async function createFinanceExcelFile(
  filename: string,
  summary: Array<[string, string | number]>,
  sheets: ExportSheet[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finanças";
  workbook.created = new Date();
  workbook.modified = new Date();

  addOverview(workbook, new Date(), summary);
  sheets.forEach((sheet) => addDataSheet(workbook, sheet));

  const data = await workbook.xlsx.writeBuffer();
  return new File([data], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
