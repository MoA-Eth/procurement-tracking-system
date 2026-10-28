import { describe, expect, it } from "vitest";
import {
  formatNumberWithCommas,
  parseNumberWithCommas,
} from "./numberFormatting";

describe("number formatting", () => {
  it("parses grouped and ungrouped values without losing decimals", () => {
    expect(parseNumberWithCommas("1,234,567.89")).toBe(1_234_567.89);
    expect(parseNumberWithCommas("1234567.89")).toBe(1_234_567.89);
    expect(parseNumberWithCommas(".5")).toBe(0.5);
  });

  it("formats valid values while preserving entered decimal precision", () => {
    expect(formatNumberWithCommas("1234567.890")).toBe("1,234,567.890");
    expect(formatNumberWithCommas("1000")).toBe("1,000");
  });

  it("rejects malformed grouping instead of silently changing the value", () => {
    expect(parseNumberWithCommas("12,34")).toBe(Number.NaN);
    expect(formatNumberWithCommas("12,34")).toBe("12,34");
  });
});
