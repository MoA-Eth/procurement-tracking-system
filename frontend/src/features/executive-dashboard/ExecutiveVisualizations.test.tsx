import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExecutiveVisualizations } from "./ExecutiveVisualizations";
import {
  CompletionDonut,
  CostScatter,
  GroupedBars,
  HorizontalBars,
  ProgressGauge,
} from "./ChartPrimitives";
import type { ExecutiveRecord } from "./model";

const record: ExecutiveRecord = {
  id: "c1",
  activityId: "a1",
  contractId: "c1",
  activityContractCount: 1,
  reference: "W-001",
  description: "Works",
  projectId: "p1",
  project: "Project one",
  itemType: "WORKS",
  sourceCategory: "WORKS",
  estimate: 100,
  estimateCurrency: "ETB",
  currency: "ETB",
  invitationDate: null,
  bidOpeningDate: null,
  signedDate: "2026-10-23T00:00:00Z",
  startDate: null,
  supplier: "Supplier A",
  country: "Ethiopia",
  initialAmount: 120,
  initialCompletionDate: "2027-10-08T00:00:00Z",
  revisedCompletionDate: null,
  actualCompletionDate: null,
  complete: false,
  completionPct: null,
  status: "ACTIVE",
};
const callbacks = {
  onSelect: () => {},
  onProjectSelect: () => {},
  onSupplierSelect: () => {},
};
describe("proposal visualization rendering", () => {
  it.each(["overview", "timeline", "finance"] as const)(
    "renders the %s view without inventing missing data",
    (initialView) => {
      const html = renderToStaticMarkup(
        <ExecutiveVisualizations
          rows={[record]}
          asOf="2026-10-15T00:00:00Z"
          initialView={initialView}
          {...callbacks}
        />,
      );
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain("after 10/15/26");
      expect(html).not.toContain("NaN");
      if (initialView === "overview") {
        expect(html).toContain("Not reported");
        expect(html).toContain("Contracts by project");
      }
      if (initialView === "timeline") {
        expect(html).toContain("Signature date proxy");
        expect(html).toContain("10/08/27");
        expect(html).toContain("No recorded events");
      }
      if (initialView === "finance") {
        expect(html).toContain("Supplier country is not captured");
        expect(html).toContain("Matched cost variance");
        expect(html).toContain("20%");
      }
    },
  );
  it("shows an unavailable progress gauge instead of a fabricated zero", () => {
    const html = renderToStaticMarkup(
      <ProgressGauge value={null} reported={0} total={34} />,
    );
    expect(html).toContain("Not reported");
    expect(html).toContain("0 of 34");
    expect(html).not.toContain("0% average");
  });
  it("shows exact donut counts including unknown completion", () => {
    const html = renderToStaticMarkup(
      <CompletionDonut completed={2} incomplete={1} unknown={1} />,
    );
    expect(html).toContain("50%");
    expect(html).toContain("2 completed, 1 incomplete, 1 unknown");
  });
  it("renders supported chart types with exact amounts and accessible point details", () => {
    const html = renderToStaticMarkup(
      <>
        <HorizontalBars
          values={[{ id: "p1", label: "Project one", value: 1 }]}
          unit="contracts"
        />
        <GroupedBars
          values={[
            { id: "p1", label: "Project one", estimate: 100, amount: 120 },
          ]}
          currency="ETB"
          onSelect={() => {}}
        />
        <CostScatter
          points={[
            {
              id: "a1",
              label: "W-001",
              project: "Project one",
              estimate: 100,
              amount: 120,
            },
          ]}
          currency="ETB"
          onSelect={() => {}}
        />
      </>,
    );
    expect(html).toContain("1 contracts");
    expect(html).toContain("100 ETB");
    expect(html).toContain("120 ETB");
    expect(html).toContain('role="button"');
    expect(html).not.toContain("NaN");
  });
});
