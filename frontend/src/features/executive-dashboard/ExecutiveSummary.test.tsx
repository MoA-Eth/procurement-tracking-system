import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExecutiveSummary } from "./ExecutiveSummary";
import type { ExecutiveRecord } from "./model";

const base: ExecutiveRecord = {
  id: "activity:1",
  activityId: "activity:1",
  activityStatus: "APPROVED",
  contractId: null,
  reference: "WORKS-001",
  description: "Construction",
  projectId: "project-1",
  project: "Project one",
  itemType: "WORKS",
  sourceCategory: "WORKS",
  estimate: 100,
  estimateCurrency: "ETB",
  currency: "ETB",
  invitationDate: null,
  bidOpeningDate: null,
  signedDate: null,
  supplier: null,
  country: null,
  initialAmount: null,
  initialCompletionDate: null,
  revisedCompletionDate: null,
  actualCompletionDate: null,
  complete: null,
  completionPct: null,
  status: "PRE_CONTRACT",
};

describe("executive summary", () => {
  it("shows portfolio totals, progress categories, and shares in four cards", () => {
    const records = [
      { ...base, portfolioStatus: "NOT_STARTED" as const },
      {
        ...base,
        id: "activity:2",
        activityId: "activity:2",
        activityStatus: "PLANNED",
        portfolioStatus: "BID_ADVERTISED" as const,
        invitationDate: "2026-10-01",
      },
      {
        ...base,
        id: "contract:3",
        activityId: "activity:3",
        activityStatus: "CONTRACTED",
        portfolioStatus: "CONTRACT_AWARDED" as const,
        contractId: "contract-3",
        complete: false,
      },
      {
        ...base,
        id: "contract:4",
        activityId: "activity:4",
        activityStatus: "COMPLETED",
        portfolioStatus: "COMPLETED" as const,
        contractId: "contract-4",
        complete: true,
      },
    ];
    const html = renderToStaticMarkup(<ExecutiveSummary rows={records} />);

    expect(html).toContain("4 Total activities");
    expect(html).toContain("1 projects");
    expect(html).toContain("Not yet to market");
    expect(html).toContain("In tendering");
    expect(html).toContain("Awarded / delivery");
    expect(html).toContain("Completed");
    expect(html.match(/25\.0% of portfolio/g)).toHaveLength(4);
    expect(html).toContain(
      "Of 4 activities, 1 activity has not yet been advertised.",
    );
  });

  it("uses the database activity total for the headline and portfolio shares", () => {
    const records = [
      { ...base, portfolioStatus: "NOT_STARTED" as const },
      {
        ...base,
        id: "activity:2",
        activityId: "activity:2",
        activityStatus: "PLANNED",
        portfolioStatus: "BID_ADVERTISED" as const,
        invitationDate: "2026-10-01",
      },
    ];
    const html = renderToStaticMarkup(
      <ExecutiveSummary rows={records} totalActivities={9} />,
    );

    expect(html).toContain("9 Total activities");
    expect(html).toContain("Of 9 activities,");
    expect(html.match(/11\.1% of portfolio/g)).toHaveLength(2);
  });
});
