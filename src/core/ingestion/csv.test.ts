import { describe, expect, it } from "vitest";

import { CsvParseError, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses BOM-prefixed CRLF input and quoted commas without losing row data", () => {
    const records = parseCsv(
      '\ufeffstop_id,stop_name,description\r\nS1,"Halte, Pusat","""Main gate"""\r\n',
      "stops.txt",
    );

    expect(records).toEqual([
      {
        rowNumber: 2,
        values: {
          stop_id: "S1",
          stop_name: "Halte, Pusat",
          description: '"Main gate"',
        },
      },
    ]);
  });

  it("reports the source file and row for an unterminated quoted field", () => {
    try {
      parseCsv('id,name\n1,"broken\n', "stops.txt");
      throw new Error("expected parseCsv to reject malformed CSV");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvParseError);
      expect(error).toMatchObject({ fileName: "stops.txt", rowNumber: 2 });
    }
  });

  it("rejects duplicate headers and rows with the wrong number of columns", () => {
    expect(() => parseCsv("id,id\n1,2\n", "routes.txt")).toThrowError(
      CsvParseError,
    );
    expect(() => parseCsv("id,name\n1\n", "routes.txt")).toThrowError(
      CsvParseError,
    );
  });

  it("preserves field whitespace instead of silently changing identifiers", () => {
    expect(parseCsv("id,name\n S1 , Name \n", "stops.txt")[0]?.values).toEqual({
      id: " S1 ",
      name: " Name ",
    });
  });
});
