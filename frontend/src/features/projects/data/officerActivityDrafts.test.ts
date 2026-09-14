import { describe, expect, it } from "vitest";
import {
  addSavedActivityRecord,
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
});
