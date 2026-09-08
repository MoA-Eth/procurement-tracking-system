import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommitteeRejectionModal } from "./CommitteeRejectionModal";

describe("CommitteeRejectionModal", () => {
  const sampleActivities = [
    {
      id: "act-1",
      activityRefNo: "BREFONS-G-01",
      description: "Procurement of Agricultural Equipment",
      method: "RFB - National",
      estimatedAmount: 5000000,
      currency: "ETB",
    },
    {
      id: "act-2",
      activityRefNo: "BREFONS-W-02",
      description: "Construction of Irrigation Canals",
      method: "RFB - National",
      estimatedAmount: 12000000,
      currency: "ETB",
    },
  ];

  it("does not render when isOpen is false", () => {
    const markup = renderToStaticMarkup(
      <CommitteeRejectionModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        activities={sampleActivities}
        planName="BREFONS 2026 Annual Plan"
        projectCode="BREFONS"
      />,
    );
    expect(markup).toBe("");
  });

  it("renders with scope options, activities checklist, and required feedback when isOpen is true", () => {
    const markup = renderToStaticMarkup(
      <CommitteeRejectionModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        activities={sampleActivities}
        planName="BREFONS 2026 Annual Plan"
        projectCode="BREFONS"
      />,
    );

    // Header and context
    expect(markup).toContain("Committee Rejection / Return for Revision");
    expect(markup).toContain("BREFONS 2026 Annual Plan");
    expect(markup).toContain("BREFONS");

    // Scope selection options
    expect(markup).toContain("Specific Activities");
    expect(markup).toContain("All Activities (Entire Plan)");

    // Activity items in checklist
    expect(markup).toContain("BREFONS-G-01");
    expect(markup).toContain("Procurement of Agricultural Equipment");
    expect(markup).toContain("BREFONS-W-02");
    expect(markup).toContain("Construction of Irrigation Canals");

    // Preselected first activity shows Flagged for Rejection badge
    expect(markup).toContain("Flagged for Rejection");

    // Feedback textarea and confirm button
    expect(markup).toContain("Committee Feedback &amp; Deliberation Notes");
    expect(markup).toContain("Confirm Rejection");
  });
});
