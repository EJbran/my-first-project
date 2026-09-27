import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  format?: (value: string | number | null | undefined) => string | number;
}

/**
 * Professional Excel export utility with formatting support
 * Supports dates, numbers, Arabic text, and professional styling
 */
export const exportToExcel = <T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[]
): void => {
  if (rows.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Prepare data for export
  const headers = columns.map((col) => col.header);
  const data = rows.map((row) =>
    columns.map((col) => {
      const rawValue = col.value(row);
      return col.format ? col.format(rawValue) : rawValue ?? "";
    })
  );

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Apply professional styling
  styleExcelSheet(ws, headers.length, data.length);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  // Generate filename with current date
  const dateStr = new Date().toISOString().split("T")[0];
  const safeFilename = filename.replace(/\.(?:xls|xlsx)$/i, "");
  const finalFilename = `${safeFilename}_${dateStr}.xlsx`;

  // Write file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Apply professional formatting to Excel sheet
 */
const styleExcelSheet = (
  ws: XLSX.WorkSheet,
  colCount: number,
  rowCount: number
): void => {
  // Freeze first row (header)
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Auto-adjust column widths
  const colWidths: number[] = [];
  for (let i = 0; i < colCount; i++) {
    const col = XLSX.utils.encode_col(i);
    let maxWidth = 12; // minimum width

    // Check header
    const headerCell = ws[`${col}1`];
    if (headerCell && headerCell.v) {
      const headerLength = String(headerCell.v).length;
      maxWidth = Math.max(maxWidth, Math.min(headerLength + 2, 50));
    }

    // Check some data cells for better estimation
    for (let j = 2; j <= Math.min(rowCount + 1, 100); j++) {
      const cell = ws[`${col}${j}`];
      if (cell && cell.v) {
        const contentLength = String(cell.v).length;
        maxWidth = Math.max(maxWidth, Math.min(contentLength + 1, 50));
      }
    }

    colWidths.push(maxWidth);
  }

  ws["!cols"] = colWidths.map((width) => ({ wch: width }));

  // Add AutoFilter to headers
  if (rowCount > 0) {
    const lastCol = XLSX.utils.encode_col(colCount - 1);
    ws["!autofilter"] = { ref: `A1:${lastCol}1` };
  }

  // Apply number formatting for monetary values
  for (let i = 2; i <= rowCount + 1; i++) {
    for (let j = 0; j < colCount; j++) {
      const col = XLSX.utils.encode_col(j);
      const cellRef = `${col}${i}`;
      const cell = ws[cellRef];

      if (cell) {
        // Format dates (YYYY-MM-DD format)
        if (typeof cell.v === "string" && /^\d{4}-\d{2}-\d{2}/.test(cell.v)) {
          if (!cell.z) {
            cell.z = "YYYY-MM-DD";
          }
        }

        // Format numbers as currency or decimal
        if (typeof cell.v === "number") {
          const headerText = String(ws[`${col}1`]?.v ?? "").toLowerCase();

          if (
            headerText.includes("cost") ||
            headerText.includes("value") ||
            headerText.includes("price") ||
            headerText.includes("amount")
          ) {
            if (!cell.z) {
              cell.z = "#,##0.00";
            }
          } else if (
            headerText.includes("percentage") ||
            headerText.includes("rate") ||
            headerText.includes("depreciation")
          ) {
            if (!cell.z) {
              cell.z = "0.00";
            }
          }
        }
      }
    }
  }
};
