import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectPortfolioDashboard } from "./ProjectPortfolioDashboard";
import type { ExecutiveRecord } from "./model";

const record = (
  id: string,
  projectId: string,
  project: string,
  portfolioStatus: ExecutiveRecord["portfolioStatus"],
): ExecutiveRecord => ({
  id,
  activityId: id,
  portfolioStatus,
  contractId: null,
  reference: id,
  description: "Activity",
  projectId,
  project,
  itemType: "WORKS",
  sourceCategory: "Works",
  estimate: null,
  estimateCurrency: null,
  currency: null,
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
});

describe("project portfolio dashboard", () => {
  it("shows each project's unique activity totals and status counts", () => {
    const html = renderToStaticMarkup(
      <ProjectPortfolioDashboard
        records={[
          record("a1", "p1", "Project Alpha", "NOT_STARTED"),
          record("a2", "p1", "Project Alpha", "CONTRACT_DELIVERY"),
          record("a3", "p2", "Project Beta", "COMPLETED"),
        ]}
      />,
    );

    expect(html).toContain("Project Portfolio Dashboard");
    expect(html).toContain("Project Alpha");
    expect(html).toContain("Project Beta");
    expect(html).toContain("On contract delivery");
    expect(html).toContain(">2</td>");
    expect(html).toContain(">1</td>");
  });
});
