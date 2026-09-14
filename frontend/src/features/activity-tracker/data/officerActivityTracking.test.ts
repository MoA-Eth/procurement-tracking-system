import { describe, expect, it } from "vitest";
import { officerContracts } from "../../contracts/data/officerContracts";
import type { ProcurementActivitySummary } from "@/features/projects/data/officerActivityDrafts";
import {
  calculateDelayDays,
  createInitialActivityTrackingRecord,
  effectiveTargetDate,
  parseActivityTrackingRecords,
  upsertActivityTrackingRecord,
  type ActivityStageTracking,
} from "./officerActivityTracking";

const activity: ProcurementActivitySummary = {
  category: "Goods",
  currentStage: "Bid Opening",
  description: "Procurement of Veterinary Vaccines",
  estimatedAmount: 45_000_000,
  method: "RFB - National",
  reference: "ET-MoA-000001-GO-RFB",
  status: "In Progress",
};

// Inline mock for a completed activity — has a full roadmap with all stages done.
const completedActivity: ProcurementActivitySummary = {
  category: "Goods",
  currentStage: "Contract Completion",
  description: "Supply of Veterinary Cold Chain Equipment (Completed)",
  estimatedAmount: 8_500_000,
  method: "RFQ / Shopping",
  reference: "ET-MoA-000006-GO-RFQ",
  status: "Completed",
  details: {
    componentAllocations: [
      { id: "Livestock Value Chains", percent: "100", selected: true },
    ],
    financingAllocations: [{ id: "IDA-E0380", percent: "100", selected: true }],
    form: {
      activityDescription: "Supply of Veterinary Cold Chain Equipment",
      classificationCode: "42221500",
      comments: "",
      contractType: "Lump Sum",
      currency: "ETB",
      domesticPreference: "No",
      estimatedAmount: "8500000",
      evaluationOptionCode: "",
      fundingSource: "World Bank",
      highRiskCode: "",
      inProcess: false,
      invitationReference: "",
      latitude: "",
      location: "Federal",
      longitude: "",
      lotRequired: false,
      marketApproach: "Open - National",
      method: "rfq",
      oversightClassification: "",
      pricingBasis: "Not Applicable",
      procurementDocumentType: "RFQ SPD",
      procurementProcess: "Single Stage",
      qualificationApproach: "Post-qualification",
      requiresUnAgency: false,
      reviewType: "Post Review",
      scopeNotes: "",
      specificMethod: "RFQ / Shopping",
      subcomponent: "",
    },
    lots: [],
    roadmap: [
      {
        allowNotApplicable: false,
        days: "7",
        ethiopianDate: "03-Hamle-2018",
        gregorianDate: "2026-07-10",
        name: "Preparation of Specification",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "3",
        ethiopianDate: "06-Hamle-2018",
        gregorianDate: "2026-07-13",
        name: "Invitation to Quote",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "14",
        ethiopianDate: "20-Hamle-2018",
        gregorianDate: "2026-07-27",
        name: "Submission and Opening of Quotations",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "5",
        ethiopianDate: "25-Hamle-2018",
        gregorianDate: "2026-08-01",
        name: "Evaluation Report",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "3",
        ethiopianDate: "28-Hamle-2018",
        gregorianDate: "2026-08-04",
        name: "Notification of Award",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "14",
        ethiopianDate: "12-Nehase-2018",
        gregorianDate: "2026-08-18",
        name: "Signed Contract",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "30",
        ethiopianDate: "12-Meskerem-2019",
        gregorianDate: "2026-09-17",
        name: "Contract Completion",
        notApplicable: false,
        remarks: "",
      },
    ],
  },
};

