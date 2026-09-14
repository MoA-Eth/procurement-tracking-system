import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProcurementActivityFormValues } from "../../projects/data/officerActivityDrafts";
import { createInitialActivityTrackingRecord } from "../data/officerActivityTracking";

import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../../projects/data/officerProjects";
import type { OfficerTrackedActivityItem } from "./OfficerActivityTrackerView";
import { ActivityTrackingDetailView } from "./ActivityTrackingDetailView";

const activityForm: ProcurementActivityFormValues = {
  activityDescription: "Supply and installation of solar-powered cold rooms",
  classificationCode: "24131500",
  comments: "Priority infrastructure for regional collection centers.",
  contractType: "Lump Sum",
  currency: "USD",
  domesticPreference: "No",
  estimatedAmount: "4500000",
  evaluationOptionCode: "Most Advantageous Bid",
  fundingSource: "World Bank Loan (IDA)",
  highRiskCode: "No",
  inProcess: false,
  invitationReference: "MOA/INV/2026/091",
  latitude: "9.0192",
  location: "Addis Ababa",
  longitude: "38.7525",
  lotRequired: false,
  marketApproach: "Open International",
  method: "Request for Bids (RFB)",
  oversightClassification: "Substantial",
  pricingBasis: "Fixed Price",
  procurementDocumentType: "Request for Bids",
  procurementProcess: "Single Stage - One Envelope",
  qualificationApproach: "Postqualification",
  requiresUnAgency: false,
  reviewType: "Prior Review",
  scopeNotes: "Supply, install, commission, and train operators.",
  specificMethod: "International Competitive Procurement",
  subcomponent: "Cold-chain market infrastructure",
};

const plan: ProcurementPlanSummary = {
  activities: 1,
  budgetYear: "2018 EFY",
  category: "Goods",
  completedActivities: 0,
  currency: "USD",
  delayedActivities: 0,
  estimatedValue: 4_500_000,
  inProgressActivities: 1,
  name: "Unique Cold-Chain Procurement Plan",
  organizationRegion: "FPCU / Federal",
  reference: "PP-UNIQUE-2018-99",
  status: "Approved",
};

const project: OfficerProject = {
  activePlans: 1,
  assignedOfficers: ["Mekdes Alemu"],
  assignmentStart: {
    ethiopian: "01 Meskerem 2018",
    gregorian: "11 Sep 2025",
  },
  baseCurrency: "USD",
  code: "PRJ-UNIQUE-099",
  countryOrganisation: "Ethiopia",
  executingAgency: "Ministry of Agriculture",
  fundingSource: "World Bank Loan (IDA)",
  fundingType: "Loan",
  name: "Unique Agricultural Cold-Chain Project",
  organizationRegion: "FPCU / Federal",
  plans: [plan],
  shortName: "COLD-CHAIN-UNIQUE",
  status: "Active",
};

const item: OfficerTrackedActivityItem = {
  activity: {
    category: "Goods",
    currentStage: "Contract Completion",
    description: activityForm.activityDescription,
    details: {
      componentAllocations: [],
      financingAllocations: [],
      form: activityForm,
      lots: [],
      roadmap: [
        {
          allowNotApplicable: false,
          days: "0",
          ethiopianDate: "01-Hamle-2018",
          gregorianDate: "08-Jul-2026",
          name: "Preparation of Specification",
          notApplicable: false,
          remarks: "",
        },
        {
          allowNotApplicable: false,
          days: "30",
          ethiopianDate: "01-Tahsas-2019",
          gregorianDate: "10-Dec-2026",
          name: "Signed Contract",
          notApplicable: false,
          remarks: "",
        },
        {
          allowNotApplicable: false,
          days: "90",
          ethiopianDate: "01-Megabit-2019",
          gregorianDate: "10-Mar-2027",
          name: "Contract Completion",
          notApplicable: false,
          remarks: "",
        },
      ],
    },
    estimatedAmount: 4_500_000,
    method: "Request for Bids (RFB)",
    reference: "ET-MoA-000099-GO-RFB",
    status: "In Progress",
  },
  plan,
  project,
  tracking: {
    activityReference: "ET-MoA-000099-GO-RFB",
    activityStatus: "Cleared",
    generalRemarks: "Contract signed; implementation mobilization pending.",
    planReference: plan.reference,
    processStatus: "Signed",
    progressPercent: 67,
    projectCode: project.code,
    stages: [
      {
        actualDate: {
          ethiopian: "01-Hamle-2018",
          gregorian: "08-Jul-2026",
        },
        remarks: "Specification approved.",
        revisions: [],
        stageName: "Preparation of Specification",
        status: "Completed",
      },
      {
        actualDate: {
          ethiopian: "01-Tahsas-2019",
          gregorian: "10-Dec-2026",
        },
        remarks: "Contract signed by both parties.",
        revisions: [],
        stageName: "Signed Contract",
        status: "Completed",
      },
      {
        remarks: "",
        revisions: [],
        stageName: "Contract Completion",
        status: "Not Started",
      },
    ],
    updatedAt: "2026-12-10T08:30:00.000Z",
  },
};

describe("ActivityTrackingDetailView", () => {
  it("renders the approved activity, execution roadmap, and contract handoff", () => {
    const markup = renderToStaticMarkup(
      <ActivityTrackingDetailView item={item} onSave={() => undefined} />,
    );

    expect(markup).toContain("Approved Activity Overview");
    expect(markup).toContain("Execution Summary");
    expect(markup).toContain("Procurement Roadmap Tracking");
    expect(markup).toContain("Contract Transition");

    expect(markup).toContain("ET-MoA-000099-GO-RFB");
    expect(markup).toContain("Unique Cold-Chain Procurement Plan");
    expect(markup).toContain("2018 EFY");
    expect(markup).toContain("Request for Bids (RFB)");
    expect(markup).toContain("4,500,000 USD");
    expect(markup).toContain("World Bank Loan (IDA)");
    expect(markup).toContain("Mekdes Alemu");

    expect(markup).toContain("Signed contract milestone completed");
    expect(markup).toContain("Register Contract");
    expect(markup).toContain("mode=register");
  });

  it("provides real tab panels and clear states for a summary-only activity", () => {
    const summaryActivity = {
      category: "Works" as const,
      currentStage: "Bid Opening",
      description: "Construction of regional storage facilities",
      details: undefined,
      estimatedAmount: 180_000_000,
      method: "RFB - National",
      reference: "ET-MoA-000002-CW-RFB",
      status: "Not Started" as const,
    };
    const summaryItem: OfficerTrackedActivityItem = {
      activity: summaryActivity,
      plan: {
        ...plan,
        category: "Works",
        name: "Regional Works Procurement Plan",
        reference: "PP-BREFONS-2016-02",
      },
      project: {
        ...project,
        code: "PRJ-24-042",
        name: "BREFONS",
        shortName: "BREFONS",
      },
      tracking: createInitialActivityTrackingRecord(
        "PRJ-24-042",
        "PP-BREFONS-2016-02",
        summaryActivity,
      ),
    };

    const markup = renderToStaticMarkup(
      <ActivityTrackingDetailView
        item={summaryItem}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('id="overview-tab"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('id="overview"');
    expect(markup).toContain('id="roadmap"');
    expect(markup).toContain('id="contract"');
    expect(markup).toContain("Approved roadmap schedule not recorded");
    expect(markup).toContain("Schedule not recorded");
    expect(markup).toContain("Contract registration is not available yet.");
    expect(markup).toContain("Not recorded");
  });
});
