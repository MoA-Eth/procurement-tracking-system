import { describe, expect, it } from "vitest";
import {
  addSavedActivityRecord,
  mergeActivityRoadmaps,
  mapBackendActivityToProcurementActivitySummary,
  mapRoadmapStagesForBackend,
  parseSavedActivityRecords,
  type SavedOfficerActivityRecord,
} from "./officerActivityDrafts";

const record: SavedOfficerActivityRecord = {
  activity: {
    category: "Goods",
    currentStage: "Draft Request for Quotations",
    description: "Supply of veterinary cold-chain equipment",
    estimatedAmount: 2_500_000,
    method: "RFQ / Shopping",
    reference: "ET-MoA-000013-GO-RFQ",
    status: "Not Started",
  },
  planReference: "PP-DRIVE-2016-01",
  projectCode: "PRJ-24-001",
};

const detailedRecord: SavedOfficerActivityRecord = {
  ...record,
  activity: {
    ...record.activity,
    details: {
      componentAllocations: [
        { id: "Livestock Value Chains", percent: "100", selected: true },
      ],
      financingAllocations: [
        { id: "IDA-E0380", percent: "100", selected: true },
      ],
      form: {
        activityDescription: record.activity.description,
        classificationCode: "42211507",
        comments: "",
        contractType: "Lump Sum",
        currency: "ETB",
        domesticPreference: "No",
        estimatedAmount: "2500000",
        evaluationOptionCode: "",
        fundingSource: "World Bank",
        highRiskCode: "",
        inProcess: false,
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
          days: "",
          ethiopianDate: "02-Hamle-2018",
          gregorianDate: "2026-07-12",
          name: "Preparation of Specification",
          notApplicable: false,
          remarks: "",
        },
      ],
    },
  },
};

describe("officer activity draft storage", () => {
  it("maps backend draft status and per-activity procurement category", () => {
    const activity = mapBackendActivityToProcurementActivitySummary({
      id: "activity-id",
      reference: "ACT-001",
      status: "DRAFT",
      description: "Supply of equipment",
      estimatedBudget: 500,
      procurementCategory: "WORKS",
      procurementMethod: { label: "Request for Bids" },
      plan: { procurementCategory: "GOODS" },
      stages: [],
    });

    expect(activity.status).toBe("Draft");
    expect(activity.category).toBe("Works");
  });

  it("maps entered roadmap dates into backend stage payloads", () => {
    expect(
      mapRoadmapStagesForBackend([
        {
          allowNotApplicable: true,
          days: "14",
          ethiopianDate: "02-Hamle-2018",
          gregorianDate: "2026-07-12",
          name: "Preparation of Specification",
          notApplicable: false,
          remarks: "",
        },
      ]),
    ).toEqual([
      {
        name: "Preparation of Specification",
        sequence: 1,
        plannedStartDate: "2026-07-12",
        plannedEndDate: undefined,
        currentTargetStartDate: "2026-07-12",
        currentTargetEndDate: undefined,
        gregorianDate: "2026-07-12",
        ethiopianDate: "02-Hamle-2018",
        isNotApplicable: false,
        notApplicable: false,
        remarks: undefined,
      },
    ]);
  });

  it("uses a saved target date when the planned date is absent", () => {
    expect(
      mapRoadmapStagesForBackend([
        {
          allowNotApplicable: false,
          days: "14",
          ethiopianDate: "",
          gregorianDate: "",
          currentTargetStartDate: "2026-08-03",
          name: "Bid Evaluation",
          notApplicable: false,
          remarks: "",
        },
      ]),
    ).toEqual([
      {
        name: "Bid Evaluation",
        sequence: 1,
        plannedStartDate: "2026-08-03",
        plannedEndDate: undefined,
        currentTargetStartDate: "2026-08-03",
        currentTargetEndDate: undefined,
        gregorianDate: "2026-08-03",
        ethiopianDate: undefined,
        isNotApplicable: false,
        notApplicable: false,
        remarks: undefined,
      },
    ]);
  });

  it("preserves backend milestone dates when a local activity copy has blanks", () => {
    const merged = mergeActivityRoadmaps(
      [
        {
          allowNotApplicable: false,
          days: "14",
          ethiopianDate: "02-Hamle-2018",
          gregorianDate: "2026-07-12",
          name: "Preparation of Specification",
          notApplicable: false,
          plannedStartDate: "2026-07-12",
          currentTargetStartDate: "2026-07-12",
          remarks: "",
        },
      ],
      [
        {
          allowNotApplicable: false,
          days: "14",
          ethiopianDate: "",
          gregorianDate: "",
          name: "Preparation of Specification",
          notApplicable: false,
          remarks: "",
        },
      ],
    );

    expect(merged[0]).toMatchObject({
      gregorianDate: "2026-07-12",
      plannedStartDate: "2026-07-12",
      currentTargetStartDate: "2026-07-12",
      ethiopianDate: "02-Hamle-2018",
      notApplicable: false,
    });
  });

  it("round-trips valid saved activity records", () => {
    expect(parseSavedActivityRecords(JSON.stringify([record]))).toEqual([
      record,
    ]);
  });

  it("replaces an activity with the same project, plan, and reference", () => {
    const updated = {
      ...record,
      activity: { ...record.activity, estimatedAmount: 3_000_000 },
    };

    expect(addSavedActivityRecord([record], updated)).toEqual([updated]);
  });

  it("round-trips all four saved wizard sections", () => {
    expect(parseSavedActivityRecords(JSON.stringify([detailedRecord]))).toEqual(
      [detailedRecord],
    );
  });

  it("ignores malformed browser data", () => {
    expect(parseSavedActivityRecords("not-json")).toEqual([]);
    expect(parseSavedActivityRecords(JSON.stringify([{ bad: true }]))).toEqual(
      [],
    );
  });

  it("filters out test verification activities and junk records", () => {
    const testRecords = [
      {
        projectCode: "SLMP",
        planReference: "PP-SLMP-2018",
        activity: {
          reference: "ACT-TEST-2063",
          description: "Test Verification Activity 2063",
          estimatedAmount: 100000,
          method: "RFQ",
          category: "Goods",
          currentStage: "Preparation",
          status: "Not Started",
        },
      },
      {
        projectCode: "CREW",
        planReference: "PP-CREW-2018",
        activity: {
          reference: "ACT-001",
          description: "vermy culture center",
          estimatedAmount: 100000,
          method: "RFQ",
          category: "Goods",
          currentStage: "Preparation",
          status: "Not Started",
        },
      },
      {
        projectCode: "CREW",
        planReference: "PP-CREW-2018",
        activity: {
          reference: "ACT-002",
          description: "Consultancy Consultancy",
          estimatedAmount: 100000,
          method: "QCBS",
          category: "Consultancy Services",
          currentStage: "Preparation",
          status: "Not Started",
        },
      },
      {
        projectCode: "CREW",
        planReference: "PP-CREW-2018",
        activity: {
          reference: "ACT-003",
          description: "test test",
          estimatedAmount: 100000,
          method: "RFQ",
          category: "Goods",
          currentStage: "Preparation",
          status: "Not Started",
        },
      },
      record, // valid record
    ];

    const result = parseSavedActivityRecords(JSON.stringify(testRecords));
    expect(result).toHaveLength(1);
    expect(result[0].activity.reference).toBe("ET-MoA-000013-GO-RFQ");
  });
});
