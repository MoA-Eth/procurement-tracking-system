"use client";

import { useState } from "react";
import {
  Building2,
  CircleDollarSign,
  Layers,
  UserCheck,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  INITIAL_OFFICERS,
  SECTOR_OPTIONS,
  COUNTRY_ORG_OPTIONS,
  EXECUTING_AGENCY_OPTIONS,
  REGION_OPTIONS,
  FUNDING_SOURCE_OPTIONS,
  FUNDING_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  type ProjectItem,
  type ProjectOfficer,
} from "./projectsData";

import {
  ProjectWizardHeader,
  type WizardStep,
} from "./components/ProjectWizardHeader";
import {
  Step1IdentityForm,
  type Step1IdentityFormData,
} from "./components/Step1IdentityForm";
import {
  Step2FinancialsForm,
  type Step2FinancialsFormData,
} from "./components/Step2FinancialsForm";
import {
  Step3ComponentsForm,
  type Step3ComponentsFormData,
  type ProjectComponentFormItem,
} from "./components/Step3ComponentsForm";
import { Step4OfficersReview } from "./components/Step4OfficersReview";

export interface CreateProjectViewProps {
  onBackClick: () => void;
  onSaveProject?: (projectData: ProjectItem) => void | Promise<void>;
  initialData?: ProjectItem | null;
  availableOfficers?: ProjectOfficer[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    label: "Identity & Regional Scope",
    shortLabel: "Identity",
    icon: Building2,
  },
  {
    id: 2,
    label: "Financials & Donors",
    shortLabel: "Financials",
    icon: CircleDollarSign,
  },
  {
    id: 3,
    label: "Components & Dates",
    shortLabel: "Components",
    icon: Layers,
  },
  {
    id: 4,
    label: "Officers & Review",
    shortLabel: "Review",
    icon: UserCheck,
  },
];

