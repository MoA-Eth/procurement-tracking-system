import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProcurementRegister } from "./ProcurementRegister";
import type { ExecutiveRecord } from "./model";

const record: ExecutiveRecord = {
  id: "contract:1",
  contractId: "1",
  activityId: "1",
  reference: "WORKS-001",
  description: "Construction",
  projectId: "1",
  project: "Project one",
  itemType: "WORKS",
  sourceCategory: "WORKS",
  estimate: 50000,
  estimateCurrency: "ETB",
  currency: "ETB",
  invitationDate: null,
  bidOpeningDate: null,
  signedDate: "2026-10-23T00:00:00Z",
  supplier: "Builder",
  country: "Ethiopia",
  initialAmount: 50000,
  initialCompletionDate: "2027-10-08T00:00:00Z",
  revisedCompletionDate: null,
  actualCompletionDate: null,
  complete: false,
  completionPct: null,
  status: "ACTIVE",
};
describe("13-column procurement register", () => {
  it("renders every column together, including missing values and formatted dates", () => {
    const html = renderToStaticMarkup(
      <ProcurementRegister
        records={[record]}
        firstRowNumber={16}
        onSelect={() => {}}
      />,
    );
    expect(html.match(/<th\s/g)).toHaveLength(13);
    expect(html.match(/<td\s/g)).toHaveLength(13);
    expect(html).toContain("10/23/26");
    expect(html).toContain("10/08/27");
    expect(html).toContain("Not recorded");
    expect(html).toContain("Not reported");
    expect(html).toContain("Supplier country not available");
    expect(html).not.toContain("Ethiopia");
    expect(html).toContain(">16<");
    expect(html).toContain('tabindex="0"');
  });
  it("keeps the empty state aligned across all 13 columns", () => {
    const html = renderToStaticMarkup(
      <ProcurementRegister
        records={[]}
        firstRowNumber={1}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('colSpan="13"');
    expect(html).toContain("No records to display.");
  });
});
