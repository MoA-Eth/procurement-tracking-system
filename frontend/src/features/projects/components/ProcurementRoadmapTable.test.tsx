import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  countRoadmapOrderErrors,
  ProcurementRoadmapTable,
  type ProcurementRoadmapStage,
} from "./ProcurementRoadmapTable";

function stage(
  name: string,
  gregorianDate: string,
  ethiopianDate: string,
): ProcurementRoadmapStage {
  return {
    allowNotApplicable: false,
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
    expect(markup).toContain("25-Jul-2026");
    expect(markup).toContain("18-Hamle-2018");
    expect(markup).toContain("13 days");
  });

  it("detects roadmap dates that move backwards", () => {
    const stages = [
      stage("Bid Opening", "2026-08-25", "19-Nehase-2018"),
      stage("Evaluation Report", "2026-08-20", "14-Nehase-2018"),
    ];

    expect(countRoadmapOrderErrors(stages)).toBe(1);
  });
});
