"use client";

import {
  countRoadmapOrderErrors,
  ProcurementRoadmapTable,
} from "./ProcurementRoadmapTable";
import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";
import type {
  ProcurementActivityAllocation as Allocation,
  ProcurementActivityFormValues as ActivityFormState,
  ProcurementActivityLot as LotEntry,
  ProcurementActivityRoadmapStage as RoadmapStage,
  ProcurementActivitySummary,
} from "../data/officerActivityDrafts";
import {
  activityReferenceFor,
  methodsForCategory,
  normalizeActivityCategory,
  procurementMethodOptions,
  roadmapForMethod,
  resolveMethodKey,
  resolveProcurementMethodOption,
  type ProcurementActivityCategory,
} from "../data/procurementActivityConfig";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  FileText,
  Info,
  Landmark,
  ListChecks,
  LockKeyhole,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect, type ReactNode } from "react";

type WizardStep = 1 | 2 | 3 | 4;

type UpdateActivityField = <K extends keyof ActivityFormState>(
  field: K,
  value: ActivityFormState[K],
) => void;

const inputClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";
const textareaClasses =
  "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";

const steps = [
  { label: "Key Details", number: 1 },
  { label: "Related Information", number: 2 },
  { label: "Additional Details", number: 3 },
  { label: "Roadmap", number: 4 },
] as const;

