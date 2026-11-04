import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FinancialPositionDashboard } from "./FinancialPositionDashboard";
import type { ExecutiveRecord } from "./model";

const record = (
  id: string,
  projectId: string,
  project: string,
  estimate: number,
  estimateCurrency: string,
  portfolioStatus: ExecutiveRecord["portfolioStatus"],
): ExecutiveRecord => ({
  id,
  activityId: id,
  activityStatus: "APPROVED",
  portfolioStatus,
  contractId: null,
  reference: id,
  description: project,
  projectId,
  project,
  itemType: "WORKS",
  sourceCategory: "WORKS",
  estimate,
  estimateCurrency,
  currency: estimateCurrency,
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

describe("financial position dashboard", () => {
  it("shows estimates by currency, stage and largest project without double-counting activities", () => {
    const records = [
      record("activity-1", "p1", "FSRP", 6_400_000_000, "ETB", "NOT_STARTED"),
      {
        ...record(
          "contract-1",
          "p1",
          "FSRP",
          6_400_000_000,
          "ETB",
          "NOT_STARTED",
        ),
        activityId: "activity-1",
      },
      record(
        "activity-2",
        "p2",
        "PSNP",
        5_190_000_000,
        "ETB",
        "BID_EVALUATION",
      ),
      record(
        "activity-3",
        "p3",
        "DRIVE",
        2_690_000_000,
        "ETB",
        "CONTRACT_DELIVERY",
      ),
      record(
        "activity-4",
        "p4",
        "Completed project",
        180_000_000,
        "ETB",
        "COMPLETED",
      ),
      record(
        "activity-5",
        "p5",
        "USD project",
        40_510_000,
        "USD",
        "BID_ADVERTISED",
      ),
      record(
        "activity-6",
        "p6",
        "EUR project",
        6_700_000,
        "EUR",
        "BID_ADVERTISED",
      ),
    ];

    const html = renderToStaticMarkup(
      <FinancialPositionDashboard records={records} />,
    );

    expect(html).toContain("Financial position");
    expect(html).toContain("14.46 bn");
    expect(html).toContain("40.51 m");
    expect(html).toContain("USD</span>");
    expect(html).toContain("6.70 m");
    expect(html).toContain("EUR</span>");
    expect(html).toContain("Birr portfolio by procurement stage");
    expect(html).toContain("14.46 bn");
    expect(html).toContain("2.69 bn");
    expect(html).toContain("180.00 m");
    expect(html).toContain("Largest projects by value");
    expect(html).toContain("FSRP");
    expect(html).toContain("1 activity");
  });
});