// Inline mock for an in-progress contracted activity.
const contractedActivity: ProcurementActivitySummary = {
  category: "Goods",
  currentStage: "Signed Contract",
  description: "Procurement of Vaccines and Lab Supplies",
  estimatedAmount: 45_000_000,
  method: "RFB - National",
  reference: "ET-MoA-000001-GO-RFB",
  status: "In Progress",
  details: {
    componentAllocations: [
      { id: "Livestock Value Chains", percent: "100", selected: true },
    ],
    financingAllocations: [{ id: "IDA-E0380", percent: "100", selected: true }],
    form: {
      activityDescription: "Procurement of Vaccines and Lab Supplies",
      classificationCode: "42221501",
      comments: "",
      contractType: "Lump Sum",
      currency: "ETB",
      domesticPreference: "No",
      estimatedAmount: "45000000",
      evaluationOptionCode: "",
      fundingSource: "World Bank",
      highRiskCode: "",
      inProcess: true,
      invitationReference: "",
      latitude: "",
      location: "Federal",
      longitude: "",
      lotRequired: false,
      marketApproach: "Open - National",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "Not Applicable",
      procurementDocumentType: "Request for Bids SPD (Goods) - 1 envelope",
      procurementProcess: "Single Stage - One Envelope",
      qualificationApproach: "Post-qualification",
      requiresUnAgency: false,
      reviewType: "Prior Review",
      scopeNotes: "",
      specificMethod: "Request for Bids",
      subcomponent: "",
    },
    lots: [],
    roadmap: [
      {
        allowNotApplicable: false,
        days: "14",
        ethiopianDate: "02-Hamle-2018",
        gregorianDate: "2026-07-09",
        name: "Preparation of Specification",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "7",
        ethiopianDate: "09-Hamle-2018",
        gregorianDate: "2026-07-16",
        name: "Draft Bidding Document",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "28",
        ethiopianDate: "07-Nehase-2018",
        gregorianDate: "2026-08-13",
        name: "Issuance of Bidding Document",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "3",
        ethiopianDate: "10-Nehase-2018",
        gregorianDate: "2026-08-16",
        name: "Bid Opening",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "21",
        ethiopianDate: "01-Meskerem-2019",
        gregorianDate: "2026-09-06",
        name: "Bid Evaluation Report",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "5",
        ethiopianDate: "06-Meskerem-2019",
        gregorianDate: "2026-09-11",
        name: "Notification of Award",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "14",
        ethiopianDate: "20-Meskerem-2019",
        gregorianDate: "2026-09-25",
        name: "Signed Contract",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "90",
        ethiopianDate: "20-Tahisas-2019",
        gregorianDate: "2026-12-24",
        name: "Contract Completion",
        notApplicable: false,
        remarks: "",
      },
    ],
  },
};

// Inline mock for a delayed activity.
const delayedActivity: ProcurementActivitySummary = {
  category: "Goods",
  currentStage: "Bid Evaluation Report",
  description: "Supply of Agricultural Machinery",
  estimatedAmount: 22_000_000,
  method: "RFB - National",
  reference: "ET-MoA-000002-GO-RFB",
  status: "Delayed",
  details: {
    componentAllocations: [
      { id: "Livestock Value Chains", percent: "100", selected: true },
    ],
    financingAllocations: [{ id: "IDA-E0380", percent: "100", selected: true }],
    form: {
      activityDescription: "Supply of Agricultural Machinery",
      classificationCode: "44100000",
      comments: "",
      contractType: "Lump Sum",
      currency: "ETB",
      domesticPreference: "No",
      estimatedAmount: "22000000",
      evaluationOptionCode: "",
      fundingSource: "World Bank",
      highRiskCode: "",
      inProcess: true,
      invitationReference: "",
      latitude: "",
      location: "Oromia",
      longitude: "",
      lotRequired: false,
      marketApproach: "Open - National",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "Not Applicable",
      procurementDocumentType: "Request for Bids SPD (Goods) - 1 envelope",
      procurementProcess: "Single Stage - One Envelope",
      qualificationApproach: "Post-qualification",
      requiresUnAgency: false,
      reviewType: "Prior Review",
      scopeNotes: "",
      specificMethod: "Request for Bids",
      subcomponent: "",
    },
    lots: [],
    roadmap: [
      {
        allowNotApplicable: false,
        days: "14",
        ethiopianDate: "02-Hamle-2018",
        gregorianDate: "2026-07-09",
        name: "Preparation of Specification",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "7",
        ethiopianDate: "09-Hamle-2018",
        gregorianDate: "2026-07-16",
        name: "Draft Bidding Document",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "21",
        ethiopianDate: "01-Meskerem-2019",
        gregorianDate: "2026-09-06",
        name: "Bid Evaluation Report",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "5",
        ethiopianDate: "06-Meskerem-2019",
        gregorianDate: "2026-09-11",
        name: "Notification of Award",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "14",
        ethiopianDate: "20-Meskerem-2019",
        gregorianDate: "2026-09-25",
        name: "Signed Contract",
        notApplicable: false,
        remarks: "",
      },
      {
        allowNotApplicable: false,
        days: "90",
        ethiopianDate: "20-Tahisas-2019",
        gregorianDate: "2026-12-24",
        name: "Contract Completion",
        notApplicable: false,
        remarks: "",
      },
    ],
  },
};