export function CreateProcurementActivityView({
  existingActivityCount,
  initialActivity,
  onSaveActivity,
  plan,
  project,
}: {
  existingActivityCount?: number;
  initialActivity?: ProcurementActivitySummary;
  onSaveActivity?: (activity: ProcurementActivitySummary) => void;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
}) {
  const isEditing = Boolean(initialActivity);
  const category = normalizeActivityCategory(plan.category);
  const [step, setStep] = useState<WizardStep>(1);
  const [attemptedStep, setAttemptedStep] = useState<WizardStep | null>(null);
  const [saved, setSaved] = useState(false);

  const initialMethodKey = resolveMethodKey(
    initialActivity?.details?.form?.method ||
      initialActivity?.method ||
      (initialActivity as any)?.procurementMethod?.code ||
      (initialActivity as any)?.procurementMethod?.label ||
      "",
  );

  const [form, setForm] = useState<ActivityFormState>(() =>
    createInitialForm(project, plan, category, initialActivity),
  );
  const [financingAllocations, setFinancingAllocations] = useState<
    Allocation[]
  >(() => extractInitialFinancingAllocations(project, initialActivity));
  const [componentAllocations, setComponentAllocations] = useState<
    Allocation[]
  >(() => extractInitialComponentAllocations(project, initialActivity));
  const [lots, setLots] = useState<LotEntry[]>(() =>
    extractInitialLots(initialActivity),
  );
  const [roadmap, setRoadmap] = useState<RoadmapStage[]>(() =>
    extractInitialRoadmap(initialActivity, initialMethodKey),
  );

  // Synchronize state whenever initialActivity arrives or updates
  useEffect(() => {
    if (initialActivity) {
      const resolvedKey = resolveMethodKey(
        initialActivity.details?.form?.method ||
          initialActivity.method ||
          (initialActivity as any)?.procurementMethod?.code ||
          (initialActivity as any)?.procurementMethod?.label ||
          "",
      );
      setForm(createInitialForm(project, plan, category, initialActivity));
      setFinancingAllocations(
        extractInitialFinancingAllocations(project, initialActivity),
      );
      setComponentAllocations(
        extractInitialComponentAllocations(project, initialActivity),
      );
      setLots(extractInitialLots(initialActivity));
      setRoadmap(extractInitialRoadmap(initialActivity, resolvedKey));
    }
  }, [initialActivity, project, plan, category]);

  const methodOptions = useMemo(() => methodsForCategory(category), [category]);
  const selectedMethod = procurementMethodOptions.find(
    (method) => method.key === form.method,
  );
  const planHref =
    "/workspace/projects?project=" +
    encodeURIComponent(project.code) +
    "&plan=" +
    encodeURIComponent(plan.reference);
  const activityReference = initialActivity
    ? initialActivity.reference
    : activityReferenceFor(
        project,
        plan,
        category,
        form.method,
        existingActivityCount,
      );

  const stepOneInvalid = !form.method;
  const stepTwoInvalid =
    !form.activityDescription.trim() ||
    !(Number(form.estimatedAmount) > 0) ||
    !form.currency ||
    !form.fundingSource ||
    (category === "Works" && !form.pricingBasis) ||
    (form.lotRequired &&
      lots.some(
        (lot) =>
          !lot.number.trim() ||
          !lot.description.trim() ||
          !lot.amount.trim() ||
          !(Number(lot.amount) >= 0),
      ));
  const stepThreeInvalid =
    !allocationTotalIsValid(financingAllocations) ||
    !allocationTotalIsValid(componentAllocations);
  const incompleteRoadmapStages = roadmap.filter(
    (stage) => !stage.notApplicable && !stage.gregorianDate,
  );
  const roadmapOrderErrors = countRoadmapOrderErrors(roadmap);
  const issueCounts: Record<WizardStep, number> = {
    1: stepOneInvalid ? 1 : 0,
    2: [
      !form.activityDescription.trim(),
      !(Number(form.estimatedAmount) > 0),
      !form.currency,
      !form.fundingSource,
      category === "Works" && !form.pricingBasis,
      form.lotRequired &&
        lots.some(
          (lot) =>
            !lot.number.trim() ||
            !lot.description.trim() ||
            !lot.amount.trim() ||
            !(Number(lot.amount) >= 0),
        ),
    ].filter(Boolean).length,
    3:
      Number(!allocationTotalIsValid(financingAllocations)) +
      Number(!allocationTotalIsValid(componentAllocations)),
    4: incompleteRoadmapStages.length + roadmapOrderErrors,
  };

  function updateField<K extends keyof ActivityFormState>(
    field: K,
    value: ActivityFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectMethod(method: string) {
    const isUnAgency = method === "un-agency";
    setForm((current) => ({
      ...current,
      method,
      requiresUnAgency: isUnAgency,
    }));
    setRoadmap(
      roadmapForMethod(method).map((stage) => ({
        allowNotApplicable: Boolean(stage.allowNotApplicable),
        days: "",
        ethiopianDate: "",
        gregorianDate: "",
        name: stage.name,
        notApplicable: false,
        remarks: "",
        status: "Not Started",
      })),
    );
  }

  function moveTo(nextStep: WizardStep) {
    setAttemptedStep(null);
    setStep(nextStep);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function handleSave() {
    if (stepOneInvalid) {
      setAttemptedStep(1);
      moveTo(1);
      return;
    }
    if (stepTwoInvalid) {
      setAttemptedStep(2);
      moveTo(2);
      return;
    }
    if (stepThreeInvalid) {
      setAttemptedStep(3);
      moveTo(3);
      return;
    }
    if (incompleteRoadmapStages.length > 0 || roadmapOrderErrors > 0) {
      setAttemptedStep(4);
      moveTo(4);
      return;
    }

    onSaveActivity?.({
      ...(initialActivity
        ? {
            id: initialActivity.id,
            activityId: (initialActivity as any).activityId,
            createdById: initialActivity.createdById,
            createdByName: initialActivity.createdByName,
            createdAt: initialActivity.createdAt,
          }
        : {}),
      category,
      currentStage:
        roadmap.find((stage) => !stage.notApplicable)?.name ?? "Not Started",
      description: form.activityDescription.trim(),
      details: {
        componentAllocations: componentAllocations.map((allocation) => ({
          ...allocation,
        })),
        financingAllocations: financingAllocations.map((allocation) => ({
          ...allocation,
        })),
        form: { ...form },
        lots: form.lotRequired ? lots.map((lot) => ({ ...lot })) : [],
        roadmap: roadmap.map((stage) => ({ ...stage })),
      },
      estimatedAmount: Number(form.estimatedAmount),
      method: selectedMethod?.label ?? form.method,
      reference: activityReference,
      status: form.inProcess
        ? "In Progress"
        : initialActivity?.status || "Not Started",
    });
    setSaved(true);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function continueWizard() {
    setAttemptedStep(step);

    if (step === 1 && !stepOneInvalid) moveTo(2);
    if (step === 2 && !stepTwoInvalid) moveTo(3);
    if (step === 3 && !stepThreeInvalid) moveTo(4);
    if (step === 4) {
      handleSave();
    }
  }

  function goBack() {
    if (step === 1) return;
    moveTo((step - 1) as WizardStep);
  }

  const context = {
    activityReference,
    category,
    plan,
    project,
  };

  const stepDescriptions: Record<WizardStep, string> = {
    1: "Confirm the inherited plan category and select the applicable procurement method and controls.",
    2: "Enter identification, financial, funding, lot, and scope information.",
    3: "Complete allocation, procurement classification, and location details.",
    4: "Review and finalize the procurement schedule baseline.",
  };

  return (
    <div className="mx-auto w-full max-w-[74rem] pb-6">
      <ActivityBreadcrumb
        initialActivity={initialActivity}
        plan={plan}
        planHref={planHref}
        project={project}
      />

      {isEditing && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#176c55] text-white shadow-2xs">
              <Edit3 className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-slate-900">
                  Editing Activity:
                </p>
                <span className="font-mono text-xs font-bold text-[#176c55] bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {activityReference}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-600">
                You can click any step below to jump directly to that part, edit
                it, and save.
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#125442] bg-[#176c55] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#125f4c] transition cursor-pointer shrink-0"
            onClick={handleSave}
            type="button"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      )}

      <header className="mt-3 rounded-lg border border-slate-300 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-[#16243a]">
            {isEditing
              ? "Revise Procurement Activity"
              : "Add Procurement Activity"}
          </h1>
          {isEditing && (
            <span className="font-mono text-xs font-bold text-[#176c55] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activityReference}
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          Step {step}: {stepDescriptions[step]}
        </p>
        <WizardProgress
          currentStep={step}
          isEditing={isEditing}
          onStepClick={moveTo}
        />
      </header>

      {saved ? (
        <SavedPanel activityReference={activityReference} planHref={planHref} />
      ) : (
        <>
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <main className="min-w-0">
              {step === 1 ? (
                <KeyDetailsStep
                  attempted={attemptedStep === 1}
                  category={category}
                  form={form}
                  methodOptions={methodOptions}
                  onChange={updateField}
                  onMethodChange={selectMethod}
                  project={project}
                />
              ) : null}
              {step === 2 ? (
                <RelatedInformationStep
                  attempted={attemptedStep === 2}
                  context={context}
                  financingAllocations={financingAllocations}
                  form={form}
                  lots={lots}
                  onChange={updateField}
                  onFinancingChange={setFinancingAllocations}
                  onLotsChange={setLots}
                />
              ) : null}
              {step === 3 ? (
                <AdditionalDetailsStep
                  attempted={attemptedStep === 3}
                  componentAllocations={componentAllocations}
                  financingAllocations={financingAllocations}
                  form={form}
                  onChange={updateField}
                  onComponentChange={setComponentAllocations}
                  onFinancingChange={setFinancingAllocations}
                  project={project}
                />
              ) : null}
              {step === 4 ? (
                <ProcurementRoadmapTable
                  attempted={attemptedStep === 4}
                  methodLabel={selectedMethod?.label ?? "Selected method"}
                  onChange={setRoadmap}
                  stages={roadmap}
                />
              ) : null}
            </main>
            <CheckEntriesPanel
              currentStep={step}
              isEditing={isEditing}
              issueCounts={issueCounts}
              onStepClick={moveTo}
            />
          </div>

          <WizardFooter
            isEditing={isEditing}
            onBack={goBack}
            onContinue={continueWizard}
            onSave={handleSave}
            planHref={planHref}
            step={step}
          />
        </>
      )}
    </div>
  );
}

function createInitialForm(
  project: OfficerProject,
  plan: ProcurementPlanSummary,
  category: ProcurementActivityCategory,
  initialActivity?: ProcurementActivitySummary,
): ActivityFormState {
  if (initialActivity) {
    const d = initialActivity.details?.form;
    const anyAct = initialActivity as any;
    const rawMethod =
      d?.method ||
      initialActivity.method ||
      anyAct.procurementMethod?.code ||
      anyAct.procurementMethod?.label ||
      "";
    const resolvedMethod = resolveMethodKey(rawMethod) || rawMethod;

    return {
      activityDescription:
        initialActivity.description ||
        d?.activityDescription ||
        anyAct.description ||
        "",
      classificationCode:
        d?.classificationCode || anyAct.classificationCode || "",
      comments: d?.comments || anyAct.comments || "",
      contractType: anyAct.contractType || d?.contractType || "Lump Sum",
      currency:
        anyAct.currency || plan.currency || project.baseCurrency || "ETB",
      domesticPreference:
        d?.domesticPreference || anyAct.domesticPreference || "No",
      estimatedAmount: String(
        initialActivity.estimatedAmount ??
          d?.estimatedAmount ??
          anyAct.estimatedBudget ??
          "",
      ),
      evaluationOptionCode:
        d?.evaluationOptionCode || anyAct.evaluationOptionCode || "",
      fundingSource:
        anyAct.fundingSource ||
        d?.fundingSource ||
        anyAct.fundings?.[0]?.fundingSource ||
        project.fundingSource ||
        "",
      highRiskCode: d?.highRiskCode || anyAct.highRiskCode || "",
      inProcess:
        initialActivity.status === "In Progress" || Boolean(d?.inProcess),
      invitationReference:
        d?.invitationReference || anyAct.invitationReference || "",
      latitude: d?.latitude || anyAct.latitude || "",
      location:
        anyAct.location ||
        d?.location ||
        plan.organizationRegion ||
        project.organizationRegion ||
        "",
      longitude: d?.longitude || anyAct.longitude || "",
      lotRequired: Boolean(
        d?.lotRequired ||
        anyAct.lotRequired ||
        (initialActivity.details?.lots &&
          initialActivity.details.lots.length > 0) ||
        (anyAct.lots && anyAct.lots.length > 0),
      ),
      marketApproach:
        anyAct.marketApproach || d?.marketApproach || "Open - National",
      method: resolvedMethod,
      oversightClassification:
        d?.oversightClassification || anyAct.oversightClassification || "",
      pricingBasis:
        category === "Works"
          ? d?.pricingBasis || anyAct.pricingBasis || ""
          : "Not Applicable",
      procurementDocumentType:
        d?.procurementDocumentType || anyAct.procurementDocumentType || "",
      procurementProcess:
        anyAct.procurementProcess ||
        d?.procurementProcess ||
        "1 Envelope (Single Stage 1 Env)",
      qualificationApproach:
        d?.qualificationApproach || anyAct.qualificationApproach || "",
      requiresUnAgency: Boolean(
        d?.requiresUnAgency ||
        anyAct.requiresUnAgency ||
        resolvedMethod === "un-agency",
      ),
      reviewType: anyAct.reviewType || d?.reviewType || "Post Review",
      scopeNotes: d?.scopeNotes || anyAct.scopeNotes || "",
      specificMethod: d?.specificMethod || anyAct.specificMethod || "",
      subcomponent: d?.subcomponent || anyAct.subcomponent || "",
    };
  }

  return {
    activityDescription: "",
    classificationCode: "",
    comments: "",
    contractType: "",
    currency: plan.currency || project.baseCurrency,
    domesticPreference: "",
    estimatedAmount: "",
    evaluationOptionCode: "",
    fundingSource: project.fundingSource,
    highRiskCode: "",
    inProcess: false,
    invitationReference: "",
    latitude: "",
    location: plan.organizationRegion ?? project.organizationRegion ?? "",
    longitude: "",
    lotRequired: false,
    marketApproach: "",
    method: "",
    oversightClassification: "",
    pricingBasis: category === "Works" ? "" : "Not Applicable",
    procurementDocumentType: "",
    procurementProcess: "",
    qualificationApproach: "",
    requiresUnAgency: false,
    reviewType: "",
    scopeNotes: "",
    specificMethod: "",
    subcomponent: "",
  };
}

function extractInitialRoadmap(
  initialActivity: ProcurementActivitySummary | undefined,
  methodKey: string,
): RoadmapStage[] {
  if (initialActivity?.details?.roadmap?.length) {
    return initialActivity.details.roadmap.map((st: any) => ({
      name: st.name || st.stageName || "",
      days: String(st.days || "14"),
      ethiopianDate: st.ethiopianDate || "",
      gregorianDate: st.gregorianDate || st.plannedStartDate || "",
      notApplicable: Boolean(st.notApplicable || st.isNotApplicable),
      allowNotApplicable: Boolean(st.allowNotApplicable),
      remarks: st.remarks || "",
      status: st.status || "Not Started",
    }));
  }
  const anyAct = initialActivity as any;
  if (anyAct?.roadmap?.length) {
    return anyAct.roadmap.map((st: any) => ({
      name: st.name || st.stageName || "",
      days: String(st.days || "14"),
      ethiopianDate: st.ethiopianDate || "",
      gregorianDate: st.gregorianDate || st.plannedStartDate || "",
      notApplicable: Boolean(st.notApplicable || st.isNotApplicable),
      allowNotApplicable: Boolean(st.allowNotApplicable),
      remarks: st.remarks || "",
      status: st.status || "Not Started",
    }));
  }
  if (methodKey) {
    return roadmapForMethod(methodKey).map((stage) => ({
      allowNotApplicable: Boolean(stage.allowNotApplicable),
      days: "",
      ethiopianDate: "",
      gregorianDate: "",
      name: stage.name,
      notApplicable: false,
      remarks: "",
      status: "Not Started",
    }));
  }
  return [];
}

function extractInitialLots(
  initialActivity: ProcurementActivitySummary | undefined,
): LotEntry[] {
  const rawLots =
    initialActivity?.details?.lots || (initialActivity as any)?.lots;
  if (rawLots && rawLots.length > 0) {
    return rawLots.map((lot: any, index: number) => ({
      id: lot.id ?? index + 1,
      number: String(lot.number ?? index + 1),
      description: lot.description || "",
      amount: String(lot.amount || ""),
    }));
  }
  return [{ amount: "", description: "", id: 1, number: "1" }];
}

function extractInitialFinancingAllocations(
  project: OfficerProject,
  initialActivity?: ProcurementActivitySummary,
): Allocation[] {
  const raw =
    initialActivity?.details?.financingAllocations ||
    (initialActivity as any)?.financingAllocations ||
    (initialActivity as any)?.fundings;
  if (raw && raw.length > 0) {
    return raw.map((f: any) => ({
      id: f.id || f.fundingSource || "fs-1",
      percent: String(f.percent ?? f.allocationPct ?? "100"),
      selected: f.selected !== undefined ? Boolean(f.selected) : true,
    }));
  }
  if (project.financingNumbers?.length) {
    return createAllocations(project.financingNumbers);
  }
  if (project.fundingSource) {
    return [{ id: project.fundingSource, percent: "100", selected: true }];
  }
  return [{ id: "Primary Funding", percent: "100", selected: true }];
}

function extractInitialComponentAllocations(
  project: OfficerProject,
  initialActivity?: ProcurementActivitySummary,
): Allocation[] {
  const raw =
    initialActivity?.details?.componentAllocations ||
    (initialActivity as any)?.componentAllocations ||
    (initialActivity as any)?.components;
  if (raw && raw.length > 0) {
    return raw.map((c: any) => ({
      id: c.id || c.component || "comp-1",
      percent: String(c.percent ?? c.allocationPct ?? "100"),
      selected: c.selected !== undefined ? Boolean(c.selected) : true,
    }));
  }
  if (project.components?.length) {
    return createAllocations(project.components);
  }
  return [{ id: "Component 1", percent: "100", selected: true }];
}

function createAllocations(values: readonly string[]): Allocation[] {
  return values.map((id, index) => ({
    id,
    percent: index === 0 ? "100" : "0",
    selected: index === 0,
  }));
}

function allocationTotalIsValid(allocations: readonly Allocation[]) {
  const selected = allocations.filter((allocation) => allocation.selected);
  if (selected.length === 0) return allocations.length === 0;
  return (
    selected.every((allocation) => Number(allocation.percent) > 0) &&
    selected.reduce(
      (total, allocation) => total + Number(allocation.percent),
      0,
    ) === 100
  );
}

function ActivityBreadcrumb({
  initialActivity,
  plan,
  planHref,
  project,
}: {
  initialActivity?: ProcurementActivitySummary;
  plan: ProcurementPlanSummary;
  planHref: string;
  project: OfficerProject;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link className="hover:text-[#176c55]" href="/dashboard/officer">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="hover:text-[#176c55]" href="/workspace/projects">
            Projects
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            className="hover:text-[#176c55]"
            href={
              "/workspace/projects?project=" + encodeURIComponent(project.code)
            }
          >
            {project.shortName}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            className="max-w-52 truncate hover:text-[#176c55]"
            href={planHref}
          >
            {plan.name}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-slate-800">
          {initialActivity ? "Edit Activity" : "Add Activity"}
        </li>
      </ol>
    </nav>
  );
}

function WizardProgress({
  currentStep,
  isEditing = false,
  onStepClick,
}: {
  currentStep: WizardStep;
  isEditing?: boolean;
  onStepClick?: (step: WizardStep) => void;
}) {
  return (
    <ol
      aria-label="Procurement activity creation progress"
      className="mt-5 grid grid-cols-4"
    >
      {steps.map((item, index) => {
        const complete = currentStep > item.number;
        const current = currentStep === item.number;
        const canClick = isEditing || complete || current;

        return (
          <li
            aria-current={current ? "step" : undefined}
            className="relative flex min-w-0 flex-col items-center px-1"
            key={item.number}
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={
                  "absolute top-3 left-[calc(50%+1.25rem)] h-px w-[calc(100%-2.5rem)] " +
                  (complete ? "bg-[#176c55]" : "bg-slate-300")
                }
              />
            ) : null}
            <button
              type="button"
              data-step={item.number}
              disabled={!canClick}
              onClick={() => canClick && onStepClick?.(item.number)}
              title={
                canClick
                  ? `Go to Step ${item.number}: ${item.label}`
                  : undefined
              }
              className={
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-extrabold transition-all " +
                (canClick
                  ? "cursor-pointer hover:scale-110 "
                  : "cursor-default ") +
                (complete
                  ? "border-[#176c55] bg-[#176c55] text-white hover:bg-[#125f4c]"
                  : current
                    ? "border-2 border-[#176c55] bg-white text-[#07523f] shadow-xs"
                    : isEditing
                      ? "border-slate-300 bg-white text-slate-700 hover:border-[#176c55] hover:text-[#176c55]"
                      : "border-slate-300 bg-[#f8fafc] text-slate-400")
              }
            >
              {complete ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                item.number
              )}
            </button>
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onStepClick?.(item.number)}
              className={
                "mt-2 max-w-full truncate text-center text-[10px] font-semibold transition-colors " +
                (canClick
                  ? "cursor-pointer hover:text-[#176c55] "
                  : "cursor-default ") +
                (current
                  ? "text-[#07523f] font-bold"
                  : complete
                    ? "text-slate-700"
                    : isEditing
                      ? "text-slate-600"
                      : "text-slate-400")
              }
            >
              {item.number}. {item.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function CheckEntriesPanel({
  currentStep,
  isEditing = false,
  issueCounts,
  onStepClick,
}: {
  currentStep: WizardStep;
  isEditing?: boolean;
  issueCounts: Record<WizardStep, number>;
  onStepClick?: (step: WizardStep) => void;
}) {
  return (
    <aside className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm lg:sticky lg:top-4">
      <h2 className="border-b border-slate-300 bg-[#dfe8fb] px-3 py-2.5 text-[10px] font-extrabold text-slate-800">
        Check Entries
      </h2>
      <ol className="space-y-1.5 p-3">
        {steps.map((item) => {
          const complete = currentStep > item.number;
          const current = currentStep === item.number;
          const issueCount = issueCounts[item.number];
          const ready = issueCount === 0;
          const canClick = isEditing || complete || current;

          return (
            <li key={item.number}>
              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onStepClick?.(item.number)}
                className={
                  "flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors " +
                  (canClick
                    ? "cursor-pointer hover:bg-slate-50 "
                    : "cursor-default ") +
                  (current && !ready
                    ? "border-red-200 bg-red-50"
                    : current
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-transparent")
                }
              >
                {complete || (current && ready) ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#176c55]"
                  />
                ) : current ? (
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600"
                  />
                ) : (
                  <Circle
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  />
                )}
                <div className="min-w-0">
                  <p
                    className={
                      "text-[10px] font-semibold " +
                      (current && !ready
                        ? "text-red-700"
                        : complete || (current && ready)
                          ? "text-slate-700"
                          : "text-slate-400")
                    }
                  >
                    {item.label}
                  </p>
                  <p
                    className={
                      "mt-0.5 text-[8px] " +
                      (current && !ready ? "text-red-600" : "text-slate-400")
                    }
                  >
                    {complete
                      ? "Completed"
                      : current
                        ? ready
                          ? "Ready"
                          : issueCount +
                            (issueCount === 1
                              ? " issue found"
                              : " issues found")
                        : "Pending"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mx-3 border-t border-slate-200 px-1 py-3">
        <p className="flex items-start gap-2 text-[9px] leading-4 text-slate-500">
          <Info
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
          />
          Complete required entries before continuing. Donor-specific codes
          remain optional until their configured lists are confirmed.
        </p>
      </div>
    </aside>
  );
}

function ActivityContext({
  activityReference,
  category,
  plan,
  project,
}: {
  activityReference: string;
  category: ProcurementActivityCategory;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
}) {
  return (
    <section className="mb-5 rounded-md border border-[#cbd7ee] bg-[#f1f4ff] p-3">
      <h3 className="flex items-center gap-2 border-b border-[#ccd6e8] pb-2 text-[10px] font-extrabold text-[#07523f]">
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
        Inherited Project &amp; Plan Context
      </h3>
      <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-3">
        <ContextItem label="Project" value={project.shortName} />
        <ContextItem label="Plan" value={plan.name} />
        <ContextItem
          label="Responsible Officer"
          value={project.assignedOfficers[0] ?? "Not assigned"}
        />
        <ContextItem label="Primary Funding" value={project.fundingSource} />
        <ContextItem
          label="Sector / Region"
          value={
            plan.organizationRegion ??
            project.organizationRegion ??
            "Not provided"
          }
        />
        <ContextItem label="Plan Category" value={category} />
      </div>
      <span className="sr-only">Activity reference: {activityReference}</span>
    </section>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function FormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-visible rounded-lg border border-slate-300 bg-white shadow-sm">
      <header className="flex items-start gap-2 border-b border-slate-300 bg-[#f6f7fb] px-4 py-3">
        <span className="mt-0.5 text-[#176c55]">{icon}</span>
        <div>
          <h2 className="text-[11px] font-extrabold text-[#16243a]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span
        className={
          "mb-1.5 block text-xs font-semibold " +
          (error ? "text-red-700" : "text-slate-700")
        }
      >
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-medium">
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-4 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectControl({
  children,
  onChange,
  value,
}: {
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <span className="relative block">
      <select
        className={inputClasses + " appearance-none pr-9"}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
      />
    </span>
  );
}

function YesNoChoice({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-semibold text-slate-700">
        {label}
      </legend>
      <div className="grid h-10 w-full grid-cols-2 overflow-hidden rounded-md border border-slate-300 bg-white">
        {[false, true].map((option) => (
          <button
            aria-pressed={value === option}
            className={
              "flex h-full min-w-0 items-center justify-center border-r border-slate-200 px-3 text-xs font-semibold transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176c55] " +
              (value === option
                ? "bg-[#176c55] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-[#f6f7fb] hover:text-[#07523f]")
            }
            key={String(option)}
            onClick={() => onChange(option)}
            type="button"
          >
            {option ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function WizardFooter({
  isEditing = false,
  onBack,
  onContinue,
  onSave,
  planHref,
  step,
}: {
  isEditing?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSave?: () => void;
  planHref: string;
  step: WizardStep;
}) {
  return (
    <footer className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      {step === 1 ? (
        <Link
          className="inline-flex h-10 items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#176c55]"
          href={planHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Cancel / Back to plan
        </Link>
      ) : (
        <button
          className="inline-flex h-10 items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#176c55] cursor-pointer"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Previous Step
        </button>
      )}

      <div className="flex items-center gap-2.5">
        {isEditing && step < 4 && (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#125f4c] transition cursor-pointer"
            onClick={onSave}
            type="button"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save Changes
          </button>
        )}

        <button
          className={
            "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-xs font-bold shadow-sm transition cursor-pointer " +
            (step === 4
              ? "border border-[#125442] bg-[#176c55] text-white hover:bg-[#125f4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
              : isEditing
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                : "border border-[#125442] bg-[#176c55] text-white hover:bg-[#125f4c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]")
          }
          onClick={step === 4 ? onSave : onContinue}
          type="button"
        >
          {step === 4 ? (
            <>
              <Save aria-hidden="true" className="h-4 w-4" />
              {isEditing
                ? "Save Activity Changes"
                : "Save Procurement Activity"}
            </>
          ) : (
            <>
              Continue to Step {step + 1}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </footer>
  );
}

function SavedPanel({
  activityReference,
  planHref,
}: {
  activityReference: string;
  planHref: string;
}) {
  return (
    <section className="mt-5 rounded-lg border border-emerald-200 bg-white p-8 text-center shadow-sm">
      <CheckCircle2
        aria-hidden="true"
        className="mx-auto h-10 w-10 text-[#176c55]"
      />
      <h2 className="mt-3 text-lg font-extrabold text-[#10243f]">
        Procurement activity saved
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-600">
        Activity {activityReference} has been prepared with its method-specific
        roadmap and is ready for the next workflow action.
      </p>
      <Link
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176c55] px-5 text-xs font-bold text-white hover:bg-[#125f4c]"
        href={planHref}
      >
        Return to procurement plan
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

function KeyDetailsStep({
  attempted,
  category,
  form,
  methodOptions,
  onChange,
  onMethodChange,
  project,
}: {
  attempted: boolean;
  category: ProcurementActivityCategory;
  form: ActivityFormState;
  methodOptions: ReturnType<typeof methodsForCategory>;
  onChange: UpdateActivityField;
  onMethodChange: (value: string) => void;
  project: OfficerProject;
}) {
  const selectedMethod = procurementMethodOptions.find(
    (method) => method.key === form.method,
  );
  const usesCompetition =
    form.method === "rfb-international" ||
    form.method === "rfb-national" ||
    form.method === "rfq-shopping";
  const usesRfb =
    form.method === "rfb-international" || form.method === "rfb-national";
  const consultancy = category === "Consultancy Services";
  const preferenceApplies =
    usesRfb && (category === "Goods" || category === "Works");
  const donorFields =
    project.fundingSource.toLowerCase().includes("world bank") ||
    project.fundingSource.toLowerCase().includes("afdb");

  const documentTypes =
    category === "Goods"
      ? [
          "Request for Bids SPD (Goods) - 1 envelope",
          "National Procurement Document - 1 Envelope",
          "Request for Quotations (Non Bank-SPD)",
        ]
      : category === "Works"
        ? [
            "Request for Bids - Small Works SPD",
            "National Procurement Document - 1 Envelope",
            "Request for Quotations (Non Bank-SPD)",
          ]
        : ["Request for Quotations (Non Bank-SPD)"];

  return (
    <FormSection
      description="The category stays within the procurement plan. Method-dependent controls appear after a method is selected."
      icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
      title="Procurement Method & Controls"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          hint="Inherited from the procurement plan and cannot be changed here."
          label="Procurement Category"
        >
          <div
            className={
              inputClasses + " flex items-center justify-between bg-slate-50"
            }
          >
            <span className="font-semibold">{category}</span>
            <LockKeyhole
              aria-hidden="true"
              className="h-3.5 w-3.5 text-slate-400"
            />
          </div>
        </Field>

        <Field
          error={
            attempted && !form.method
              ? "Select a procurement method."
              : undefined
          }
          label="Procurement Method"
          required
        >
          <SelectControl onChange={onMethodChange} value={form.method}>
            <option value="">Select method</option>
            {methodOptions.map((method) => (
              <option key={method.key} value={method.key}>
                {method.label}
              </option>
            ))}
          </SelectControl>
        </Field>

        {form.method ? (
          <Field
            hint="Optional narrower approach supplied by the configured donor framework."
            label="Specific Method / Particular Approach"
          >
            <input
              className={inputClasses}
              onChange={(event) =>
                onChange("specificMethod", event.target.value)
              }
              placeholder="Enter configured sub-method, if applicable"
              value={form.specificMethod}
            />
          </Field>
        ) : null}

        {usesCompetition ? (
          <Field label="Market Approach">
            <SelectControl
              onChange={(value) => onChange("marketApproach", value)}
              value={form.marketApproach}
            >
              <option value="">Select approach</option>
              <option>Open - International</option>
              <option>Open - National</option>
              <option>Limited</option>
              <option>Direct</option>
              {form.method === "rfq-shopping" ? (
                <option>Shopping</option>
              ) : null}
            </SelectControl>
          </Field>
        ) : null}

        {usesRfb ? (
          <Field label="Qualification Approach">
            <SelectControl
              onChange={(value) => onChange("qualificationApproach", value)}
              value={form.qualificationApproach}
            >
              <option value="">Select qualification</option>
              <option>Prequalification</option>
              <option>Post-qualification</option>
              <option>Not Applicable</option>
            </SelectControl>
          </Field>
        ) : null}

        {preferenceApplies ? (
          <Field label="Domestic / Regional Preference">
            <SelectControl
              onChange={(value) => onChange("domesticPreference", value)}
              value={form.domesticPreference}
            >
              <option value="">Select preference</option>
              <option>Yes</option>
              <option>No</option>
            </SelectControl>
          </Field>
        ) : null}

        {form.method ? (
          <Field label="Review Type">
            <SelectControl
              onChange={(value) => onChange("reviewType", value)}
              value={form.reviewType}
            >
              <option value="">Select review type</option>
              <option>Prior</option>
              <option>Post</option>
            </SelectControl>
          </Field>
        ) : null}

        {form.method ? (
          <Field
            hint="Audit remains a separate configurable legacy oversight value."
            label="Oversight Classification"
          >
            <SelectControl
              onChange={(value) => onChange("oversightClassification", value)}
              value={form.oversightClassification}
            >
              <option value="">Not specified</option>
              <option>Audit</option>
            </SelectControl>
          </Field>
        ) : null}

        {usesRfb ? (
          <Field label="Procurement Process">
            <SelectControl
              onChange={(value) => onChange("procurementProcess", value)}
              value={form.procurementProcess}
            >
              <option value="">Select configured process</option>
              <option>Single Stage One Envelope</option>
            </SelectControl>
          </Field>
        ) : null}

        {!consultancy && form.method ? (
          <Field label="Procurement Document Type">
            <SelectControl
              onChange={(value) => onChange("procurementDocumentType", value)}
              value={form.procurementDocumentType}
            >
              <option value="">Select document type</option>
              {documentTypes.map((documentType) => (
                <option key={documentType}>{documentType}</option>
              ))}
            </SelectControl>
          </Field>
        ) : null}

        {consultancy && form.method ? (
          <Field label="Contract Type">
            <SelectControl
              onChange={(value) => onChange("contractType", value)}
              value={form.contractType}
            >
              <option value="">Select contract type</option>
              <option>Lump Sum</option>
              <option>Time Based</option>
            </SelectControl>
          </Field>
        ) : null}

        {donorFields && form.method ? (
          <>
            <Field
              hint="Optional donor code; not enforced until the configured code list is confirmed."
              label="Evaluation Options"
            >
              <input
                className={inputClasses}
                onChange={(event) =>
                  onChange("evaluationOptionCode", event.target.value)
                }
                placeholder="Optional configured code"
                value={form.evaluationOptionCode}
              />
            </Field>
            <Field
              hint="Optional donor code; not enforced until the code mapping is confirmed."
              label="High SEA/SH Risk"
            >
              <input
                className={inputClasses}
                onChange={(event) =>
                  onChange("highRiskCode", event.target.value)
                }
                placeholder="Optional configured code"
                value={form.highRiskCode}
              />
            </Field>
          </>
        ) : null}
      </div>

      {form.method ? (
        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <YesNoChoice
            label="Requires UN Agency Contracting"
            onChange={(value) => {
              onChange("requiresUnAgency", value);
              if (value && form.method !== "un-agency") {
                onMethodChange("un-agency");
              }
            }}
            value={form.requiresUnAgency}
          />
          <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-slate-300 bg-[#fbfcfd] px-3">
            <input
              checked={form.inProcess}
              className="h-4 w-4 accent-[#176c55]"
              onChange={(event) => onChange("inProcess", event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-[10px] font-bold text-slate-700">
                Activity already in process
              </span>
              <span className="block text-[9px] text-slate-500">
                Use only when migrating an existing procurement activity.
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {selectedMethod ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-[#c8ded5] bg-[#f2f8f5] px-3 py-2.5 text-[10px] leading-4 text-[#07523f]">
          <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The {selectedMethod.label} roadmap template will be generated in Step
          4.
        </div>
      ) : null}
    </FormSection>
  );
}

function RelatedInformationStep({
  attempted,
  context,
  financingAllocations,
  form,
  lots,
  onChange,
  onFinancingChange,
  onLotsChange,
}: {
  attempted: boolean;
  context: {
    activityReference: string;
    category: ProcurementActivityCategory;
    plan: ProcurementPlanSummary;
    project: OfficerProject;
  };
  financingAllocations: Allocation[];
  form: ActivityFormState;
  lots: LotEntry[];
  onChange: UpdateActivityField;
  onFinancingChange: (value: Allocation[]) => void;
  onLotsChange: (value: LotEntry[]) => void;
}) {
  const { activityReference, category, project } = context;

  function updateLot(
    id: number,
    field: keyof Omit<LotEntry, "id">,
    value: string,
  ) {
    onLotsChange(
      lots.map((lot) => (lot.id === id ? { ...lot, [field]: value } : lot)),
    );
  }

  function addLot() {
    const nextId =
      lots.reduce((highest, lot) => Math.max(highest, lot.id), 0) + 1;
    onLotsChange([
      ...lots,
      {
        amount: "",
        description: "",
        id: nextId,
        number: String(nextId),
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <FormSection
        description="Describe the package and identify its funding, component context, and any lot structure."
        icon={<FileText aria-hidden="true" className="h-4 w-4" />}
        title="Activity Information"
      >
        <ActivityContext {...context} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field
            hint="Generated by the system. Imported activity references are preserved during migration."
            label="Activity Reference No."
          >
            <div
              className={
                inputClasses +
                " flex items-center justify-between bg-slate-50 font-mono"
              }
            >
              <span>{activityReference}</span>
              <LockKeyhole
                aria-hidden="true"
                className="h-3.5 w-3.5 text-slate-400"
              />
            </div>
          </Field>

          <div className="md:col-span-1 xl:col-span-2">
            <Field
              error={
                attempted && !form.activityDescription.trim()
                  ? "Enter the activity, package, or assignment description."
                  : undefined
              }
              label="Activity / Package / Assignment Description"
              required
            >
              <textarea
                className={textareaClasses + " min-h-20"}
                onChange={(event) =>
                  onChange("activityDescription", event.target.value)
                }
                placeholder="Describe what will be procured"
                value={form.activityDescription}
              />
            </Field>
          </div>

          <Field
            error={
              attempted && !(Number(form.estimatedAmount) > 0)
                ? "Enter an estimated amount greater than zero."
                : undefined
            }
            label="Estimated Amount"
            required
          >
            <input
              className={inputClasses}
              min="0"
              onChange={(event) =>
                onChange("estimatedAmount", event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                }
              }}
              onWheel={(event) => event.currentTarget.blur()}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={form.estimatedAmount}
            />
          </Field>

          <Field label="Currency" required>
            <SelectControl
              onChange={(value) => onChange("currency", value)}
              value={form.currency}
            >
              <option value="">Select currency</option>
              <option value="ETB">ETB - Ethiopian Birr</option>
              <option value="USD">USD - United States Dollar</option>
              <option value="UA">UA - Unit of Account</option>
            </SelectControl>
          </Field>

          <Field label="Funding Source" required>
            <SelectControl
              onChange={(value) => onChange("fundingSource", value)}
              value={form.fundingSource}
            >
              <option value={project.fundingSource}>
                {project.fundingSource}
              </option>
              {project.fundingSource !== "Treasury" ? (
                <option value="Treasury">Treasury</option>
              ) : null}
            </SelectControl>
          </Field>

          {category === "Works" ? (
            <Field
              error={
                attempted && !form.pricingBasis
                  ? "Select the pricing basis for this Works activity."
                  : undefined
              }
              label="Pricing Basis"
              required
            >
              <SelectControl
                onChange={(value) => onChange("pricingBasis", value)}
                value={form.pricingBasis}
              >
                <option value="">Select pricing basis</option>
                <option>Lump Sum</option>
                <option>Bill of Quantities (BOQ)</option>
              </SelectControl>
            </Field>
          ) : null}

          <Field label="Subcomponent">
            <SelectControl
              onChange={(value) => onChange("subcomponent", value)}
              value={form.subcomponent}
            >
              <option value="">Not specified</option>
              {(project.subcomponents ?? []).map((subcomponent) => (
                <option key={subcomponent}>{subcomponent}</option>
              ))}
            </SelectControl>
          </Field>

          <Field label="Invitation / Bid Reference Number">
            <input
              className={inputClasses}
              onChange={(event) =>
                onChange("invitationReference", event.target.value)
              }
              placeholder="Enter when issued"
              value={form.invitationReference}
            />
          </Field>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-600">
            Loan / Credit / Grant Number
          </h3>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">
            Select the project financing instrument(s). Split percentages are
            completed in Additional Details.
          </p>
          <div className="mt-3">
            <AllocationSelector
              allocations={financingAllocations}
              emptyMessage="No financing number was entered for this project."
              onChange={onFinancingChange}
              showPercent={false}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        description="Add lot records only when the procurement package will be divided into separate lots."
        icon={<ListChecks aria-hidden="true" className="h-4 w-4" />}
        title="Lots and Scope"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <YesNoChoice
            label="Lot Required?"
            onChange={(value) => onChange("lotRequired", value)}
            value={form.lotRequired}
          />
        </div>

        {form.lotRequired ? (
          <div className="mt-4 space-y-3">
            {lots.map((lot, index) => (
              <div
                className="grid gap-3 rounded-md border border-slate-200 bg-[#fbfcfd] p-3 sm:grid-cols-[0.35fr_1.4fr_0.65fr_auto]"
                key={lot.id}
              >
                <Field
                  error={
                    attempted && !lot.number.trim() ? "Required" : undefined
                  }
                  label="Lot Number"
                  required
                >
                  <input
                    className={inputClasses}
                    onChange={(event) =>
                      updateLot(lot.id, "number", event.target.value)
                    }
                    value={lot.number}
                  />
                </Field>
                <Field
                  error={
                    attempted && !lot.description.trim()
                      ? "Enter a lot description."
                      : undefined
                  }
                  label="Lot Description"
                  required
                >
                  <input
                    className={inputClasses}
                    onChange={(event) =>
                      updateLot(lot.id, "description", event.target.value)
                    }
                    placeholder="Describe this lot"
                    value={lot.description}
                  />
                </Field>
                <Field label="Estimated Lot Amount" required>
                  <input
                    className={inputClasses}
                    min="0"
                    onChange={(event) =>
                      updateLot(lot.id, "amount", event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowUp" ||
                        event.key === "ArrowDown"
                      ) {
                        event.preventDefault();
                      }
                    }}
                    onWheel={(event) => event.currentTarget.blur()}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={lot.amount}
                  />
                </Field>
                <button
                  aria-label={"Remove lot " + String(index + 1)}
                  className="mt-[1.35rem] flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={lots.length === 1}
                  onClick={() =>
                    onLotsChange(lots.filter((entry) => entry.id !== lot.id))
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#8db9a8] bg-white px-3 text-[10px] font-bold text-[#176c55] hover:bg-[#edf5f1]"
              onClick={addLot}
              type="button"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Add another lot
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
          <Field
            hint="Use this for detailed technical or implementation scope."
            label="Description / Scope Notes"
          >
            <textarea
              className={textareaClasses}
              onChange={(event) => onChange("scopeNotes", event.target.value)}
              placeholder="Add scope details"
              value={form.scopeNotes}
            />
          </Field>
          <Field label="Comments / Remarks">
            <textarea
              className={textareaClasses}
              onChange={(event) => onChange("comments", event.target.value)}
              placeholder="Optional planning remarks"
              value={form.comments}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}

function AdditionalDetailsStep({
  attempted,
  componentAllocations,
  financingAllocations,
  form,
  onChange,
  onComponentChange,
  onFinancingChange,
  project,
}: {
  attempted: boolean;
  componentAllocations: Allocation[];
  financingAllocations: Allocation[];
  form: ActivityFormState;
  onChange: UpdateActivityField;
  onComponentChange: (value: Allocation[]) => void;
  onFinancingChange: (value: Allocation[]) => void;
  project: OfficerProject;
}) {
  const financingValid = allocationTotalIsValid(financingAllocations);
  const componentValid = allocationTotalIsValid(componentAllocations);
  const regions = Array.from(
    new Set(
      [
        ...(project.availableOrganizationRegions ?? []),
        project.organizationRegion,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  return (
    <div className="space-y-4">
      <FormSection
        description="Allocate the activity across project financing instruments and components. Selected percentages must total 100%."
        icon={<CircleDollarSign aria-hidden="true" className="h-4 w-4" />}
        title="Allocation & Additional Details"
      >
        {attempted && (!financingValid || !componentValid) ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700"
            role="alert"
          >
            <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Each selected allocation group must total exactly 100%, with a
            positive percentage for every selected item.
          </div>
        ) : null}

        <div className="grid gap-5">
          <AllocationBlock
            allocations={componentAllocations}
            emptyMessage="No project component was entered for this project."
            icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
            onChange={onComponentChange}
            title="Component Allocation"
          />
          <AllocationBlock
            allocations={financingAllocations}
            emptyMessage="No financing number was entered for this project."
            icon={<Landmark aria-hidden="true" className="h-4 w-4" />}
            onChange={onFinancingChange}
            title="Financing Allocation"
          />
        </div>
      </FormSection>

      <FormSection
        description="Classification and geolocation remain optional for ordinary MoA activities and can be completed where donor reporting requires them."
        icon={<MapPin aria-hidden="true" className="h-4 w-4" />}
        title="Classification and Location"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field
            hint="Search/select will use the configured procurement classification catalogue."
            label="Procurement Classification Code"
          >
            <input
              className={inputClasses}
              onChange={(event) =>
                onChange("classificationCode", event.target.value)
              }
              placeholder="Search classification code"
              type="search"
              value={form.classificationCode}
            />
          </Field>

          <Field
            hint="Derived automatically from the selected classification code."
            label="Classification Description"
          >
            <div
              className={
                inputClasses + " flex items-center bg-slate-50 text-slate-500"
              }
            >
              {form.classificationCode
                ? "Resolved from configured catalogue"
                : "Not selected"}
            </div>
          </Field>

          <Field label="Location / Region">
            {regions.length > 0 ? (
              <SelectControl
                onChange={(value) => onChange("location", value)}
                value={form.location}
              >
                <option value="">Not specified</option>
                {regions.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </SelectControl>
            ) : (
              <input
                className={inputClasses}
                onChange={(event) => onChange("location", event.target.value)}
                placeholder="Enter location or region"
                value={form.location}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input
                className={inputClasses}
                max="90"
                min="-90"
                onChange={(event) => onChange("latitude", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                  }
                }}
                onWheel={(event) => event.currentTarget.blur()}
                placeholder="0.000000"
                step="any"
                type="number"
                value={form.latitude}
              />
            </Field>
            <Field label="Longitude">
              <input
                className={inputClasses}
                max="180"
                min="-180"
                onChange={(event) => onChange("longitude", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                  }
                }}
                onWheel={(event) => event.currentTarget.blur()}
                placeholder="0.000000"
                step="any"
                type="number"
                value={form.longitude}
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

function AllocationBlock({
  allocations,
  emptyMessage,
  icon,
  onChange,
  title,
}: {
  allocations: Allocation[];
  emptyMessage: string;
  icon: ReactNode;
  onChange: (value: Allocation[]) => void;
  title: string;
}) {
  const total = allocations
    .filter((allocation) => allocation.selected)
    .reduce((sum, allocation) => sum + Number(allocation.percent), 0);

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <h3 className="flex items-center gap-2 text-[10px] font-extrabold text-[#10243f]">
          <span className="text-[#176c55]">{icon}</span>
          {title}
        </h3>
        {allocations.length > 0 ? (
          <span
            className={
              "rounded px-2 py-1 text-[9px] font-extrabold " +
              (total === 100
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700")
            }
          >
            Total {total}%
          </span>
        ) : null}
      </div>
      <div className="mt-2">
        <AllocationSelector
          allocations={allocations}
          emptyMessage={emptyMessage}
          onChange={onChange}
          showPercent
        />
      </div>
    </section>
  );
}

function AllocationSelector({
  allocations,
  emptyMessage,
  onChange,
  showPercent,
}: {
  allocations: Allocation[];
  emptyMessage: string;
  onChange: (value: Allocation[]) => void;
  showPercent: boolean;
}) {
  if (allocations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-[10px] text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  function toggle(id: string) {
    const toggled = allocations.map((allocation) =>
      allocation.id === id
        ? { ...allocation, selected: !allocation.selected }
        : allocation,
    );
    const selected = toggled.filter((allocation) => allocation.selected);

    if (selected.length === 0) {
      onChange(toggled.map((allocation) => ({ ...allocation, percent: "0" })));
      return;
    }

    const evenShare = Math.floor(10000 / selected.length) / 100;
    let assigned = 0;
    const lastSelectedId = selected[selected.length - 1].id;
    onChange(
      toggled.map((allocation) => {
        if (!allocation.selected) return { ...allocation, percent: "0" };
        const percent =
          allocation.id === lastSelectedId
            ? Math.round((100 - assigned) * 100) / 100
            : evenShare;
        assigned += percent;
        return { ...allocation, percent: String(percent) };
      }),
    );
  }

  return (
    <div className="space-y-2">
      {allocations.map((allocation) => (
        <div
          className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
          key={allocation.id}
        >
          <input
            aria-label={"Select " + allocation.id}
            checked={allocation.selected}
            className="h-4 w-4 shrink-0 accent-[#176c55]"
            onChange={() => toggle(allocation.id)}
            type="checkbox"
          />
          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-700">
            {allocation.id}
          </span>
          {showPercent && allocation.selected ? (
            <label className="flex shrink-0 items-center gap-1">
              <span className="sr-only">
                {allocation.id} allocation percentage
              </span>
              <input
                className="h-8 w-20 rounded border border-slate-300 px-2 text-right text-[10px] outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
                max="100"
                min="0.01"
                onChange={(event) =>
                  onChange(
                    allocations.map((entry) =>
                      entry.id === allocation.id
                        ? { ...entry, percent: event.target.value }
                        : entry,
                    ),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                  }
                }}
                onWheel={(event) => event.currentTarget.blur()}
                step="0.01"
                type="number"
                value={allocation.percent}
              />
              <span className="text-[10px] font-bold text-slate-500">%</span>
            </label>
          ) : null}
        </div>
      ))}
    </div>
  );
}
