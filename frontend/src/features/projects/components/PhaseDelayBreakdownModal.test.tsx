import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PhaseDelayBreakdownModal,
  computePhaseMetrics,
  calculateRealActivityDelay,
  type PhaseDelayModalData,
} from "./PhaseDelayBreakdownModal";

describe("PhaseDelayBreakdownModal and calculations", () => {
  describe("computePhaseMetrics", () => {
    it("correctly computes planned duration and delay for a completed stage", () => {
      const now = new Date("2026-06-01T00:00:00Z").getTime();
      const stage = {
        name: "Bid Submission & Opening",
        sequence: 1,
        status: "COMPLETED",
        plannedStartDate: "2026-01-01",
        plannedEndDate: "2026-01-15",
        actualStartDate: "2026-01-01",
        actualEndDate: "2026-01-20", // 5 days late
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.name).toBe("Bid Submission & Opening");
      expect(result.plannedDurationDays).toBe(14);
      expect(result.actualDurationDays).toBe(19);
      expect(result.delayDays).toBe(5);
      expect(result.status).toBe("Completed (Delayed)");
    });

    it("correctly computes 0 delay for an on-time completed stage", () => {
      const now = new Date("2026-06-01T00:00:00Z").getTime();
      const stage = {
        name: "Preparation of TOR",
        sequence: 1,
        status: "COMPLETED",
        plannedStartDate: "2026-01-01",
        plannedEndDate: "2026-01-15",
        actualStartDate: "2026-01-01",
        actualEndDate: "2026-01-14",
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.delayDays).toBe(0);
      expect(result.status).toBe("Completed");
    });

    it("correctly computes delay for an in-progress stage past its target date", () => {
      const now = new Date("2026-02-10T00:00:00Z").getTime();
      const stage = {
        name: "Bid Evaluation",
        sequence: 2,
        status: "IN_PROGRESS",
        plannedStartDate: "2026-01-15",
        plannedEndDate: "2026-01-30",
        actualStartDate: "2026-01-15",
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.delayDays).toBe(11); // Jan 30 to Feb 10 = 11 days
      expect(result.actualDurationDays).toBe(26); // 15 planned + 11 delay = 26
      expect(result.status).toBe("Delayed");
    });

    it("ensures in-progress delayed stage matches Planned Days + Process Delay (no inflated elapsed days from early activation)", () => {
      // Activity MOA/AGP2/GW/W-04/2024:
      // Planned: 09-Sep-2026 to 23-Sep-2026 (14 days)
      // Activated early in DB: 25-Aug-2026
      // Today: 05-Oct-2026 (12 days past target end date 23-Sep-2026)
      const now = new Date("2026-10-05T12:00:00Z").getTime();
      const stage = {
        name: "Bid evaluation report submission date",
        sequence: 3,
        status: "IN_PROGRESS",
        plannedStartDate: "2026-09-09",
        plannedEndDate: "2026-09-23",
        currentTargetEndDate: "2026-09-23",
        actualStartDate: "2026-08-25T09:46:22.815Z",
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.plannedDurationDays).toBe(14);
      expect(result.delayDays).toBe(12);
      expect(result.actualDurationDays).toBe(26); // 14 planned + 12 delay = 26, NOT 41/42 elapsed
      expect(result.status).toBe("Delayed");
    });

    it("ensures in-progress on-schedule stage displays planned duration without false inflation", () => {
      // Activity MOA/AGP2/NCB/G-02/2024:
      // Planned: 25-Sep-2026 to 09-Oct-2026 (14 days)
      // Activated early in DB: 30-Aug-2026
      // Today: 06-Oct-2026 (3 days before deadline 09-Oct-2026)
      const now = new Date("2026-10-06T12:00:00Z").getTime();
      const stage = {
        name: "Amendments to Pre-qualification Documents",
        sequence: 3,
        status: "IN_PROGRESS",
        plannedStartDate: "2026-09-25",
        plannedEndDate: "2026-10-09",
        currentTargetEndDate: "2026-10-09",
        actualStartDate: "2026-08-30T09:46:22.815Z",
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.plannedDurationDays).toBe(14);
      expect(result.delayDays).toBe(0);
      expect(result.actualDurationDays).toBe(14); // 14 planned, NOT 37 elapsed
      expect(result.status).toBe("In Progress");
    });

    it("does not attribute delay to an unstarted future stage (preventing cascade double counting)", () => {
      const now = new Date("2026-02-10T00:00:00Z").getTime();
      const stage = {
        name: "Contract Negotiations",
        sequence: 3,
        status: "NOT_STARTED",
        plannedStartDate: "2026-02-01",
        plannedEndDate: "2026-02-08",
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.delayDays).toBe(0);
      expect(result.status).toBe("Pending");
    });

    it("handles Not Applicable stages with zero delay", () => {
      const now = new Date("2026-02-10T00:00:00Z").getTime();
      const stage = {
        name: "Prequalification",
        notApplicable: true,
      };

      const result = computePhaseMetrics(stage, now);
      expect(result.delayDays).toBe(0);
      expect(result.actualDurationDays).toBe(0);
      expect(result.status).toBe("Not Applicable");
    });
  });

  describe("calculateRealActivityDelay", () => {
    it("returns 0 for empty or unconfigured stages", () => {
      expect(calculateRealActivityDelay([])).toBe(0);
      expect(calculateRealActivityDelay(undefined)).toBe(0);
    });

    it("returns the maximum active phase delay across real stages", () => {
      const stages = [
        {
          name: "Stage 1",
          status: "COMPLETED",
          plannedEndDate: "2026-01-10",
          actualEndDate: "2026-01-14", // 4 days delay
        },
        {
          name: "Stage 2",
          status: "COMPLETED",
          plannedEndDate: "2026-01-20",
          actualEndDate: "2026-01-29", // 9 days delay
        },
      ];

      expect(calculateRealActivityDelay(stages)).toBe(9);
    });
  });

  describe("PhaseDelayBreakdownModal Component", () => {
    it("renders empty state without mock data when stages array is empty", () => {
      const modalData: PhaseDelayModalData = {
        reference: "MOA-TEST-001",
        title: "Test Procurement Activity",
        totalDelayDays: 0,
        stages: [],
      };

      const html = renderToStaticMarkup(
        <PhaseDelayBreakdownModal
          isOpen={true}
          onClose={() => {}}
          data={modalData}
        />,
      );

      expect(html).toContain("No Roadmap Phases Recorded");
      expect(html).toContain("On Track");
      expect(html).toContain("0 Days");
      // Verifies hardcoded mock items are NOT present
      expect(html).not.toContain(
        "Preparation of Terms of Reference / Specifications",
      );
      expect(html).not.toContain("Bid Evaluation & Committee Review");
    });

    it("renders real stages and identifies bottleneck accurately", () => {
      const modalData: PhaseDelayModalData = {
        reference: "MOA-AGR-002",
        title: "Supply of Soil Testing Kits",
        totalDelayDays: 8,
        stages: [
          {
            name: "Preparation of Bidding Documents",
            status: "COMPLETED",
            plannedStartDate: "2026-01-01",
            plannedEndDate: "2026-01-15",
            actualStartDate: "2026-01-01",
            actualEndDate: "2026-01-15",
          },
          {
            name: "Technical Bid Evaluation",
            status: "COMPLETED",
            plannedStartDate: "2026-01-16",
            plannedEndDate: "2026-01-30",
            actualStartDate: "2026-01-16",
            actualEndDate: "2026-02-07", // 8 days delay
          },
        ],
      };

      const html = renderToStaticMarkup(
        <PhaseDelayBreakdownModal
          isOpen={true}
          onClose={() => {}}
          data={modalData}
        />,
      );

      expect(html).toContain("Technical Bid Evaluation");
      expect(html).toContain("Preparation of Bidding Documents");
      expect(html).toContain("+8 Days");
      expect(html).toContain("8 Days Delayed");
      expect(html).toContain("Contributed +8 days delay");
    });
  });
});
