import { gregorianToEthiopian } from "./ethiopianCalendar";

export interface HasBudgetYear {
  budgetYear?: string | null;
}

/**
 * Returns the current Ethiopian Calendar year (EFY).
 * Resolves dynamically from today's date, or falls back to standard offset calculation.
 */
export function getCurrentEthiopianYear(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const eth = gregorianToEthiopian(today);
    if (eth && eth.year) {
      return eth.year;
    }
  } catch {
    // Fallback if calendar library throws
  }
  const now = new Date();
  const gYear = now.getFullYear();
  const gMonth = now.getMonth() + 1;
  // Ethiopian new year begins in September (Meskerem)
  return gMonth >= 9 ? gYear - 7 : gYear - 8;
}

/**
 * Format a numeric Ethiopian year into the standard display format (e.g. 2017 -> "2017 EFY")
 */
export function formatFiscalYear(efy: number): string {
  return `${efy} EFY`;
}

/**
 * Dynamically extract distinct fiscal years available from plans and the current date.
 * Automatically accommodates future fiscal years without hardcoding.
 */
export function extractAvailableFiscalYears(
  plans: HasBudgetYear[] = [],
): string[] {
  const yearsSet = new Set<string>();
  const currentEFY = getCurrentEthiopianYear();

  // Always guarantee current EFY and the immediately preceding EFY
  yearsSet.add(formatFiscalYear(currentEFY));
  yearsSet.add(formatFiscalYear(currentEFY - 1));

  // Scan plans for any future or past fiscal years
  plans.forEach((p) => {
    if (p.budgetYear) {
      const match = p.budgetYear.match(/\b(20\d{2})\b/);
      if (match) {
        const num = parseInt(match[1], 10);
        // If year is Gregorian (e.g. 2025/2026), map to corresponding EFY
        const efy = num >= 2024 && num > currentEFY + 5 ? num - 8 : num;
        yearsSet.add(formatFiscalYear(efy));
      }
    }
  });

  // Return in descending chronological order
  return Array.from(yearsSet).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, ""), 10) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, ""), 10) || 0;
    return numB - numA;
  });
}

/**
 * Dynamically match a plan's budget year string against the selected fiscal year filter.
 * For any Ethiopian year E, Gregorian correspondence is E + 7 and E + 8.
 */
export function matchesFiscalYear(
  planBudgetYear: string | undefined | null,
  selectedFiscalYear: string,
): boolean {
  if (!selectedFiscalYear || selectedFiscalYear === "All Fiscal Years")
    return true;
  if (!planBudgetYear) return true;

  const efyNum = parseInt(selectedFiscalYear.replace(/[^0-9]/g, ""), 10);
  if (!efyNum) return true;

  const efyStr = String(efyNum);
  const gYear1 = String(efyNum + 7);
  const gYear2 = String(efyNum + 8);

  const by = planBudgetYear.trim();
  return by.includes(efyStr) || by.includes(gYear1) || by.includes(gYear2);
}
