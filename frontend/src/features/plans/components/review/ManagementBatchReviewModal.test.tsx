import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ManagementBatchReviewModal } from "./ManagementBatchReviewModal";
import type { ProcurementPlan } from "../../plansData";

describe("ManagementBatchReviewModal", () => {
  const samplePlans: ProcurementPlan[] = [
    {
      id: "plan-1",
      planName: "Irrigation Hardware Package",
      reference: "PLN-G-001",
      projectCode: "BREFONS",
      category: "Goods",
      budgetYear: "2018 EFY",
      status: "Awaiting Management Approval",
      estimatedValue: 4500000,
      activities: [
        {
          id: "act-1",
          reference: "ACT-001",
          description: "Submersible Pumps",
          estimatedBudget: 4500000,
          procurementMethod: "RFB",
          currency: "ETB",
        },
      ],
    },
    {
      id: "plan-2",
      planName: "Canal Construction Civil Works",
      reference: "PLN-W-002",
      projectCode: "BREFONS",
      category: "Works",
      budgetYear: "2018 EFY",
      status: "Awaiting Management Approval",
      estimatedValue: 12000000,
      activities: [
        {
          id: "act-2",
          reference: "ACT-002",
          description: "Main Canal Earthworks",
          estimatedBudget: 12000000,
          procurementMethod: "RFB",
          currency: "ETB",
        },
      ],
    },
  ] as unknown as ProcurementPlan[];

  it("does not render when isOpen is false", () => {
    const markup = renderToStaticMarkup(
      <ManagementBatchReviewModal
        isOpen={false}
        onClose={vi.fn()}
        mode="APPROVE"
        plans={samplePlans}
        projectCode="BREFONS"
        onConfirm={vi.fn()}
      />,
    );
    expect(markup).toBe("");
  });

  it("renders executive batch authorization summary when mode is APPROVE", () => {
    const markup = renderToStaticMarkup(
      <ManagementBatchReviewModal
        isOpen={true}
        onClose={vi.fn()}
        mode="APPROVE"
        plans={samplePlans}
        projectCode="BREFONS"
        onConfirm={vi.fn()}
      />,
    );

    expect(markup).toContain(
      "Executive Management — Batch Authorization (2 Plans)",
    );
    expect(markup).toContain("Total Authorization");
    expect(markup).toContain("ETB 16,500,000.00");
    expect(markup).toContain("2 Packages");
    expect(markup).toContain("2 Activities");
    expect(markup).toContain("Committee Quorum");
    expect(markup).toContain("Executive / Board Minute Reference Number");
    expect(markup).toContain("Grant Executive Authorization (2 Plans)");
  });

  it("renders executive batch return view when mode is REJECT", () => {
    const markup = renderToStaticMarkup(
      <ManagementBatchReviewModal
        isOpen={true}
        onClose={vi.fn()}
        mode="REJECT"
        plans={samplePlans}
        projectCode="BREFONS"
        onConfirm={vi.fn()}
      />,
    );

    expect(markup).toContain(
      "Executive Management — Return Plans for Revision (2 Plans)",
    );
    expect(markup).toContain("Return Plans for Restructuring / Revision");
    expect(markup).toContain("Irrigation Hardware Package");
    expect(markup).toContain("Canal Construction Civil Works");
    expect(markup).toContain(
      "Executive Directives / Strategic Rejection Remarks *",
    );
    expect(markup).toContain("Return Selected Plans (2)");
  });
});
