import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  countRoadmapOrderErrors,
  isRoadmapStageMandatory,
  ProcurementRoadmapTable,
  type ProcurementRoadmapStage,
} from "./ProcurementRoadmapTable";

function stage(
  name: string,
  gregorianDate: string,
  ethiopianDate: string,
  allowNotApplicable = false,
): ProcurementRoadmapStage {
  return {
    allowNotApplicable,
    days: "",
    ethiopianDate,
    gregorianDate,
    name,
    notApplicable: false,
    remarks: "",
  };
}

describe("ProcurementRoadmapTable", () => {
  it("uses compact planning and monitoring tables with dual-calendar dates", () => {
    const stages = [
      stage("Preparation of Specification", "2026-07-12", "05-Hamle-2018"),
      stage("Signed Contract", "2026-07-25", "18-Hamle-2018"),
      stage("Contract Completion", "2026-08-10", "04-Nehase-2018"),
    ];
    const markup = renderToStaticMarkup(
      <ProcurementRoadmapTable
        attempted={false}
        methodLabel="RFB - National"
        onChange={() => undefined}
        stages={stages}
      />,
    );

    expect(markup).toContain("Procurement Planning Roadmap");
    expect(markup).toContain("Procurement Monitoring");
    expect(markup).toContain("25/07/2026 (18-Hamle-2018)");
    expect(markup).toContain("13 days");
  });

  it("detects roadmap dates that move backwards", () => {
    const stages = [
      stage("Bid Opening", "2026-08-25", "19-Nehase-2018"),
      stage("Evaluation Report", "2026-08-20", "14-Nehase-2018"),
    ];

    expect(countRoadmapOrderErrors(stages)).toBe(1);
  });

  it("treats amendment stages as optional so undated amendment stages are not required errors", () => {
    const amendmentStages = [
      "Amendments to Request for Quotations",
      "Amendments to Bidding Documents",
      "Amendments to Pre-qualification Documents",
      "Amendments to Request for Proposals",
      "Contract Amendments",
    ];

    amendmentStages.forEach((name) => {
      expect(isRoadmapStageMandatory({ name, allowNotApplicable: true })).toBe(
        false,
      );
      expect(isRoadmapStageMandatory({ name, allowNotApplicable: false })).toBe(
        false,
      );
    });

    const stages = [
      stage("Draft Request for Quotations", "2026-07-01", "24-Sene-2018"),
      stage("Amendments to Request for Quotations", "", "", true),
      stage("Signed Contract", "2026-07-25", "18-Hamle-2018"),
      stage("Contract Amendments", "", "", true),
      stage("Contract Completion", "2026-08-10", "04-Nehase-2018"),
    ];

    const markup = renderToStaticMarkup(
      <ProcurementRoadmapTable
        attempted={true}
        methodLabel="RFQ"
        onChange={() => undefined}
        stages={stages}
      />,
    );

    // Shows 0 issues because the undated amendment stages are optional!
    expect(markup).toContain("0 issues");
    expect(markup).not.toContain("Planned date is required");
    expect(markup).toContain("Optional date...");
  });
});
