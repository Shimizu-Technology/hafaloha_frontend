type SpreadsheetValue = string | number | boolean | null | undefined | Date;
type SpreadsheetRow = Record<string, SpreadsheetValue>;
type Worksheet = SpreadsheetRow[];

interface WorkbookSheet {
  name: string;
  rows: Worksheet;
}

interface Workbook {
  sheets: WorkbookSheet[];
}

function escapeCsvValue(value: SpreadsheetValue): string {
  const normalized = value instanceof Date ? value.toISOString() : value ?? '';
  const stringValue = String(normalized);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function worksheetToCsv(rows: Worksheet): string {
  if (!rows.length) return '';

  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');
}

export const utils = {
  book_new(): Workbook {
    return { sheets: [] };
  },

  json_to_sheet(rows: SpreadsheetRow[]): Worksheet {
    return rows;
  },

  book_append_sheet(workbook: Workbook, worksheet: Worksheet, name: string): void {
    workbook.sheets.push({ name, rows: worksheet });
  },
};

export function writeFile(workbook: Workbook, filename: string): void {
  const csv = workbook.sheets
    .map((sheet) => [`# ${sheet.name}`, worksheetToCsv(sheet.rows)].filter(Boolean).join('\n'))
    .join('\n\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.xlsx$/i, '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
