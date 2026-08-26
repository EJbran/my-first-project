export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

const escapeCell = (value: string | number): string => {
  const raw = String(value);
  const formulaSafe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
};

export const exportToExcel = <T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[]
): void => {
  const headerLine = columns.map((column) => escapeCell(column.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(",")
  );
  const content = `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename.replace(/\.(?:xls|xlsx)$/i, "")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
