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

function escapeXml(value: SpreadsheetValue): string {
  const normalized = value instanceof Date ? value.toISOString() : value ?? '';
  return String(normalized)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function spreadsheetType(value: SpreadsheetValue): 'String' | 'Number' | 'Boolean' | 'DateTime' {
  if (value instanceof Date) return 'DateTime';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'boolean') return 'Boolean';
  return 'String';
}

function cellXml(value: SpreadsheetValue): string {
  const type = spreadsheetType(value);
  const normalized = typeof value === 'boolean' ? (value ? '1' : '0') : value;
  return `<Cell><Data ss:Type="${type}">${escapeXml(normalized)}</Data></Cell>`;
}

function worksheetHeaders(rows: Worksheet): string[] {
  return Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );
}

function sanitizeSheetName(name: string, index: number): string {
  const sanitized = name
    .replace(/[\\/?*:]/g, ' ')
    .replace(/\[/g, ' ')
    .replace(/\]/g, ' ')
    .trim() || `Sheet ${index + 1}`;
  return sanitized.slice(0, 31);
}

function worksheetToXml(sheet: WorkbookSheet, index: number): string {
  const headers = worksheetHeaders(sheet.rows);
  const headerRow = `<Row>${headers.map(cellXml).join('')}</Row>`;
  const dataRows = sheet.rows
    .map((row) => `<Row>${headers.map((header) => cellXml(row[header])).join('')}</Row>`)
    .join('');

  return `
    <Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name, index))}">
      <Table>${headerRow}${dataRows}</Table>
    </Worksheet>`;
}

function workbookToSpreadsheetXml(workbook: Workbook): string {
  const sheets = workbook.sheets.length ? workbook.sheets : [{ name: 'Sheet 1', rows: [] }];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${sheets.map(worksheetToXml).join('')}
</Workbook>`;
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
  const xml = workbookToSpreadsheetXml(workbook);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.(xlsx|xls|csv)$/i, '.xml');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
