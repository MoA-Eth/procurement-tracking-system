import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Step1IdentityForm } from "./Step1IdentityForm";
import { Step2FinancialsForm } from "./Step2FinancialsForm";
import {
  FALLBACK_LOOKUPS,
  getInitialLookups,
  createLookup,
} from "@/lib/lookupsApi";

describe("Project Creation Steps Dynamic Lookups", () => {
  it("Step1IdentityForm renders Add Sector button and dynamic sector options", () => {
    const html = renderToStaticMarkup(
      <Step1IdentityForm
        data={{
          code: "DRIVE",
          name: "De-risking, Inclusion and Value Enhancement Project",
          sapNumber: "",
          sector: "Agriculture and Horticulture Development Sector",
          countryOrg: "Ethiopia (Federal Level)",
          customCountryOrg: "",
          executingAgency: "Ministry of Agriculture (MoA)",
          customExecutingAgency: "",
          region: "Ministry Level (Federal Headquarters)",
        }}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain("Sector / Directorate *");
    expect(html).toContain("Add Sector");
    expect(html).toContain("Agriculture and Horticulture Development Sector");
    expect(html).toContain("Livestock Resource Development Sector");
    expect(html).toContain("Add Code");
  });

  it("Step2FinancialsForm renders Add Currency, Add Donor, and Add Type buttons", () => {
    const html = renderToStaticMarkup(
      <Step2FinancialsForm
        data={{
          fundingSources: ["African Development Bank (AfDB)"],
          customFundingSource: "",
          fundingType: "Loan",
          currency: "ETB (Ethiopian Birr)",
          loanGrantNumbers: ["2100155042468"],
        }}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain("Primary Base Currency *");
    expect(html).toContain("Add Currency");
    expect(html).toContain("Add Donor");
    expect(html).toContain("Add Type");
    expect(html).toContain("ETB (Ethiopian Birr)");
    expect(html).toContain("USD (US Dollar)");
  });

  it("verifies lookupsApi contains base currencies, sectors, and procurement methods", () => {
    const sectors = getInitialLookups("SECTOR");
    const currencies = getInitialLookups("CURRENCY");
    const methods = getInitialLookups("PROCUREMENT_METHOD");
    const fundingSources = getInitialLookups("FUNDING_SOURCE");
    const fundingTypes = getInitialLookups("FUNDING_TYPE");

    expect(sectors.length).toBeGreaterThan(0);
    expect(currencies.length).toBeGreaterThan(0);
    expect(methods.length).toBeGreaterThan(0);
    expect(fundingSources.length).toBeGreaterThan(0);
    expect(fundingTypes.length).toBeGreaterThan(0);

    expect(currencies.some((c) => c.code === "ETB")).toBe(true);
    expect(currencies.some((c) => c.code === "USD")).toBe(true);
    expect(sectors.some((s) => s.code === "SEC_AGRI")).toBe(true);
  });
});
