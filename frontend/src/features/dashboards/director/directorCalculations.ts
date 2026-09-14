/**
 * Facade / Barrel re-export for Director dashboard calculations.
 * Decomposed into modular domain engines under ./calculations/
 * and core calendar utilities in @/features/projects/utils/fiscalYear.
 */

// Core Ethiopian Fiscal Year & Calendar Engine
export {
  getCurrentEthiopianYear,
  formatFiscalYear,
  extractAvailableFiscalYears,
  matchesFiscalYear,
  type HasBudgetYear,
} from "@/features/projects/utils/fiscalYear";

// Modular Director Domain Engines
export * from "./calculations/directorFilters";
export * from "./calculations/directorFinancials";
export * from "./calculations/directorPipeline";
export * from "./calculations/directorHealth";
