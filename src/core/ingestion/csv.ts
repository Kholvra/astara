export type CsvRecord = Readonly<{
  rowNumber: number;
  values: Readonly<Record<string, string>>;
}>;

export type CsvTable = Readonly<{
  headers: readonly string[];
  records: readonly CsvRecord[];
}>;

export class CsvParseError extends Error {
  public readonly fileName: string;
  public readonly rowNumber: number;

  public constructor(message: string, fileName: string, rowNumber: number) {
    super(`${fileName} row ${rowNumber}: ${message}`);
    this.name = "CsvParseError";
    this.fileName = fileName;
    this.rowNumber = rowNumber;
  }
}

type TokenizedRow = Readonly<{
  rowNumber: number;
  values: readonly string[];
}>;

export function parseCsv(
  input: string,
  fileName: string,
): readonly CsvRecord[] {
  return parseCsvTable(input, fileName).records;
}

export function parseCsvTable(input: string, fileName: string): CsvTable {
  const rows = tokenizeCsv(input, fileName);
  const headerRow = rows[0];

  if (!headerRow) {
    throw new CsvParseError("CSV must contain a header row", fileName, 1);
  }

  const headers = [...headerRow.values];
  const seenHeaders = new Set<string>();

  for (const header of headers) {
    if (header.length === 0) {
      throw new CsvParseError("header names must not be empty", fileName, 1);
    }

    if (seenHeaders.has(header)) {
      throw new CsvParseError(`duplicate header '${header}'`, fileName, 1);
    }

    seenHeaders.add(header);
  }

  const records = rows.slice(1).map((row) => {
    if (row.values.length !== headers.length) {
      throw new CsvParseError(
        `expected ${headers.length} columns but found ${row.values.length}`,
        fileName,
        row.rowNumber,
      );
    }

    const values: Record<string, string> = {};

    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      const value = row.values[index];

      if (header === undefined || value === undefined) {
        throw new CsvParseError(
          "row contains an unavailable column",
          fileName,
          row.rowNumber,
        );
      }

      values[header] = value;
    }

    return { rowNumber: row.rowNumber, values };
  });

  return { headers, records };
}

function tokenizeCsv(input: string, fileName: string): readonly TokenizedRow[] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: TokenizedRow[] = [];
  let values: string[] = [];
  let field = "";
  let inQuotes = false;
  let quoteClosed = false;
  let rowNumber = 1;
  let rowStart = 1;
  let rowHasContent = false;

  const appendRow = (): void => {
    if (!rowHasContent && values.length === 0 && field.length === 0) {
      rowNumber += 1;
      rowStart = rowNumber;
      return;
    }

    values.push(field);
    rows.push({ rowNumber: rowStart, values });
    values = [];
    field = "";
    rowHasContent = false;
    quoteClosed = false;
    rowNumber += 1;
    rowStart = rowNumber;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === undefined) {
      continue;
    }

    if (inQuotes) {
      if (character === '"') {
        const nextCharacter = text[index + 1];

        if (nextCharacter === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          quoteClosed = true;
        }
      } else {
        field += character;
        if (character === "\n") {
          rowNumber += 1;
        }
      }

      continue;
    }

    if (quoteClosed) {
      if (character === ",") {
        values.push(field);
        field = "";
        quoteClosed = false;
        rowHasContent = true;
        continue;
      }

      if (character === "\r" || character === "\n") {
        if (character === "\r" && text[index + 1] === "\n") {
          index += 1;
        }
        appendRow();
        continue;
      }

      throw new CsvParseError(
        "unexpected characters after a quoted field",
        fileName,
        rowStart,
      );
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
      rowHasContent = true;
      continue;
    }

    if (character === ",") {
      values.push(field);
      field = "";
      rowHasContent = true;
      continue;
    }

    if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      appendRow();
      continue;
    }

    field += character;
    if (character.trim().length > 0) {
      rowHasContent = true;
    }
  }

  if (inQuotes) {
    throw new CsvParseError("unterminated quoted field", fileName, rowStart);
  }

  if (field.length > 0 || values.length > 0 || rowHasContent) {
    appendRow();
  }

  if (rows.length === 0) {
    throw new CsvParseError("CSV must not be empty", fileName, 1);
  }

  return rows;
}