describe("officer activity tracking", () => {
  it("creates an execution record without changing planning data", () => {
    const record = createInitialActivityTrackingRecord(
      "PRJ-24-001",
      "PP-DRIVE-2016-01",
      activity,
    );
    expect(record.processStatus).toBe("Under Implementation");
    expect(record.progressPercent).toBe(50);
    expect(record.stages).toEqual([]);
  });

  it("materializes a completed activity with its approved roadmap", () => {
    const record = createInitialActivityTrackingRecord(
      "PRJ-24-001",
      "PP-DRIVE-2016-01",
      completedActivity,
    );
    expect(completedActivity.status).toBe("Completed");
    expect(completedActivity.currentStage).toBe("Contract Completion");
    expect(record.processStatus).toBe("Completed");
    expect(record.progressPercent).toBe(100);
    expect(
      record.stages.every(
        (stage) =>
          stage.status === "Completed" || stage.status === "Not Applicable",
      ),
    ).toBe(true);
  });

  it("materializes an in-progress contracted activity with partial execution", () => {
    const record = createInitialActivityTrackingRecord(
      "PRJ-24-001",
      "PP-DRIVE-2016-01",
      contractedActivity,
    );
    expect(contractedActivity.status).toBe("In Progress");
    expect(contractedActivity.currentStage).toBe("Signed Contract");
    expect(record.processStatus).toBe("Signed");
    expect(record.progressPercent).toBeGreaterThan(50);
  });

  it("materializes a delayed activity with mid-stage tracking and delay details", () => {
    const record = createInitialActivityTrackingRecord(
      "PRJ-24-001",
      "PP-DRIVE-2016-01",
      delayedActivity,
    );
    expect(delayedActivity.status).toBe("Delayed");
    expect(record.stages.some((stage) => stage.status === "In Progress")).toBe(
      true,
    );
    expect(record.stages.some((stage) => stage.status === "Not Started")).toBe(
      true,
    );
  });

  it("uses the latest revision as the effective target and preserves history", () => {
    const tracking: ActivityStageTracking = {
      remarks: "",
      revisions: [
        {
          createdAt: "2026-08-01T00:00:00.000Z",
          reason: "Evaluation required additional clarification.",
          revisionNumber: 1,
          targetDate: { ethiopian: "25-Nehase-2018", gregorian: "2026-08-31" },
        },
        {
          createdAt: "2026-08-10T00:00:00.000Z",
          reason: "Committee meeting rescheduled.",
          revisionNumber: 2,
          targetDate: {
            ethiopian: "05-Meskerem-2019",
            gregorian: "2026-09-15",
          },
        },
      ],
      stageName: "Evaluation Approval",
      status: "In Progress",
    };
    expect(
      effectiveTargetDate(
        { ethiopian: "01-Nehase-2018", gregorian: "2026-08-07" },
        tracking,
      ).gregorian,
    ).toBe("2026-09-15");
    expect(tracking.revisions).toHaveLength(2);
  });

  it("calculates delay from actual/current date and ignores N/A stages", () => {
    const original = { ethiopian: "01-Nehase-2018", gregorian: "2026-08-07" };
    expect(calculateDelayDays(original, undefined, "2026-08-21")).toBe(14);
    expect(
      calculateDelayDays(
        original,
        {
          actualDate: { ethiopian: "20-Nehase-2018", gregorian: "2026-08-26" },
          remarks: "",
          revisions: [],
          stageName: "Bid Opening",
          status: "Completed",
        },
        "2026-08-21",
      ),
    ).toBe(19);
    expect(
      calculateDelayDays(
        original,
        {
          remarks: "",
          revisions: [],
          stageName: "Optional Approval",
          status: "Not Applicable",
        },
        "2026-08-21",
      ),
    ).toBe(0);
  });

  it("round-trips and replaces records by project, plan, and activity", () => {
    const record = {
      ...createInitialActivityTrackingRecord(
        "PRJ-24-001",
        "PP-DRIVE-2016-01",
        activity,
      ),
      updatedAt: "2026-08-21T00:00:00.000Z",
    };
    expect(parseActivityTrackingRecords(JSON.stringify([record]))).toEqual([
      record,
    ]);
    expect(
      upsertActivityTrackingRecord([record], {
        ...record,
        progressPercent: 75,
      }),
    ).toEqual([{ ...record, progressPercent: 75 }]);
  });
});
