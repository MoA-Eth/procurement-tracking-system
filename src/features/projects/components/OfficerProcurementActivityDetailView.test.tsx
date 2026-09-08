import type { ProcurementActivitySummary } from "../data/officerActivityDrafts";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OfficerProcurementActivityDetailView } from "./OfficerProcurementActivityDetailView";

const plan: ProcurementPlanSummary = {
  activities: 1,
  budgetYear: "2016 EFY",
  category: "Goods",
  completedActivities: 0,
  currency: "ETB",
  delayedActivities: 0,
  estimatedValue: 2_500_000,
  inProgressActivities: 0,
  name: "2016 EFY Annual Procurement Plan",
  reference: "PP-DRIVE-2016-01",
  status: "Approved",
};

const project: OfficerProject = {
  activePlans: 1,
  assignedOfficers: ["Yeabsira Fikre"],
  availableOrganizationRegions: ["FPCU / Federal"],
  baseCurrency: "ETB",
  code: "PRJ-24-001",
  countryOrganisation: "Ethiopia",
  executingAgency: "Ministry of Agriculture",
  fundingSource: "World Bank",
  fundingType: "Loan / Grant",
  name: "DRIVE - De-Risking, Inclusion and Value Enhancement",
  organizationRegion: "FPCU / Federal",
  plans: [plan],
  shortName: "DRIVE",
  status: "Active",
};

const detailedActivity: ProcurementActivitySummary = {
  category: "Goods",
  currentStage: "Preparation of Specification",
  description: "Supply of veterinary cold-chain equipment",
  details: {
    componentAllocations: [
      { id: "Livestock Value Chains", percent: "100", selected: true },
    ],
    financingAllocations: [{ id: "IDA-E0380", percent: "100", selected: true }],
    form: {
      activityDescription: "Supply of veterinary cold-chain equipment",
      classificationCode: "42211507",
      comments: "Deliver to regional hubs.",
      contractType: "Lump Sum",
      currency: "ETB",
      domesticPreference: "No",
      estimatedAmount: "2500000",
      evaluationOptionCode: "",
      fundingSource: "World Bank",
      highRiskCode: "",
      inProcess: false,
      invitationReference: "MOA/RFQ/2026/04",
      latitude: "9.03",
      location: "Oromia",
      longitude: "38.74",
      lotRequired: true,
      marketApproach: "Open - National",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "Not Applicable",
      procurementDocumentType: "Request for Bids SPD (Goods) - 1 envelope",
      procurementProcess: "Single Stage - One Envelope",
      qualificationApproach: "Post-qualification",
      requiresUnAgency: false,
      reviewType: "Prior Review",
      scopeNotes: "Cold rooms and transport equipment.",
      specificMethod: "Request for Bids",
      subcomponent: "",
    },
    lots: [
      {
        amount: "2500000",
        description: "Cold-chain equipment",
        id: 1,
        number: "1",
      },
    ],
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
      {
        allowNotApplicable: false,
        days: "",
        ethiopianDate: "15-Hamle-2018",
        gregorianDate: "2026-07-25",
        name: "Signed Contract",
        notApplicable: false,
        remarks: "Contract cleared.",
      },
      {
        allowNotApplicable: false,
        days: "",
        ethiopianDate: "20-Tir-2019",
        gregorianDate: "2027-01-28",
        name: "Contract Completion",
        notApplicable: false,
        remarks: "",
      },
    ],
  },
  estimatedAmount: 2_500_000,
  method: "RFB - National",
  reference: "ET-MoA-000013-GO-RFB",
  status: "Not Started",
};

describe("OfficerProcurementActivityDetailView", () => {
  it("shows every saved wizard section and its entered values", () => {
    const markup = renderToStaticMarkup(
      <OfficerProcurementActivityDetailView
        activity={detailedActivity}
        plan={plan}
        project={project}
      />,
    );

    expect(markup).toContain("Key Details");
    expect(markup).toContain("Related Information");
    expect(markup).toContain("Additional Details");
    expect(markup).toContain("Roadmap");
    expect(markup).toContain("Open - National");
    expect(markup).toContain("MOA/RFQ/2026/04");
    expect(markup).toContain("42211507");
    expect(markup).toContain("Livestock Value Chains");
    expect(markup).toContain("Procurement Planning Roadmap");
    expect(markup).toContain("Procurement Monitoring");
    expect(markup).toContain("13 days");
  });

  it("does not invent detailed fields for an older summary-only activity", () => {
    const summaryOnly = { ...detailedActivity, details: undefined };
    const markup = renderToStaticMarkup(
      <OfficerProcurementActivityDetailView
        activity={summaryOnly}
        plan={plan}
        project={project}
      />,
    );

    expect(markup).toContain("No additional-information submission is stored");
    expect(markup).toContain("Preparation of Specification");
    expect(markup).not.toContain("Classification Code");
  });

  it("links back to Activity Tracker when navigated from tracker", () => {
    const markup = renderToStaticMarkup(
      <OfficerProcurementActivityDetailView
        activity={detailedActivity}
        fromTracker={true}
        plan={plan}
        project={project}
      />,
    );

    expect(markup).toContain("Back to Tracker");
    expect(markup).toContain("/workspace/activity-tracker?project=");
    expect(markup).toContain("Activity Tracker");
  });

  it("does not show creator or editor attribution for single-officer project", () => {
    const activityWithMeta: ProcurementActivitySummary = {
      ...detailedActivity,
      createdByName: "Yeabsira Fikre",
      updatedByName: "Abebe Kebede",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementActivityDetailView
        activity={activityWithMeta}
        plan={plan}
        project={project}
      />,
    );

    expect(markup).not.toContain("Created by:");
    expect(markup).not.toContain("Last edited by:");
  });

  it("shows creator and editor attribution when more than one officer is assigned", () => {
    const multiOfficerProject: OfficerProject = {
      ...project,
      assignedOfficers: ["Yeabsira Fikre", "Abebe Kebede"],
    };
    const activityWithMeta: ProcurementActivitySummary = {
      ...detailedActivity,
      createdByName: "Yeabsira Fikre",
      updatedByName: "Abebe Kebede",
    };
    const markup = renderToStaticMarkup(
      <OfficerProcurementActivityDetailView
        activity={activityWithMeta}
        plan={plan}
        project={multiOfficerProject}
      />,
    );

    expect(markup).toContain("Created by:");
    expect(markup).toContain("Yeabsira Fikre");
    expect(markup).toContain("Last edited by:");
    expect(markup).toContain("Abebe Kebede");
  });
});
