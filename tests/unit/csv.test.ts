import { describe, expect, it } from "vitest";
import { csvLine, csvRecords, parseCsv } from "@/lib/csv";

describe("csv", () => {
  it("parses quoted fields, escaped quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n3,4')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["3", "4"]]);
  });

  it("keeps line breaks inside quotes", () => {
    expect(parseCsv('a\n"line 1\nline 2"')).toEqual([["a"], ["line 1\nline 2"]]);
  });

  it("maps rows to records by normalised headers", () => {
    expect(csvRecords("Study ID,Protocol\nAZ-1,P\nAZ-2").records).toEqual([{ study_id: "AZ-1", protocol: "P" }, { study_id: "AZ-2", protocol: "" }]);
  });

  it("writes CSV safely (quotes, formula injection)", () => {
    expect(csvLine(["a,b", '"q"', "=1+1", null, 3])).toBe('"a,b","""q""",\'=1+1,,3');
  });
});
