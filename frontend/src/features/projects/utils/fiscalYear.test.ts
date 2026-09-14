import { describe, expect, it } from "vitest";
import {
  getCurrentEthiopianYear,
  formatFiscalYear,
  extractAvailableFiscalYears,
  matchesFiscalYear,
} from "./fiscalYear";

describe("Ethiopian fiscal year utilities", () => {
  it("computes current Ethiopian year as a reasonable 4-digit number", () => {
    const year = getCurrentEthiopianYear();
    expect(year).toBeGreaterThanOrEqual(2016);
    expect(year).toBeLessThanOrEqual(2040);
  });

  it("formats fiscal year label correctly", () => {
    expect(formatFiscalYear(2017)).toBe("2017 EFY");
    expect(formatFiscalYear(2018)).toBe("2018 EFY");
  });

  it("extracts available fiscal years including current and plans", () => {
    const currentEFY = getCurrentEthiopianYear();
    const plans = [
      { budgetYear: "2016 EFY" },
      { budgetYear: "2017 EFY" },
      { budgetYear: "2018 EFY" },
      { budgetYear: "2024/2025" },
    ];
    const available = extractAvailableFiscalYears(plans);
    expect(available).toContain(`${currentEFY} EFY`);
    expect(available).toContain(`${currentEFY - 1} EFY`);
    expect(available).toContain("2016 EFY");
    expect(available).toContain("2017 EFY");
    expect(available).toContain("2018 EFY");
  });

  it("matches fiscal year against Ethiopian and Gregorian representations", () => {
    expect(matchesFiscalYear("2017 EFY", "2017 EFY")).toBe(true);
    expect(matchesFiscalYear("2024/2025", "2017 EFY")).toBe(true);
    expect(matchesFiscalYear("2025", "2017 EFY")).toBe(true);
    expect(matchesFiscalYear("2016 EFY", "2017 EFY")).toBe(false);
    expect(matchesFiscalYear("2018 EFY", "2017 EFY")).toBe(false);
    expect(matchesFiscalYear(null, "2017 EFY")).toBe(true);
    expect(matchesFiscalYear("2016", "All Fiscal Years")).toBe(true);
  });
});