export function CreateProjectView({
  onBackClick,
  onSaveProject,
  initialData,
  availableOfficers = INITIAL_OFFICERS,
}: CreateProjectViewProps) {
  const isEditing = Boolean(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1 State
  const [step1Data, setStep1Data] = useState<Step1IdentityFormData>({
    code: initialData?.code || "",
    name: initialData?.name || "",
    sapNumber: initialData?.sapNumber || "",
    sector: initialData?.sector || SECTOR_OPTIONS[0],
    countryOrg: initialData?.countryOrg || COUNTRY_ORG_OPTIONS[0],
    customCountryOrg: "",
    executingAgency:
      initialData?.executingAgency || EXECUTING_AGENCY_OPTIONS[0],
    customExecutingAgency: "",
    region: initialData?.region || REGION_OPTIONS[0],
  });

  // Step 2 State
  const isStandardFunding = FUNDING_SOURCE_OPTIONS.some(
    (fs) => fs.label === initialData?.fundingSource,
  );
  const [step2Data, setStep2Data] = useState<Step2FinancialsFormData>({
    fundingSource: isEditing
      ? isStandardFunding
        ? initialData!.fundingSource
        : "Other (Specify Custom Donor)"
      : FUNDING_SOURCE_OPTIONS[0].label,
    customFundingSource:
      isEditing && !isStandardFunding ? initialData!.fundingSource : "",
    fundingType: initialData?.fundingType || FUNDING_TYPE_OPTIONS[0],
    currency: initialData?.currency || CURRENCY_OPTIONS[0],
    loanGrantNumbers:
      initialData?.loanGrantNumbers && initialData.loanGrantNumbers.length > 0
        ? initialData.loanGrantNumbers
        : [""],
  });

  // Step 3 State
  const initialComponents: ProjectComponentFormItem[] =
    initialData?.components && initialData.components.length > 0
      ? initialData.components.map((c, i) => ({
          id: `comp-${i}`,
          name: typeof c === "string" ? c : (c as any).name || "",
          subcomponents:
            initialData.subcomponents && initialData.subcomponents.length > 0
              ? initialData.subcomponents
              : [""],
        }))
      : [
          {
            id: "comp-1",
            name: "",
            subcomponents: [""],
          },
        ];
  const [step3Data, setStep3Data] = useState<Step3ComponentsFormData>({
    componentsList: initialComponents,
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
  });

  // Step 4 State
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>(
    initialData?.assignedOfficers && initialData.assignedOfficers.length > 0
      ? initialData.assignedOfficers.map((o) => o.id)
      : [],
  );
  const [officerSearch, setOfficerSearch] = useState("");

  // Handlers
  function updateStep1(fields: Partial<Step1IdentityFormData>) {
    setStep1Data((prev) => ({ ...prev, ...fields }));
  }

  function updateStep2(fields: Partial<Step2FinancialsFormData>) {
    setStep2Data((prev) => ({ ...prev, ...fields }));
  }

  function updateStep3(fields: Partial<Step3ComponentsFormData>) {
    setStep3Data((prev) => ({ ...prev, ...fields }));
  }

  function toggleOfficer(id: string) {
    setSelectedOfficerIds((prev) =>
      prev.includes(id) ? prev.filter((oId) => oId !== id) : [...prev, id],
    );
  }

  // Validation
  function validateCurrentStep(): boolean {
    setErrorMsg("");

    if (currentStep === 1) {
      if (!step1Data.code.trim()) {
        setErrorMsg("Project Code / Acronym is required.");
        return false;
      }
      if (!step1Data.name.trim()) {
        setErrorMsg("Project Full Name is required.");
        return false;
      }
      if (
        step1Data.countryOrg === "Other (Specify Custom Organisation)" &&
        !step1Data.customCountryOrg.trim()
      ) {
        setErrorMsg("Please specify the Custom Organisation Name.");
        return false;
      }
      if (
        step1Data.executingAgency === "Other (Specify Custom Agency)" &&
        !step1Data.customExecutingAgency.trim()
      ) {
        setErrorMsg("Please specify the Custom Executing Agency Name.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (
        step2Data.fundingSource === "Other (Specify Custom Donor)" &&
        !step2Data.customFundingSource.trim()
      ) {
        setErrorMsg("Please specify the Custom Funding Source / Donor Name.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (
        step3Data.startDate &&
        step3Data.endDate &&
        new Date(step3Data.endDate) <= new Date(step3Data.startDate)
      ) {
        setErrorMsg("Project End Date must be after the Project Start Date.");
        return false;
      }
    }

    if (currentStep === 4) {
      // Officer assignment is optional - projects without assigned officers will be saved as Draft
    }

    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrev() {
    setErrorMsg("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSubmit() {
    if (!validateCurrentStep()) return;

    if (
      step3Data.startDate &&
      step3Data.endDate &&
      new Date(step3Data.endDate) <= new Date(step3Data.startDate)
    ) {
      setErrorMsg("Project End Date must be after the Project Start Date.");
      setCurrentStep(3);
      return;
    }

    const finalCountryOrg =
      step1Data.countryOrg === "Other (Specify Custom Organisation)"
        ? step1Data.customCountryOrg.trim() || "Custom Organisation"
        : step1Data.countryOrg;

    const finalExecutingAgency =
      step1Data.executingAgency === "Other (Specify Custom Agency)"
        ? step1Data.customExecutingAgency.trim() || "Custom Agency"
        : step1Data.executingAgency;

    const isCustomDonor =
      step2Data.fundingSource === "Other (Specify Custom Donor)";
    const finalFunding = isCustomDonor
      ? step2Data.customFundingSource.trim() || "Custom Funding Source"
      : step2Data.fundingSource;

    const cleanedLoanNumbers = step2Data.loanGrantNumbers.filter((num) =>
      num.trim(),
    );

    const componentsArray = step3Data.componentsList
      .map((c) => c.name.trim())
      .filter(Boolean);

    const subcomponentsArray = step3Data.componentsList
      .flatMap((c) => c.subcomponents.map((s) => s.trim()))
      .filter(Boolean);

    const assignedOfficers = availableOfficers.filter((o) =>
      selectedOfficerIds.includes(o.id),
    );

    const projectPayload: ProjectItem = {
      id: initialData?.id || `proj-${Date.now()}`,
      code: step1Data.code.trim().toUpperCase(),
      name: step1Data.name.trim(),
      sapNumber: step1Data.sapNumber.trim(),
      sector: step1Data.sector,
      countryOrg: finalCountryOrg,
      executingAgency: finalExecutingAgency,
      region: step1Data.region,
      budgetYear: initialData?.budgetYear || "2017 EFY (2024/2025)",
      fundingSource: finalFunding,
      fundingType: step2Data.fundingType,
      currency: step2Data.currency,
      loanGrantNumbers:
        cleanedLoanNumbers.length > 0
          ? cleanedLoanNumbers
          : [step1Data.code.toUpperCase()],
      components: componentsArray,
      subcomponents: subcomponentsArray,
      startDate: step3Data.startDate,
      endDate: step3Data.endDate,
      assignedOfficers,
      description: initialData?.description || step1Data.name.trim(),
      status:
        initialData?.status === "Inactive"
          ? "Inactive"
          : assignedOfficers.length > 0
            ? "Active"
            : "Draft",
      createdAt:
        initialData?.createdAt || new Date().toISOString().slice(0, 10),
    };

    if (onSaveProject) {
      onSaveProject(projectPayload);
    }
    onBackClick();
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Wizard Header */}
      <ProjectWizardHeader
        isEditing={isEditing}
        code={step1Data.code}
        currentStep={currentStep}
        steps={WIZARD_STEPS}
        onStepClick={(stepId) => {
          if (stepId <= currentStep || isEditing) {
            setCurrentStep(stepId);
          }
        }}
        onBackClick={onBackClick}
      />

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Wizard Form Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm space-y-6">
        {currentStep === 1 && (
          <Step1IdentityForm data={step1Data} onChange={updateStep1} />
        )}

        {currentStep === 2 && (
          <Step2FinancialsForm data={step2Data} onChange={updateStep2} />
        )}

        {currentStep === 3 && (
          <Step3ComponentsForm data={step3Data} onChange={updateStep3} />
        )}

        {currentStep === 4 && (
          <Step4OfficersReview
            officersList={INITIAL_OFFICERS}
            selectedOfficerIds={selectedOfficerIds}
            officerSearch={officerSearch}
            onSearchChange={setOfficerSearch}
            onToggleOfficer={toggleOfficer}
            onSelectAllOfficers={() =>
              setSelectedOfficerIds(INITIAL_OFFICERS.map((o) => o.id))
            }
            onClearAllOfficers={() => setSelectedOfficerIds([])}
            code={step1Data.code}
            name={step1Data.name}
            sector={step1Data.sector}
            fundingSource={step2Data.fundingSource}
            customFundingSource={step2Data.customFundingSource}
            currency={step2Data.currency}
            componentsCount={step3Data.componentsList.length}
          />
        )}

        {/* Wizard Action Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={currentStep === 1 ? onBackClick : handlePrev}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {currentStep === 1 ? "Cancel" : "← Previous Step"}
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-[#0A3C2F] hover:bg-[#083025] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Continue to Step 0{currentStep + 1}</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>
                  {isEditing
                    ? "Save Project Changes"
                    : selectedOfficerIds.length > 0
                      ? "Complete Registration"
                      : "Save as Draft Project"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
