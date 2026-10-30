import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContractSummary } from "./ContractSummary";
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

describe("contract register summary", () => {
 it("deduplicates activity estimates and progress while retaining both contract amounts", () => {
 const rows = [{...base, completionPct: 40}, {...base, id: "c2", contractId: "c2", initialAmount: 10000, completionPct:40}];
 const html=renderToStaticMarkup(<ContractSummary rows={rows} asOf="2026-10-28" />);
 expect(html).toContain("50K ETB");
 expect(html).toContain("60K ETB");
 expect(html).toContain("40%");
 expect(html).toContain("1 of 1 activities report progress");
 expect(html).toContain("0 of 2 complete");
 });
 it("preserves missing progress and empty selections", () => {
 const html=renderToStaticMarkup(<ContractSummary rows={[]} asOf="2026-10-28" />);
 expect(html).toContain("Not reported");
 expect(html).toContain("Not recorded");
 expect(html).not.toContain("NaN");
 });
});
