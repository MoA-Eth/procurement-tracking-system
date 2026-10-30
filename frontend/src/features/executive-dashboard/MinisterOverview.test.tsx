import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MinisterOverview } from "./MinisterOverview";
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
const render = (rows: ExecutiveRecord[]) =>
  renderToStaticMarkup(
    <MinisterOverview
      rows={rows}
      asOf="2026-10-15T00:00:00Z"
      onSelect={() => {}}
    />,
  );
describe("ministerial overview", () => {
  it("prioritizes overdue exposure and upcoming targets without combining currencies", () => {
    const html = render([
      {
        ...base,
        initialCompletionDate: "2026-10-01",
        initialAmount: 200,
        currency: "USD",
      },
      {
        ...base,
        id: "c2",
        contractId: "c2",
        activityId: "a2",
        reference: "DUE-SOON",
        initialCompletionDate: "2026-11-01",
        completionPct: 40,
      },
      {
        ...base,
        id: "c3",
        contractId: "c3",
        activityId: "a3",
        reference: "CLOSED",
        initialCompletionDate: "2026-11-01",
        status: "CANCELLED",
      },
    ]);
    expect(html).toContain("Escalate delivery delays");
    expect(html).toContain("200 USD");
    expect(html).toContain("1 contracts due for completion");
    expect(html).toContain("DUE-SOON");
    expect(html).toContain("this is not a measure of financial loss");
  });
  it("plots historical signatures and keeps missing progress distinct from zero", () => {
    const html = render([
      { ...base, signedDate: "2026-09-12T00:00:00Z", completionPct: 0 },
    ]);
    expect(html).toMatch(/Sept? 26: 1 contracts signed/);
    expect(html).toContain("1 of 1 activities reported");
    expect(html).toContain("0%");
    expect(render([base])).toContain(
      "No historical contract signatures recorded",
    );
    expect(render([base])).toContain(
      "Progress has not been reported for any project",
    );
  });
  it("prioritizes four headline figures and three procurement types without analytical tabs", () => {
    const html = render([
      base,
      {
        ...base,
        id: "g1",
        activityId: "g1",
        contractId: null,
        itemType: "GOODS",
        initialAmount: null,
        complete: null,
      },
      {
        ...base,
        id: "s1",
        activityId: "s1",
        contractId: null,
        itemType: "SERVICES",
        initialAmount: null,
        complete: null,
      },
    ]);
    for (const heading of [
      "Estimated procurement value",
      "Contract commitments",
      "Contracts completed",
      "Overdue contracts",
      "Works",
      "Goods",
      "Services",
      "For attention",
      "Where leadership attention matters",
      "Recommended follow-up",
      "Next 90 days",
      "Contracts by project",
      "Average progress by project",
      "Contracts signed over time",
      "Contract implementation tracker",
    ])
      expect(html).toContain(heading);
    expect(html).toContain("2 activities awaiting contracts");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("Matched cost variance");
    expect(html).not.toContain("Financial chart currency");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Denominator:");
  });
  it("keeps currency totals separate and shows missing progress and future dates honestly", () => {
    const html = render([
      base,
      {
        ...base,
        id: "usd",
        activityId: "usd",
        contractId: null,
        estimate: 200,
        estimateCurrency: "USD",
        currency: "USD",
        initialAmount: null,
        complete: null,
      },
    ]);
    expect(html).toContain("ETB");
    expect(html).toContain("USD");
    expect(html).toContain("future-dated");
    expect(html).toContain("Progress is not reported for");
    expect(html).toContain("10/08/27");
    expect(html).not.toContain("NaN");
  });
  it("highlights overdue contracts while keeping missing target dates separate", () => {
    const html = render([
      { ...base, initialCompletionDate: "2026-10-01T00:00:00Z" },
      {
        ...base,
        id: "c2",
        contractId: "c2",
        activityId: "a2",
        initialCompletionDate: null,
      },
    ]);
    expect(html).toContain("overdue");
    expect(html).toContain("follow-up");
    expect(html).toContain("10/01/26");
    expect(html).toContain("overdue status cannot be assessed");
  });
});
