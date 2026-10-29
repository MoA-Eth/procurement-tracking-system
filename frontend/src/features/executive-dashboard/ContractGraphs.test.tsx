import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContractGraphs } from "./ContractGraphs";
import type { ExecutiveRecord } from "./model";
const base: ExecutiveRecord = {
  id: "c1",
  activityId: "a1",
  contractId: "c1",
  reference: "WORKS-001",
  description: "Works",
  projectId: "p1",
  project: "Project one",
  itemType: "WORKS",
  sourceCategory: "WORKS",
  estimate: 50000,
  estimateCurrency: "ETB",
  currency: "ETB",
  invitationDate: null,
  bidOpeningDate: null,
  signedDate: "2026-10-23T00:00:00Z",
  supplier: "Supplier A",
  country: null,
  initialAmount: 50000,
  initialCompletionDate: "2027-10-08T00:00:00Z",
  revisedCompletionDate: null,
  actualCompletionDate: null,
  complete: false,
  completionPct: null,
  status: "ACTIVE",
};

describe("contract register graphs", () => {
  it("shows all requested dimensions with explicit source limitations", () => {
    const html = renderToStaticMarkup(
      <ContractGraphs rows={[base]} onSelect={() => {}} />,
    );
    for (const text of [
      "Cost estimate and initial contract amount",
      "Complete yes or no",
      "Percentage of completion by contract",
      "Initial awards by supplier or contractor",
      "Invitation to initial completion target",
      "WORKS-001",
      "Project one",
      "Supplier A",
      "10/23/26",
      "10/08/27",
      "Not recorded",
      "Not reported",
      "Supplier country is unavailable",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("NaN");
  });
  it("keeps empty datasets and missing milestones explicit", () => {
    const html = renderToStaticMarkup(
      <ContractGraphs rows={[]} onSelect={() => {}} />,
    );
    expect(html).toContain(
      "No invitation, opening, signature or initial completion dates recorded",
    );
    expect(html).toContain("No registered contracts");
  });
});
