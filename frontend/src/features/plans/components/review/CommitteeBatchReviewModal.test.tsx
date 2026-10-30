import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommitteeBatchReviewModal } from "./CommitteeBatchReviewModal";
import type { ProcurementPlan } from "../../plansData";

describe("CommitteeBatchReviewModal", () => {
  const samplePlans: ProcurementPlan[] = [
    {
      id: "plan-1",
      planName: "Goods Plan 2018",
      reference: "PLN-G-001",
      projectCode: "BREFONS",
      category: "Goods",
      budgetYear: "2018 EFY",
      status: "Committee Review",
      activities: [
        {
          id: "act-1",
          reference: "ACT-001",
          description: "Office Laptops",
          estimatedBudget: 500000,
          procurementMethod: "RFQ",
          currency: "ETB",
        },
        {
          id: "act-2",
          reference: "ACT-002",
          description: "Field Vehicles",
          estimatedBudget: 2500000,
          procurementMethod: "RFB",
          currency: "ETB",
        },
      ],
    },
    {
      id: "plan-2",
      planName: "Works Plan 2018",
      reference: "PLN-W-002",
      projectCode: "BREFONS",
      category: "Works",
      budgetYear: "2018 EFY",
      status: "Committee Review",
      activities: [
        {
          id: "act-3",
          reference: "ACT-003",
          description: "Irrigation Canal Renovation",
          estimatedBudget: 8000000,
          procurementMethod: "RFB",
          currency: "ETB",
        },
      ],
    },
  ] as unknown as ProcurementPlan[];

  it("does not render when isOpen is false", () => {
    const markup = renderToStaticMarkup(
      <CommitteeBatchReviewModal
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

  it("renders batch endorsement confirmation when mode is APPROVE", () => {
    const markup = renderToStaticMarkup(
      <CommitteeBatchReviewModal
        isOpen={true}
        onClose={vi.fn()}
        mode="APPROVE"
        plans={samplePlans}
        projectCode="BREFONS"
        onConfirm={vi.fn()}
      />,
    );

    expect(markup).toContain("Batch Committee Endorsement (2 Plans)");
    expect(markup).toContain("Goods Plan 2018");
    expect(markup).toContain("Works Plan 2018");
    expect(markup).toContain("BREFONS");
    expect(markup).toContain("2 Activities");
    expect(markup).toContain("Confirm Endorsement (2 Plans)");
  });

  it("renders batch rejection view with plan selection and activity-level flagging when mode is REJECT", () => {
    const markup = renderToStaticMarkup(
      <CommitteeBatchReviewModal
        isOpen={true}
        onClose={vi.fn()}
        mode="REJECT"
        plans={samplePlans}
        projectCode="BREFONS"
        onConfirm={vi.fn()}
      />,
    );

    expect(markup).toContain("Batch Committee Rejection / Return (2 Plans)");
    expect(markup).toContain("Goods Plan 2018");
    expect(markup).toContain("Works Plan 2018");
    expect(markup).toContain("Specific Activities");
    expect(markup).toContain("Entire Plan");
    expect(markup).toContain("Committee Objection Remarks / Instructions *");
    expect(markup).toContain("Submit Rejection Votes (2 Plans)");
  });
});
