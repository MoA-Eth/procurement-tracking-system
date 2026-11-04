import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsolidatedPortfolio } from "./ConsolidatedPortfolio";
import type { ExecutiveRecord } from "./model";

const base: ExecutiveRecord = {
  id: "activity:1",
  activityId: "activity:1",
  portfolioStatus: "NOT_STARTED",
  contractId: null,
  reference: "A-001",
  description: "Procurement activity",
  projectId: "project-1",
  project: "Project one",
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
};

describe("consolidated portfolio", () => {
  it("shows each implementation status, portfolio share, and total", () => {
    const records: ExecutiveRecord[] = [
      base,
      {
        ...base,
        id: "activity:2",
        activityId: "activity:2",
        portfolioStatus: "BIDDING_DOCUMENT_PREPARATION",
      },
      {
        ...base,
        id: "activity:3",
        activityId: "activity:3",
        portfolioStatus: "BID_ADVERTISED",
      },
      {
        ...base,
        id: "activity:4",
        activityId: "activity:4",
        portfolioStatus: "BID_EVALUATION",
      },
      {
        ...base,
        id: "activity:5",
        activityId: "activity:5",
        portfolioStatus: "CONTRACT_AWARDED",
      },
      {
        ...base,
        id: "activity:6",
        activityId: "activity:6",
        portfolioStatus: "CONTRACT_DELIVERY",
      },
      {
        ...base,
        id: "activity:7",
        activityId: "activity:7",
        portfolioStatus: "COMPLETED",
      },
    ];
    const html = renderToStaticMarkup(<ConsolidatedPortfolio records={records} />);

    expect(html).toContain('class="w-full min-w-[620px] table-fixed');
    expect(html).toContain(
      '<colgroup><col style="width:7%"/><col style="width:22%"/><col style="width:10%"/><col style="width:10%"/><col style="width:51%"/></colgroup>',
    );

    for (const label of [
      "Not Started / Awaiting Approvals",
      "On Bidding Document Preparation",
      "Bid Advertised",
      "Under Bid Evaluation",
      "Contract Awarded / Signed",
      "On Contract Delivery",
      "Completed",
    ])
      expect(html).toContain(label);

    expect(html).toContain(">7</td>");
    expect(html.match(/14\.3%/g)).toHaveLength(14);
    expect(html).toContain("100%");
  });
});
