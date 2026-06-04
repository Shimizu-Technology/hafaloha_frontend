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

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc32: number;
  offset: number;
}

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const encoder = new TextEncoder();

function isValidXmlTextCodePoint(codePoint: number): boolean {
  return codePoint === 0x09 ||
    codePoint === 0x0a ||
    codePoint === 0x0d ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff);
}

function sanitizeXmlText(value: string): string {
  // XML 1.0 forbids most C0 control characters. Strip them so one bad
  // report value cannot make the generated XLSX unreadable.
  return Array.from(value)
    .filter((character) => isValidXmlTextCodePoint(character.codePointAt(0) || 0))
    .join('');
}

function escapeXml(value: SpreadsheetValue): string {
  const normalized = value instanceof Date ? value.toISOString() : value ?? '';
  return sanitizeXmlText(String(normalized))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textNode(value: SpreadsheetValue): string {
  const escaped = escapeXml(value);
  const preserveWhitespace = /^\s|\s$/.test(escaped);
  return `<t${preserveWhitespace ? ' xml:space="preserve"' : ''}>${escaped}</t>`;
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

function columnName(index: number): string {
  let column = '';
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }

  return column;
}

function cellReference(columnIndex: number, rowIndex: number): string {
  return `${columnName(columnIndex)}${rowIndex}`;
}

function cellXml(value: SpreadsheetValue, reference: string): string {
  if (value === null || value === undefined || value === '') {
    return `<c r="${reference}"/>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }

  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return `<c r="${reference}" t="inlineStr"><is>${textNode(value)}</is></c>`;
}

function rowXml(values: SpreadsheetValue[], rowIndex: number): string {
  const cells = values
    .map((value, columnIndex) => cellXml(value, cellReference(columnIndex, rowIndex)))
    .join('');
  return `<row r="${rowIndex}">${cells}</row>`;
}

function worksheetToXml(sheet: WorkbookSheet): string {
  const headers = worksheetHeaders(sheet.rows);
  const rows: string[] = [];

  if (headers.length > 0) {
    rows.push(rowXml(headers, 1));
    sheet.rows.forEach((row, index) => {
      rows.push(rowXml(headers.map((header) => row[header]), index + 2));
    });
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows.join('')}</sheetData>
</worksheet>`;
}

function workbookToXml(sheets: WorkbookSheet[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXml(sanitizeSheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}
  </sheets>
</workbook>`;
}

function workbookRelsToXml(sheets: WorkbookSheet[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
</Relationships>`;
}

function rootRelsToXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesToXml(sheets: WorkbookSheet[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`;
}

function workbookFiles(workbook: Workbook): Array<{ name: string; content: string }> {
  const sheets = workbook.sheets.length ? workbook.sheets : [{ name: 'Sheet 1', rows: [] }];
  return [
    { name: '[Content_Types].xml', content: contentTypesToXml(sheets) },
    { name: '_rels/.rels', content: rootRelsToXml() },
    { name: 'xl/workbook.xml', content: workbookToXml(sheets) },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsToXml(sheets) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetToXml(sheet),
    })),
  ];
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { date: number; time: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function littleEndianBytes(value: number, byteLength: 2 | 4): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  const view = new DataView(bytes.buffer);

  if (byteLength === 2) {
    view.setUint16(0, value, true);
  } else {
    view.setUint32(0, value, true);
  }

  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    combined.set(part, offset);
    offset += part.length;
  });

  return combined;
}

function localFileHeader(entry: ZipEntry, modTime: number, modDate: number): Uint8Array {
  const name = encoder.encode(entry.name);
  return concatBytes([
    littleEndianBytes(0x04034b50, 4),
    littleEndianBytes(20, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(modTime, 2),
    littleEndianBytes(modDate, 2),
    littleEndianBytes(entry.crc32, 4),
    littleEndianBytes(entry.data.length, 4),
    littleEndianBytes(entry.data.length, 4),
    littleEndianBytes(name.length, 2),
    littleEndianBytes(0, 2),
    name,
  ]);
}

function centralDirectoryHeader(entry: ZipEntry, modTime: number, modDate: number): Uint8Array {
  const name = encoder.encode(entry.name);
  return concatBytes([
    littleEndianBytes(0x02014b50, 4),
    littleEndianBytes(20, 2),
    littleEndianBytes(20, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(modTime, 2),
    littleEndianBytes(modDate, 2),
    littleEndianBytes(entry.crc32, 4),
    littleEndianBytes(entry.data.length, 4),
    littleEndianBytes(entry.data.length, 4),
    littleEndianBytes(name.length, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 4),
    littleEndianBytes(entry.offset, 4),
    name,
  ]);
}

function endOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Uint8Array {
  return concatBytes([
    littleEndianBytes(0x06054b50, 4),
    littleEndianBytes(0, 2),
    littleEndianBytes(0, 2),
    littleEndianBytes(entryCount, 2),
    littleEndianBytes(entryCount, 2),
    littleEndianBytes(centralDirectorySize, 4),
    littleEndianBytes(centralDirectoryOffset, 4),
    littleEndianBytes(0, 2),
  ]);
}

function workbookToXlsxBlob(workbook: Workbook): Blob {
  const { date, time } = dosDateTime(new Date());
  const entries: ZipEntry[] = workbookFiles(workbook).map(({ name, content }) => {
    const data = encoder.encode(content);
    return { name, data, crc32: crc32(data), offset: 0 };
  });

  const localParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    entry.offset = offset;
    const header = localFileHeader(entry, time, date);
    localParts.push(header, entry.data);
    offset += header.length + entry.data.length;
  });

  const centralDirectoryOffset = offset;
  const centralParts = entries.map((entry) => centralDirectoryHeader(entry, time, date));
  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = endOfCentralDirectory(entries.length, centralDirectorySize, centralDirectoryOffset);

  return new Blob([...localParts, ...centralParts, eocd], { type: XLSX_MIME_TYPE });
}

function normalizeXlsxFilename(filename: string): string {
  if (/\.(xlsx|xls|csv|xml)$/i.test(filename)) {
    return filename.replace(/\.(xlsx|xls|csv|xml)$/i, '.xlsx');
  }

  return `${filename}.xlsx`;
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
  const blob = workbookToXlsxBlob(workbook);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = normalizeXlsxFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
