import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  activityReferenceFor,
  methodsForCategory,
  roadmapForMethod,
} from "../data/procurementActivityConfig";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";
import type { ProcurementActivitySummary } from "../data/officerActivityDrafts";
import {
  CreateProcurementActivityView,
  RelatedInformationStep,
} from "./CreateProcurementActivityView";

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

describe("CreateProcurementActivityView", () => {
  it("starts with the document-defined four-step structure and locked context", () => {
    const markup = renderToStaticMarkup(
      <CreateProcurementActivityView plan={plan} project={project} />,
    );

    expect(markup).toContain("Add Procurement Activity");
    expect(markup).toContain("Key Details");
    expect(markup).toContain("Related Information");
    expect(markup).toContain("Additional Details");
    expect(markup).toContain("Roadmap");
    expect(markup).toContain(plan.name);
    expect(markup).toContain("Inherited from the procurement plan");
    expect(markup).toContain(plan.category);
    expect(markup).not.toContain("legacy multi-category plan");
  });

  it("filters procurement methods by the inherited plan category", () => {
    const goodsMethods = methodsForCategory("Goods").map(
      (method) => method.key,
    );
    const worksMethods = methodsForCategory("Works").map(
      (method) => method.key,
    );
    const consultancyMethods = methodsForCategory("Consultancy Services").map(
      (method) => method.key,
    );

    expect(goodsMethods).toContain("rfb-international");
    expect(goodsMethods).toContain("rfq-shopping");
    expect(goodsMethods).not.toContain("qcbs");

    expect(worksMethods).toContain("rfb-international");
    expect(worksMethods).toContain("rfb-national");
    expect(worksMethods).toContain("rfq-shopping");
    expect(worksMethods).not.toContain("qcbs");
    expect(worksMethods).not.toContain("cqs");
    expect(worksMethods).not.toContain("indv");
    expect(worksMethods).not.toContain("sss");
    expect(worksMethods).not.toContain("pm-sss");

    expect(consultancyMethods).toContain("qcbs");
    expect(consultancyMethods).toContain("indv");
    expect(consultancyMethods).not.toContain("rfb-national");
    expect(consultancyMethods).not.toContain("rfb-international");

    const allOptions = methodsForCategory("Goods");
    const unAgencyOption = allOptions.find((opt) => opt.key === "un-agency");
    expect(unAgencyOption?.label).toBe("UN Agency");
    expect(allOptions.map((opt) => opt.label)).not.toContain(
      "UN Agency / UNOPS Direct",
    );
  });

  it("generates method-specific roadmap stages and an activity reference", () => {
    const rfbRoadmap = roadmapForMethod("rfb-international");
    const consultancyRoadmap = roadmapForMethod("qcbs");

    expect(rfbRoadmap[0]?.name).toBe("Draft Pre-qualification Documents");
    expect(rfbRoadmap.at(-1)?.name).toBe("Contract Termination");
    expect(consultancyRoadmap).toHaveLength(15);
    expect(
      activityReferenceFor(project, plan, "Works", "rfb-international", 123456),
    ).toBe("ET-MoA-123457-CW-RFB");
  });

  it("maintains previously entered data and displays edit mode controls when initialActivity is provided", () => {
    const existingActivity = {
      category: "Goods" as const,
      currentStage: "Bidding Documents Preparation",
      description: "Supply of 50 Hybrid Field Vehicles",
      estimatedAmount: 4_500_000,
      method: "RFB - National",
      reference: "ET-MOA-100200-GO-RFB",
      status: "Draft" as const,
      details: {
        form: {
          description: "Supply of 50 Hybrid Field Vehicles",
          estimatedAmount: "4500000",
          marketApproach: "Open - National",
          method: "RFB - National",
          procurementMethodKey: "rfb-national",
          reviewType: "Post Review",
        },
      },
    };

    const markup = renderToStaticMarkup(
      <CreateProcurementActivityView
        initialActivity={
          existingActivity as unknown as ProcurementActivitySummary
        }
        plan={plan}
        project={project}
      />,
    );

    // Header and banner indicate edit mode
    expect(markup).toContain("Revise Procurement Activity");
    expect(markup).toContain("Editing Activity");
    expect(markup).toContain("ET-MOA-100200-GO-RFB");
    expect(markup).toContain("Save Changes");

    // Pre-selected method controls are displayed in Step 1
    expect(markup).toContain("Market Approach");
    expect(markup).toContain("Review Type");
    expect(markup).toContain("Procurement Document Type");

    // All steps are interactive clickable buttons in edit mode
    expect(markup).toContain('data-step="1"');
    expect(markup).toContain('data-step="2"');
    expect(markup).toContain('data-step="3"');
    expect(markup).toContain('data-step="4"');
  });

  it("resolves roadmap stages even when method is provided as display label", () => {
    const roadmapFromKey = roadmapForMethod("rfb-national");
    const roadmapFromLabel = roadmapForMethod("RFB - National");

    expect(roadmapFromLabel.length).toBeGreaterThan(0);
    expect(roadmapFromLabel.length).toBe(roadmapFromKey.length);
    expect(roadmapFromLabel[0]?.name).toBe(roadmapFromKey[0]?.name);
  });

  it("renders Review Type and Procurement Document Type as optional and excludes Not Applicable from Qualification Approach", () => {
    const existingActivity = {
      category: "Goods" as const,
      currentStage: "Bidding Documents Preparation",
      description: "Supply of 50 Hybrid Field Vehicles",
      estimatedAmount: 4_500_000,
      method: "RFB - National",
      reference: "ET-MOA-100200-GO-RFB",
      status: "Draft" as const,
      details: {
        form: {
          description: "Supply of 50 Hybrid Field Vehicles",
          estimatedAmount: "4500000",
          marketApproach: "Open - National",
          method: "RFB - National",
          procurementMethodKey: "rfb-national",
        },
      },
    };

    const markup = renderToStaticMarkup(
      <CreateProcurementActivityView
        initialActivity={
          existingActivity as unknown as ProcurementActivitySummary
        }
        plan={plan}
        project={project}
      />,
    );

    // Qualification Approach has Prequalification and Post-qualification, but NOT Not Applicable
    expect(markup).toContain("<option>Prequalification</option>");
    expect(markup).toContain("<option>Post-qualification</option>");
    expect(markup).not.toContain("<option>Not Applicable</option>");

    // Review Type and Procurement Document Type are present without required asterisk indicator
    expect(markup).toContain("Review Type");
    expect(markup).toContain("Procurement Document Type");
    expect(markup).not.toContain(
      'Review Type<span class="ml-1 text-red-600">*</span>',
    );
    expect(markup).not.toContain(
      'Procurement Document Type<span class="ml-1 text-red-600">*</span>',
    );

    // Whereas required fields have the asterisk
    expect(markup).toContain(
      'Market Approach<span class="ml-1 text-red-600">*</span>',
    );
    expect(markup).toContain(
      'Qualification Approach<span class="ml-1 text-red-600">*</span>',
    );
  });

  it("defaults 'Requires UN Agency Contracting' to No for non-UN methods, and Yes for UN Agency", () => {
    // Non-UN method
    const nonUnActivity = {
      category: "Goods" as const,
      currentStage: "Bidding Documents Preparation",
      description: "Direct Purchase of Lab Equipment",
      estimatedAmount: 200_000,
      method: "Direct Procurement / Direct Selection",
      reference: "ET-MOA-100201-GO-DIR",
      status: "Draft" as const,
      details: {
        form: {
          description: "Direct Purchase of Lab Equipment",
          estimatedAmount: "200000",
          method: "Direct Procurement / Direct Selection",
          procurementMethodKey: "direct",
        },
      },
    };

    const nonUnMarkup = renderToStaticMarkup(
      <CreateProcurementActivityView
        initialActivity={nonUnActivity as unknown as ProcurementActivitySummary}
        plan={plan}
        project={project}
      />,
    );
    expect(nonUnMarkup).toContain("Requires UN Agency Contracting");
    // "No" button should be pressed (aria-pressed="true"), "Yes" should be aria-pressed="false"
    expect(nonUnMarkup).toMatch(/aria-pressed="true"[^>]*>No<\/button>/);
    expect(nonUnMarkup).toMatch(/aria-pressed="false"[^>]*>Yes<\/button>/);

    // UN Agency method
    const unActivity = {
      category: "Goods" as const,
      currentStage: "Draft Contract",
      description: "Vaccine procurement via UNICEF",
      estimatedAmount: 1_200_000,
      method: "UN Agency",
      reference: "ET-MOA-100202-GO-UN",
      status: "Draft" as const,
      details: {
        form: {
          description: "Vaccine procurement via UNICEF",
          estimatedAmount: "1200000",
          method: "UN Agency",
          procurementMethodKey: "un-agency",
        },
      },
    };

    const unMarkup = renderToStaticMarkup(
      <CreateProcurementActivityView
        initialActivity={unActivity as unknown as ProcurementActivitySummary}
        plan={plan}
        project={project}
      />,
    );
    expect(unMarkup).toContain("Requires UN Agency Contracting");
    // "Yes" button should be pressed (aria-pressed="true"), "No" should be aria-pressed="false"
    expect(unMarkup).toMatch(/aria-pressed="true"[^>]*>Yes<\/button>/);
    expect(unMarkup).toMatch(/aria-pressed="false"[^>]*>No<\/button>/);
  });

  it("renders 'Add Reference Number (e.g. STEP)' button and additional reference items in RelatedInformationStep", () => {
    const dummyContext = {
      activityReference: "ET-MoA-000001-GO-RFB",
      category: "Goods" as const,
      plan,
      project,
    };
    const dummyForm = {
      activityDescription: "Test package",
      classificationCode: "",
      comments: "",
      contractType: "",
      currency: "ETB",
      domesticPreference: "",
      estimatedAmount: "100000",
      evaluationOptionCode: "",
      fundingSource: "IDA",
      highRiskCode: "",
      inProcess: false,
      invitationReference: "",
      latitude: "",
      location: "",
      longitude: "",
      lotRequired: false,
      marketApproach: "",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "",
      procurementDocumentType: "",
      procurementProcess: "",
      qualificationApproach: "",
      requiresUnAgency: false,
      reviewType: "",
      scopeNotes: "",
      specificMethod: "",
      subcomponent: "",
    };

    // 1. Without additional references: displays "Add Reference Number (e.g. STEP)"
    const markupEmpty = renderToStaticMarkup(
      <RelatedInformationStep
        additionalReferences={[]}
        attempted={false}
        context={dummyContext}
        currencyOptions={[{ code: "ETB", label: "ETB - Ethiopian Birr" }]}
        financingAllocations={[]}
        form={dummyForm}
        lots={[]}
        onAddAdditionalReference={() => {}}
        onChange={() => {}}
        onFinancingChange={() => {}}
        onLotsChange={() => {}}
        onRemoveAdditionalReference={() => {}}
        onUpdateAdditionalReference={() => {}}
      />,
    );
    expect(markupEmpty).toContain("Activity Reference No.");
    expect(markupEmpty).toContain("ET-MoA-000001-GO-RFB");
    expect(markupEmpty).toContain("Add Reference Number (e.g. STEP)");

    // 2. With additional references: displays reference items, type options, values, and Add Another
    const markupWithRefs = renderToStaticMarkup(
      <RelatedInformationStep
        additionalReferences={[
          {
            id: "ref-1",
            type: "STEP Reference",
            value: "WB-STEP-ET-MOA-100200",
          },
          {
            id: "ref-2",
            type: "Donor Reference",
            value: "AFDB-AGRI-2024-05",
          },
        ]}
        attempted={false}
        context={dummyContext}
        currencyOptions={[{ code: "ETB", label: "ETB - Ethiopian Birr" }]}
        financingAllocations={[]}
        form={dummyForm}
        lots={[]}
        onAddAdditionalReference={() => {}}
        onChange={() => {}}
        onFinancingChange={() => {}}
        onLotsChange={() => {}}
        onRemoveAdditionalReference={() => {}}
        onUpdateAdditionalReference={() => {}}
      />,
    );
    expect(markupWithRefs).toContain("Additional Reference(s)");
    expect(markupWithRefs).toContain("STEP Reference");
    expect(markupWithRefs).toContain("Donor Reference");
    expect(markupWithRefs).toContain("WB-STEP-ET-MOA-100200");
    expect(markupWithRefs).toContain("AFDB-AGRI-2024-05");
    expect(markupWithRefs).toContain("Add Another");
    expect(markupWithRefs).toContain("Remove reference");
  });

  it("renders '+ Add currency if not listed...' dropdown option in Related Information step", () => {
    const dummyContext = {
      activityReference: "ET-MoA-000001-GO-RFB",
      category: "Goods" as const,
      plan: {
        ...plan,
        name: "Test Plan",
        category: "Goods" as const,
      },
      project,
    };

    const dummyForm = {
      activityDescription: "Test Description",
      classificationCode: "",
      comments: "",
      commercialPractices: "",
      contractType: "",
      currency: "ETB",
      domesticPreference: "",
      estimatedAmount: "100000",
      evaluationOptionCode: "",
      fundingSource: "IDA",
      highRiskCode: "",
      inProcess: false,
      invitationReference: "",
      latitude: "",
      location: "",
      longitude: "",
      lotRequired: false,
      marketApproach: "",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "",
      procurementDocumentType: "",
      procurementProcess: "",
      qualificationApproach: "",
      requiresUnAgency: false,
      reviewType: "",
      scopeNotes: "",
      specificMethod: "",
      subcomponent: "",
    };

    const markup = renderToStaticMarkup(
      <RelatedInformationStep
        additionalReferences={[]}
        attempted={false}
        context={dummyContext}
        currencyOptions={[
          { code: "ETB", label: "ETB (Ethiopian Birr)" },
          { code: "USD", label: "USD (US Dollar)" },
        ]}
        financingAllocations={[]}
        form={dummyForm}
        lots={[]}
        onAddAdditionalReference={() => {}}
        onChange={() => {}}
        onFinancingChange={() => {}}
        onLotsChange={() => {}}
        onRemoveAdditionalReference={() => {}}
        onUpdateAdditionalReference={() => {}}
      />,
    );

    // Verify + Add currency if not listed... option exists in select
    expect(markup).toContain("+ Add currency if not listed...");
    expect(markup).toContain("ETB (Ethiopian Birr)");
    expect(markup).toContain("USD (US Dollar)");
  });

  it("inherits only the project's configured funding source and does not show unconfigured Treasury", () => {
    const singleSourceProject: OfficerProject = {
      ...project,
      fundingSource: "World Bank (WB)",
    };

    const dummyContext = {
      activityReference: "ET-MoA-000001-GO-RFB",
      category: "Goods" as const,
      plan: {
        ...plan,
        name: "Test Plan",
        category: "Goods" as const,
      },
      project: singleSourceProject,
    };

    const dummyForm = {
      activityDescription: "Test Description",
      classificationCode: "",
      comments: "",
      commercialPractices: "",
      contractType: "",
      currency: "ETB",
      domesticPreference: "",
      estimatedAmount: "100000",
      evaluationOptionCode: "",
      fundingSource: "World Bank (WB)",
      highRiskCode: "",
      inProcess: false,
      invitationReference: "",
      latitude: "",
      location: "",
      longitude: "",
      lotRequired: false,
      marketApproach: "",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "",
      procurementDocumentType: "",
      procurementProcess: "",
      qualificationApproach: "",
      requiresUnAgency: false,
      reviewType: "",
      scopeNotes: "",
      specificMethod: "",
      subcomponent: "",
    };

    const markup = renderToStaticMarkup(
      <RelatedInformationStep
        additionalReferences={[]}
        attempted={false}
        context={dummyContext}
        currencyOptions={[{ code: "ETB", label: "ETB (Ethiopian Birr)" }]}
        financingAllocations={[]}
        form={dummyForm}
        lots={[]}
        onAddAdditionalReference={() => {}}
        onChange={() => {}}
        onFinancingChange={() => {}}
        onLotsChange={() => {}}
        onRemoveAdditionalReference={() => {}}
        onUpdateAdditionalReference={() => {}}
      />,
    );

    // Verify it contains the inherited project donor
    expect(markup).toContain("World Bank (WB)");
    // Verify it does NOT contain unconfigured Treasury or artificial suffixes
    expect(markup).not.toContain("Treasury (Government Counterpart)");
    expect(markup).not.toContain("Treasury");
  });

  it("renders all inherited funding sources when a project is created with multiple funding sources", () => {
    const multiSourceProject: OfficerProject = {
      ...project,
      fundingSource: "World Bank (IDA), African Development Bank (AfDB)",
    };

    const dummyContext = {
      activityReference: "ET-MoA-000001-GO-RFB",
      category: "Goods" as const,
      plan: {
        ...plan,
        name: "Test Plan",
        category: "Goods" as const,
      },
      project: multiSourceProject,
    };

    const dummyForm = {
      activityDescription: "Test Description",
      classificationCode: "",
      comments: "",
      commercialPractices: "",
      contractType: "",
      currency: "ETB",
      domesticPreference: "",
      estimatedAmount: "100000",
      evaluationOptionCode: "",
      fundingSource: "World Bank (IDA)",
      highRiskCode: "",
      inProcess: false,
      invitationReference: "",
      latitude: "",
      location: "",
      longitude: "",
      lotRequired: false,
      marketApproach: "",
      method: "rfb-national",
      oversightClassification: "",
      pricingBasis: "",
      procurementDocumentType: "",
      procurementProcess: "",
      qualificationApproach: "",
      requiresUnAgency: false,
      reviewType: "",
      scopeNotes: "",
      specificMethod: "",
      subcomponent: "",
    };

    const markup = renderToStaticMarkup(
      <RelatedInformationStep
        additionalReferences={[]}
        attempted={false}
        context={dummyContext}
        currencyOptions={[{ code: "ETB", label: "ETB (Ethiopian Birr)" }]}
        financingAllocations={[]}
        form={dummyForm}
        lots={[]}
        onAddAdditionalReference={() => {}}
        onChange={() => {}}
        onFinancingChange={() => {}}
        onLotsChange={() => {}}
        onRemoveAdditionalReference={() => {}}
        onUpdateAdditionalReference={() => {}}
      />,
    );

    // Verify all inherited funding sources are available in the dropdown
    expect(markup).toContain("World Bank (IDA)");
    expect(markup).toContain("African Development Bank (AfDB)");
    // Should NOT contain unconfigured Treasury
    expect(markup).not.toContain("Treasury");
  });

  it("renders in edit mode and preserves custom activity data when editing", () => {
    const activityToEdit: ProcurementActivitySummary = {
      category: "Goods",
      currentStage: "Bidding Documents Preparation",
      description: "Supply of solar-powered drip irrigation kits",
      estimatedAmount: 750000,
      method: "RFB - National",
      reference: "ET-MOA-456789-GO-RFB",
      status: "In Progress",
      currency: "USD",
      fundingSource: "World Bank (IDA)",
      details: {
        form: {
          activityDescription: "Supply of solar-powered drip irrigation kits",
          classificationCode: "AGR-IRR-01",
          comments: "Expedited procurement requested",
          contractType: "Lump Sum",
          currency: "USD",
          domesticPreference: "No",
          estimatedAmount: "750000",
          evaluationOptionCode: "",
          fundingSource: "World Bank (IDA)",
          highRiskCode: "",
          inProcess: true,
          invitationReference: "BID-2026-09",
          latitude: "9.03",
          location: "Oromia / Federal",
          longitude: "38.74",
          lotRequired: false,
          marketApproach: "Open - National",
          method: "rfb-national",
          oversightClassification: "High",
          pricingBasis: "",
          procurementDocumentType: "",
          procurementProcess: "1 Envelope (Single Stage 1 Env)",
          qualificationApproach: "Post Qualification",
          requiresUnAgency: false,
          reviewType: "Prior Review",
          scopeNotes: "Solar pumps and hoses",
          specificMethod: "",
          subcomponent: "Sub-1.2",
        },
        componentAllocations: [
          {
            id: "Component 1",
            name: "Component 1",
            code: "Sub-1.2",
            share: 100,
            percent: "100",
            selected: true,
          },
        ],
        financingAllocations: [
          {
            id: "World Bank (IDA)",
            source: "World Bank (IDA)",
            loanNumber: "IDA-5544",
            share: 100,
            percent: "100",
            selected: true,
          },
        ],
        lots: [],
        roadmap: [
          {
            name: "Bidding Documents Preparation",
            days: "14",
            ethiopianDate: "2018-01-01",
            gregorianDate: "2025-09-11",
            notApplicable: false,
            allowNotApplicable: false,
            remarks: "Draft completed",
            status: "In Progress",
          },
        ],
      },
    };

    const markup = renderToStaticMarkup(
      <CreateProcurementActivityView
        initialActivity={activityToEdit}
        plan={plan}
        project={project}
      />,
    );

    // Header and editing banner
    expect(markup).toContain("Editing Activity:");
    expect(markup).toContain("ET-MOA-456789-GO-RFB");
    expect(markup).toContain("Revise Procurement Activity");
    expect(markup).toContain("Save Changes");

    // Step 1 controls initialized from activity
    expect(markup).toContain("Open - National");
    expect(markup).toContain("Post-qualification");

    // Also verify RelatedInformationStep preserves description, currency, amount, funding
    const step2Markup = renderToStaticMarkup(
      <RelatedInformationStep
        additionalReferences={[]}
        attempted={false}
        context={{
          activityReference: activityToEdit.reference,
          category: "Goods",
          plan,
          project,
        }}
        currencyOptions={[
          { code: "ETB", label: "ETB (Ethiopian Birr)" },
          { code: "USD", label: "USD (US Dollar)" },
        ]}
        financingAllocations={activityToEdit.details!.financingAllocations.map(
          (f) => ({
            id: f.id,
            percent: f.percent,
            selected: f.selected,
          }),
        )}
        form={activityToEdit.details!.form}
        lots={[]}
        onAddAdditionalReference={() => {}}
        onChange={() => {}}
        onFinancingChange={() => {}}
        onLotsChange={() => {}}
        onRemoveAdditionalReference={() => {}}
        onUpdateAdditionalReference={() => {}}
      />,
    );

    expect(step2Markup).toContain(
      "Supply of solar-powered drip irrigation kits",
    );
    expect(step2Markup).toContain("750000");
    expect(step2Markup).toContain("USD");
    expect(step2Markup).toContain("World Bank (IDA)");
  });
});
