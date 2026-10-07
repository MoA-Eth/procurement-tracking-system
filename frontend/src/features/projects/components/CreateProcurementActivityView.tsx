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
  AdditionalReference,
  FundingContribution,
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
  getAllProcurementMethodOptions,
  roadmapForMethod,
  resolveMethodKey,
  resolveProcurementMethodOption,
  type ProcurementActivityCategory,
} from "../data/procurementActivityConfig";
import {
  createLookup,
  fetchLookups,
  getInitialLookups,
  subscribeToLookups,
} from "@/lib/lookupsApi";
import {
  AlertCircle,
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
  Loader2,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";

type WizardStep = 1 | 2 | 3 | 4;

type UpdateActivityField = <K extends keyof ActivityFormState>(
  field: K,
  value: ActivityFormState[K],
) => void;

const compactFieldClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15";
const compactTextareaClasses =
  "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15";
const inputClasses = compactFieldClasses;
const textareaClasses = compactTextareaClasses;

const steps = [
  { label: "Key Details", number: 1 },
  { label: "Related Information", number: 2 },
  { label: "Additional Details", number: 3 },
  { label: "Roadmap", number: 4 },
] as const;

export function isCompetitiveMethod(method?: string): boolean {
  if (!method) return false;
  const m = method.toLowerCase().trim();
  return (
    m !== "direct" &&
    m !== "sss" &&
    !m.includes("direct") &&
    !m.includes("single source") &&
    !m.includes("single-source") &&
    m !== "un-agency" &&
    m !== "un_agency"
  );
}

export function CreateProcurementActivityView({
  existingActivityCount,
  initialActivity,
  isAdditionalPlan = false,
  onSaveActivity,
  onSubmitAdditionalPlan,
  parentPlan,
  plan,
  project,
}: {
  existingActivityCount?: number;
  initialActivity?: ProcurementActivitySummary;
  isAdditionalPlan?: boolean;
  onSaveActivity?: (
    activity: ProcurementActivitySummary,
  ) => void | Promise<void>;
  onSubmitAdditionalPlan?: (data: {
    additionalPlanReason: string;
    activity: ProcurementActivitySummary;
  }) => void | Promise<void>;
  parentPlan?: ProcurementPlanSummary;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
}) {
  const isEditing = Boolean(initialActivity);
  const category = normalizeActivityCategory(plan.category);
  const [step, setStep] = useState<WizardStep>(1);
  const [attemptedSteps, setAttemptedSteps] = useState<
    Record<WizardStep, boolean>
  >({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [additionalPlanReason, setAdditionalPlanReason] = useState<string>("");

  const initialMethodKey = resolveMethodKey(
    initialActivity?.details?.form?.method ||
      initialActivity?.method ||
      (initialActivity as any)?.procurementMethod?.code ||
      (initialActivity as any)?.procurementMethod?.label ||
      "",
  );

  const [activityCategory, setActivityCategory] =
    useState<ProcurementActivityCategory>(() =>
      initialActivity?.category
        ? normalizeActivityCategory(initialActivity.category)
        : category,
    );

  const loadedActivityRef = useRef<string | null>(
    initialActivity
      ? initialActivity.id ||
          initialActivity.reference ||
          initialActivity.description
      : null,
  );

  const [form, setForm] = useState<ActivityFormState>(() =>
    createInitialForm(
      project,
      plan,
      initialActivity?.category
        ? normalizeActivityCategory(initialActivity.category)
        : category,
      initialActivity,
    ),
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
  const [additionalReferences, setAdditionalReferences] = useState<
    AdditionalReference[]
  >(() => extractInitialAdditionalReferences(initialActivity));
  const [roadmap, setRoadmap] = useState<RoadmapStage[]>(() =>
    extractInitialRoadmap(
      initialActivity,
      initialMethodKey,
      initialActivity?.category || category,
    ),
  );

  // Synchronize state only when a different initialActivity arrives
  useEffect(() => {
    if (!initialActivity) return;
    const activityKey =
      initialActivity.id ||
      initialActivity.reference ||
      initialActivity.description;
    if (loadedActivityRef.current === activityKey) return;
    loadedActivityRef.current = activityKey;

    const targetCat = initialActivity.category
      ? normalizeActivityCategory(initialActivity.category)
      : category;
    setActivityCategory(targetCat);

    const resolvedKey = resolveMethodKey(
      initialActivity.details?.form?.method ||
        initialActivity.method ||
        (initialActivity as any)?.procurementMethod?.code ||
        (initialActivity as any)?.procurementMethod?.label ||
        "",
    );
    setForm(createInitialForm(project, plan, targetCat, initialActivity));
    setFinancingAllocations(
      extractInitialFinancingAllocations(project, initialActivity),
    );
    setComponentAllocations(
      extractInitialComponentAllocations(project, initialActivity),
    );
    setLots(extractInitialLots(initialActivity));
    setAdditionalReferences(
      extractInitialAdditionalReferences(initialActivity),
    );
    setRoadmap(
      extractInitialRoadmap(
        initialActivity,
        resolvedKey,
        initialActivity?.category || category,
      ),
    );
  }, [initialActivity, project, plan, category]);

  const [lookupVersion, setLookupVersion] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      fetchLookups("PROCUREMENT_METHOD"),
      fetchLookups("CURRENCY"),
    ]).then(() => {
      setLookupVersion((v) => v + 1);
    });
    const unsub = subscribeToLookups(() => {
      setLookupVersion((v) => v + 1);
    });
    return () => unsub();
  }, []);

  const methodOptions = useMemo(
    () => methodsForCategory(activityCategory),
    [activityCategory, lookupVersion],
  );
  const currencyOptions = useMemo(() => {
    const items = getInitialLookups("CURRENCY");
    return items.map((item) => ({ code: item.code, label: item.label }));
  }, [lookupVersion]);
  const selectedMethod = useMemo(
    () => resolveProcurementMethodOption(form.method),
    [form.method, lookupVersion],
  );
  const planRefParam = plan.id || plan.reference || plan.name;
  const planHref =
    "/workspace/projects?project=" +
    encodeURIComponent(project.code) +
    "&plan=" +
    encodeURIComponent(planRefParam);
  const activityReference = initialActivity
    ? initialActivity.reference
    : activityReferenceFor(
        project,
        plan,
        category,
        form.method,
        existingActivityCount,
      );

  const usesCompetition = isCompetitiveMethod(form.method);
  const usesRfb =
    form.method === "rfb" ||
    form.method === "rfb-international" ||
    form.method === "rfb-national";
  const consultancy = category === "Consultancy Services";
  const preferenceApplies =
    usesRfb && (category === "Goods" || category === "Works");

  const justificationInvalid = Boolean(
    isAdditionalPlan && additionalPlanReason.trim().length < 10,
  );

  const stepOneInvalid =
    justificationInvalid ||
    !form.method ||
    (usesCompetition && !form.marketApproach) ||
    (usesRfb && !form.qualificationApproach) ||
    (preferenceApplies && !form.domesticPreference) ||
    (usesRfb && !form.procurementProcess) ||
    (consultancy && Boolean(form.method) && !form.contractType);
  const multiFundingInvalid = Boolean(
    form.hasMultiFunding &&
    (!form.fundingContributions ||
      form.fundingContributions.length === 0 ||
      form.fundingContributions.some(
        (c) =>
          !c.fundingSource.trim() ||
          !c.currency.trim() ||
          !(Number(c.amount) > 0),
      )),
  );

  const stepTwoInvalid =
    !form.activityDescription.trim() ||
    !(Number(form.estimatedAmount) > 0) ||
    !form.currency ||
    !form.fundingSource ||
    (category === "Works" && !form.pricingBasis) ||
    multiFundingInvalid ||
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
    1: [
      justificationInvalid,
      !form.method,
      usesCompetition && !form.marketApproach,
      usesRfb && !form.qualificationApproach,
      preferenceApplies && !form.domesticPreference,
      usesRfb && !form.procurementProcess,
      consultancy && Boolean(form.method) && !form.contractType,
    ].filter(Boolean).length,
    2: [
      !form.activityDescription.trim(),
      !(Number(form.estimatedAmount) > 0),
      !form.currency,
      !form.fundingSource,
      category === "Works" && !form.pricingBasis,
      multiFundingInvalid,
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
      roadmapForMethod(method, category).map((stage) => ({
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

  function scrollToFirstError() {
    setTimeout(() => {
      const el = document.querySelector(
        "[data-field-has-error='true'], [aria-invalid='true'], .border-red-500, [role='alert']",
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  }

  function moveTo(nextStep: WizardStep) {
    setStep(nextStep);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function handleStepClick(targetStep: WizardStep) {
    if (issueCounts[targetStep] > 0) {
      setAttemptedSteps((prev) => ({ ...prev, [targetStep]: true }));
    }
    moveTo(targetStep);
    if (issueCounts[targetStep] > 0) {
      scrollToFirstError();
    }
  }

  function addAdditionalReference() {
    const nextId = String(Date.now() + Math.random());
    setAdditionalReferences((prev) => [
      ...prev,
      {
        id: nextId,
        type: "STEP Reference",
        value: "",
      },
    ]);
  }

  function updateAdditionalReference(
    id: string,
    field: "type" | "value",
    value: string,
  ) {
    setAdditionalReferences((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function removeAdditionalReference(id: string) {
    setAdditionalReferences((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    if (stepOneInvalid) {
      setAttemptedSteps((prev) => ({ ...prev, 1: true }));
      moveTo(1);
      scrollToFirstError();
      return;
    }
    if (stepTwoInvalid) {
      setAttemptedSteps((prev) => ({ ...prev, 2: true }));
      moveTo(2);
      scrollToFirstError();
      return;
    }
    if (stepThreeInvalid) {
      setAttemptedSteps((prev) => ({ ...prev, 3: true }));
      moveTo(3);
      scrollToFirstError();
      return;
    }
    if (incompleteRoadmapStages.length > 0 || roadmapOrderErrors > 0) {
      setAttemptedSteps((prev) => ({ ...prev, 4: true }));
      moveTo(4);
      scrollToFirstError();
      return;
    }

    setIsSaving(true);
    try {
      if (onSaveActivity) {
        const cleanAdditionalRefs = additionalReferences
          .filter((r) => r.value.trim().length > 0)
          .map((r) => ({ ...r }));
        const primaryStepRef =
          cleanAdditionalRefs
            .find(
              (r) => r.type.toLowerCase().includes("step") && r.value.trim(),
            )
            ?.value.trim() ||
          cleanAdditionalRefs[0]?.value.trim() ||
          "";

        const constructedActivity: ProcurementActivitySummary = {
          ...(initialActivity
            ? {
                id: initialActivity.id,
                activityId: (initialActivity as any).activityId,
                createdById: initialActivity.createdById,
                createdByName: initialActivity.createdByName,
                createdAt: initialActivity.createdAt,
              }
            : {}),
          category: activityCategory,
          currentStage:
            roadmap.find((stage) => !stage.notApplicable)?.name ??
            "Not Started",
          description: form.activityDescription.trim(),
          details: {
            additionalReferences: cleanAdditionalRefs,
            componentAllocations: componentAllocations.map((allocation) => ({
              ...allocation,
            })),
            financingAllocations: financingAllocations.map((allocation) => ({
              ...allocation,
            })),
            form: {
              ...form,
              hasMultiFunding: form.hasMultiFunding,
              fundingContributions: form.hasMultiFunding
                ? (form.fundingContributions || []).filter(
                    (c) => c.fundingSource.trim() || Number(c.amount) > 0,
                  )
                : undefined,
              additionalReferences: cleanAdditionalRefs,
              stepReference: primaryStepRef,
            },
            fundingContributions: form.hasMultiFunding
              ? (form.fundingContributions || []).filter(
                  (c) => c.fundingSource.trim() || Number(c.amount) > 0,
                )
              : undefined,
            lots: form.lotRequired ? lots.map((lot) => ({ ...lot })) : [],
            roadmap: roadmap.map((stage) => ({ ...stage })),
          },
          currency: form.currency || plan.currency || "ETB",
          fundingSource: form.fundingSource || undefined,
          fundingContributions: form.hasMultiFunding
            ? (form.fundingContributions || []).filter(
                (c) => c.fundingSource.trim() || Number(c.amount) > 0,
              )
            : undefined,
          hasMultiFunding: form.hasMultiFunding,
          estimatedAmount: Number(form.estimatedAmount),
          method: selectedMethod?.label ?? form.method,
          reference: activityReference,
          status: form.inProcess
            ? "In Progress"
            : initialActivity?.status ||
              (isAdditionalPlan ? "Submitted to Director" : "Not Started"),
        };

        if (isAdditionalPlan && onSubmitAdditionalPlan) {
          await onSubmitAdditionalPlan({
            additionalPlanReason: additionalPlanReason.trim(),
            activity: constructedActivity,
          });
        } else if (onSaveActivity) {
          await onSaveActivity(constructedActivity);
        }
      }
      setSaved(true);
      window.scrollTo({ behavior: "smooth", top: 0 });
    } catch (err) {
      console.error("Save activity error:", err);
    } finally {
      setIsSaving(false);
    }
  }

  function continueWizard() {
    setAttemptedSteps((prev) => ({ ...prev, [step]: true }));

    if (step === 1) {
      if (stepOneInvalid) {
        scrollToFirstError();
        return;
      }
      moveTo(2);
      return;
    }
    if (step === 2) {
      if (stepTwoInvalid) {
        scrollToFirstError();
        return;
      }
      moveTo(3);
      return;
    }
    if (step === 3) {
      if (stepThreeInvalid) {
        scrollToFirstError();
        return;
      }
      moveTo(4);
      return;
    }
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
        isAdditionalPlan={isAdditionalPlan}
        plan={plan}
        planHref={planHref}
        project={project}
      />

      {isAdditionalPlan && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs pb-1">
            <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-700" />
              {(parentPlan || plan).status === "Approved" ||
              (parentPlan || plan).status === "Finally Approved"
                ? "Approved Parent Plan:"
                : "Parent Procurement Plan:"}
            </span>
            <span className="rounded bg-emerald-200/80 px-2.5 py-0.5 font-bold text-emerald-900 text-[10px]">
              {(parentPlan || plan).status || "Submitted"}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {(parentPlan || plan).name}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1.5 border-t border-emerald-100/80 mt-2">
            <span>
              Project:{" "}
              <strong className="text-slate-800">{project.code}</strong>
            </span>
            <span>•</span>
            <span>
              Category:{" "}
              <strong className="text-slate-800">
                {(parentPlan || plan).category}
              </strong>
            </span>
            <span>•</span>
            <span>
              Fiscal Year:{" "}
              <strong className="text-slate-800">
                {(parentPlan || plan).budgetYear}
              </strong>
            </span>
            <span>•</span>
            <span>
              Reference:{" "}
              <strong className="font-mono text-slate-800">
                {(parentPlan || plan).reference}
              </strong>
            </span>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A3C2F] text-white shadow-2xs">
              <Edit3 className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-slate-900">
                  Editing Activity:
                </p>
                <span className="font-mono text-xs font-semibold text-[#0A3C2F] bg-white px-2 py-0.5 rounded border border-emerald-300">
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#006837] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#00552c] transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      <header className="mt-3 rounded-lg border border-slate-300 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-[#16243a]">
            {isAdditionalPlan
              ? "Create Additional Procurement Plan & Activity"
              : isEditing
                ? "Edit Procurement Activity"
                : "Add Procurement Activity"}
          </h1>
          {isAdditionalPlan && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-300">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              Supplementary Submission
            </span>
          )}
          {isEditing && (
            <span className="font-mono text-xs font-semibold text-[#0A3C2F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activityReference}
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          {isAdditionalPlan
            ? "Submit an additional procurement activity for this approved plan along with mandatory justification."
            : `Step ${step}: ${stepDescriptions[step]}`}
        </p>
        <WizardProgress
          currentStep={step}
          isEditing={isEditing}
          onStepClick={handleStepClick}
        />
      </header>

      {saved ? (
        <SavedPanel
          activityReference={activityReference}
          isAdditionalPlan={isAdditionalPlan}
          planHref={planHref}
        />
      ) : (
        <>
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <main className="min-w-0">
              {step === 1 ? (
                <KeyDetailsStep
                  additionalPlanReason={additionalPlanReason}
                  attempted={attemptedSteps[1]}
                  category={activityCategory}
                  form={form}
                  isAdditionalPlan={isAdditionalPlan}
                  methodOptions={methodOptions}
                  onAdditionalPlanReasonChange={setAdditionalPlanReason}
                  onCategoryChange={(newCat) => {
                    setActivityCategory(newCat);
                    const available = methodsForCategory(newCat);
                    if (!available.some((m) => m.key === form.method)) {
                      selectMethod("");
                    }
                  }}
                  onChange={updateField}
                  onMethodChange={selectMethod}
                  parentPlan={parentPlan || plan}
                  project={project}
                  usesCompetition={usesCompetition}
                />
              ) : null}
              {step === 2 ? (
                <RelatedInformationStep
                  additionalReferences={additionalReferences}
                  attempted={attemptedSteps[2]}
                  context={context}
                  currencyOptions={currencyOptions}
                  financingAllocations={financingAllocations}
                  form={form}
                  lots={lots}
                  onAddAdditionalReference={addAdditionalReference}
                  onChange={updateField}
                  onFinancingChange={setFinancingAllocations}
                  onLotsChange={setLots}
                  onRemoveAdditionalReference={removeAdditionalReference}
                  onUpdateAdditionalReference={updateAdditionalReference}
                />
              ) : null}
              {step === 3 ? (
                <AdditionalDetailsStep
                  attempted={attemptedSteps[3]}
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
                  attempted={attemptedSteps[4]}
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
              onStepClick={handleStepClick}
            />
          </div>

          <WizardFooter
            isAdditionalPlan={isAdditionalPlan}
            isEditing={isEditing}
            isSaving={isSaving}
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

export function getProjectFundingSources(project: {
  fundingSource?: string;
  fundingSources?: readonly string[];
}): string[] {
  const list: string[] = [];
  if (Array.isArray(project.fundingSources)) {
    for (const s of project.fundingSources) {
      if (typeof s === "string" && s.trim()) {
        list.push(s.trim());
      }
    }
  }
  if (list.length === 0 && project.fundingSource) {
    const parts = project.fundingSource
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    list.push(...parts);
  }
  const unique = Array.from(new Set(list));
  return unique.length > 0
    ? unique
    : [project.fundingSource?.trim() || "Project Funding"];
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
        d?.classificationCode ||
        anyAct.classificationCode ||
        anyAct.procurementClassificationCode ||
        "",
      comments: d?.comments || anyAct.comments || anyAct.remarks || "",
      contractType: d?.contractType || anyAct.contractType || "Lump Sum",
      currency:
        d?.currency ||
        initialActivity.currency ||
        anyAct.currency ||
        plan.currency ||
        project.baseCurrency ||
        "ETB",
      exchangeRate:
        d?.exchangeRate ||
        (anyAct.exchangeRate !== undefined
          ? String(anyAct.exchangeRate)
          : "") ||
        "",
      domesticPreference:
        d?.domesticPreference === "Yes" ||
        d?.domesticPreference === "true" ||
        (d?.domesticPreference as any) === true ||
        (anyAct.domesticPreference as any) === true ||
        anyAct.domesticPreference === "Yes" ||
        anyAct.domesticPreference === "true"
          ? "Yes"
          : d?.domesticPreference === "No" ||
              d?.domesticPreference === "false" ||
              (d?.domesticPreference as any) === false ||
              (anyAct.domesticPreference as any) === false ||
              anyAct.domesticPreference === "No" ||
              anyAct.domesticPreference === "false"
            ? "No"
            : d?.domesticPreference || anyAct.domesticPreference || "No",
      estimatedAmount: String(
        initialActivity.estimatedAmount ??
          d?.estimatedAmount ??
          anyAct.estimatedBudget ??
          "",
      ),
      evaluationOptionCode:
        d?.evaluationOptionCode ||
        anyAct.evaluationOptionCode ||
        (Array.isArray(anyAct.evaluationOptions)
          ? anyAct.evaluationOptions[0]
          : "") ||
        "",
      fundingSource:
        d?.fundingSource ||
        initialActivity.fundingSource ||
        anyAct.fundingSource ||
        anyAct.fundings?.[0]?.fundingSource ||
        getProjectFundingSources(project)[0] ||
        project.fundingSource ||
        "",
      highRiskCode:
        d?.highRiskCode ||
        anyAct.highRiskCode ||
        (anyAct.highSeaShRisk ? "High" : ""),
      inProcess:
        initialActivity.status === "In Progress" ||
        Boolean(d?.inProcess) ||
        anyAct.status === "IN_PROGRESS",
      invitationReference:
        d?.invitationReference ||
        anyAct.invitationReference ||
        anyAct.bidReferenceNo ||
        "",
      latitude:
        d?.latitude ||
        (anyAct.latitude !== undefined && anyAct.latitude !== null
          ? String(anyAct.latitude)
          : ""),
      location:
        d?.location ||
        anyAct.location ||
        plan.organizationRegion ||
        project.organizationRegion ||
        "",
      longitude:
        d?.longitude ||
        (anyAct.longitude !== undefined && anyAct.longitude !== null
          ? String(anyAct.longitude)
          : ""),
      lotRequired: Boolean(
        d?.lotRequired ||
        anyAct.lotRequired ||
        (initialActivity.details?.lots &&
          initialActivity.details.lots.length > 0) ||
        (anyAct.lots && anyAct.lots.length > 0),
      ),
      marketApproach:
        d?.marketApproach || anyAct.marketApproach || "Open - National",
      method: resolvedMethod,
      oversightClassification:
        d?.oversightClassification || anyAct.oversightClassification || "",
      pricingBasis:
        category === "Works"
          ? d?.pricingBasis === "BOQ" || anyAct.pricingBasis === "BOQ"
            ? "Bill of Quantities (BOQ)"
            : d?.pricingBasis === "LUMP_SUM" ||
                anyAct.pricingBasis === "LUMP_SUM"
              ? "Lump Sum"
              : d?.pricingBasis || anyAct.pricingBasis || ""
          : "Not Applicable",
      procurementDocumentType:
        d?.procurementDocumentType || anyAct.procurementDocumentType || "",
      procurementProcess:
        d?.procurementProcess ||
        anyAct.procurementProcess ||
        "Single Stage One Envelope",
      qualificationApproach:
        d?.qualificationApproach || anyAct.qualificationApproach || "",
      requiresUnAgency: Boolean(
        d?.requiresUnAgency ||
        anyAct.requiresUnAgency ||
        anyAct.requiresUnAgencyContracting ||
        resolvedMethod === "un-agency",
      ),
      reviewType:
        d?.reviewType?.toLowerCase().includes("prior") ||
        anyAct.reviewType?.toLowerCase().includes("prior")
          ? "Prior Review"
          : d?.reviewType?.toLowerCase().includes("post") ||
              anyAct.reviewType?.toLowerCase().includes("post")
            ? "Post Review"
            : d?.reviewType || anyAct.reviewType || "Post Review",
      scopeNotes: d?.scopeNotes || anyAct.scopeNotes || "",
      specificMethod: d?.specificMethod || anyAct.specificMethod || "",
      subcomponent:
        d?.subcomponent ||
        anyAct.subcomponent ||
        anyAct.components?.[0]?.subcomponent ||
        "",
      hasMultiFunding: Boolean(
        d?.hasMultiFunding ||
        (d?.fundingContributions && d.fundingContributions.length > 1) ||
        (initialActivity.details?.fundingContributions &&
          initialActivity.details.fundingContributions.length > 1) ||
        (initialActivity.fundingContributions &&
          initialActivity.fundingContributions.length > 1),
      ),
      fundingContributions: (() => {
        const raw =
          d?.fundingContributions ||
          initialActivity.details?.fundingContributions ||
          initialActivity.fundingContributions;
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((c) => ({
            id: c.id || `contrib-${Math.random().toString(36).slice(2, 7)}`,
            fundingSource: c.fundingSource || "",
            amount: String(c.amount ?? ""),
            currency: c.currency || "ETB",
            exchangeRate:
              c.exchangeRate !== undefined ? String(c.exchangeRate) : "",
          }));
        }
        return [];
      })(),
    };
  }

  return {
    activityDescription: "",
    classificationCode: "",
    comments: "",
    contractType: "",
    currency: "",
    exchangeRate: "",
    domesticPreference: "",
    estimatedAmount: "",
    evaluationOptionCode: "",
    fundingSource:
      getProjectFundingSources(project)[0] || project.fundingSource || "",
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
    hasMultiFunding: false,
    fundingContributions: [],
  };
}

function normalizeRoadmapStageName(
  rawName: string | undefined,
  isConsultancy?: boolean,
): string {
  const name = String(rawName || "").trim();
  const lower = name.toLowerCase();
  if (
    lower === "invitation to supplier / contractor" ||
    lower === "invitation to providers" ||
    lower === "invitation to bidders" ||
    lower === "invitation to consultant" ||
    lower === "invitation to identified / selected consultant"
  ) {
    return isConsultancy ? "Invitation to Consultant" : "Invitation to Bidders";
  }
  if (lower === "bid submission / opening / minutes") {
    return "Bid Submission / Opening / Dates";
  }
  if (lower === "opening of technical proposals / minutes") {
    return "Opening of Technical Proposals / Dates";
  }
  if (lower === "opening of financial proposals / minutes") {
    return "Opening of Financial Proposals / Dates";
  }
  return name;
}

function extractInitialRoadmap(
  initialActivity: ProcurementActivitySummary | undefined,
  methodKey: string,
  category?: string,
): RoadmapStage[] {
  const isConsultancy =
    category === "Consultancy Services" ||
    category === "Consultancy" ||
    category === "Consulting Services";
  if (initialActivity?.details?.roadmap?.length) {
    return initialActivity.details.roadmap.map((st: any) => ({
      name: normalizeRoadmapStageName(st.name || st.stageName, isConsultancy),
      days: String(st.days || "14"),
      ethiopianDate: st.ethiopianDate || "",
      gregorianDate: st.gregorianDate || st.plannedStartDate || "",
      notApplicable: Boolean(st.notApplicable || st.isNotApplicable),
      allowNotApplicable: Boolean(
        st.allowNotApplicable !== undefined ? st.allowNotApplicable : true,
      ),
      remarks: st.remarks || "",
      status: st.status || "Not Started",
    }));
  }
  const anyAct = initialActivity as any;
  if (anyAct?.roadmap?.length) {
    return anyAct.roadmap.map((st: any) => ({
      name: normalizeRoadmapStageName(st.name || st.stageName, isConsultancy),
      days: String(st.days || "14"),
      ethiopianDate: st.ethiopianDate || "",
      gregorianDate: st.gregorianDate || st.plannedStartDate || "",
      notApplicable: Boolean(st.notApplicable || st.isNotApplicable),
      allowNotApplicable: Boolean(
        st.allowNotApplicable !== undefined ? st.allowNotApplicable : true,
      ),
      remarks: st.remarks || "",
      status: st.status || "Not Started",
    }));
  }
  if (anyAct?.stages?.length) {
    return anyAct.stages.map((st: any) => {
      const greg = st.plannedStartDate
        ? new Date(st.plannedStartDate).toISOString().slice(0, 10)
        : "";
      return {
        name: normalizeRoadmapStageName(
          st.stageType?.label || st.name,
          isConsultancy,
        ),
        days: String(st.plannedDays || "14"),
        ethiopianDate: st.ethiopianDate || "",
        gregorianDate: greg,
        notApplicable: Boolean(st.isNotApplicable || st.notApplicable),
        allowNotApplicable: true,
        remarks: st.remarks || "",
        status: st.status || "Not Started",
      };
    });
  }
  if (methodKey) {
    return roadmapForMethod(methodKey, category).map((stage) => ({
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
      number: String(lot.lotNumber ?? lot.number ?? index + 1),
      description: lot.description || "",
      amount: String(lot.estimatedAmount ?? lot.amount ?? ""),
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
      id:
        f.id ||
        f.loanGrantNumber ||
        f.loanNumber ||
        f.source ||
        f.fundingSource ||
        "fs-1",
      percent: String(f.percent ?? f.share ?? f.allocationPct ?? "100"),
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
      id: c.id || c.name || c.component || "comp-1",
      percent: String(c.percent ?? c.share ?? c.allocationPct ?? "100"),
      selected: c.selected !== undefined ? Boolean(c.selected) : true,
    }));
  }
  if (project.components?.length) {
    return createAllocations(project.components);
  }
  return [{ id: "Component 1", percent: "100", selected: true }];
}

function extractInitialAdditionalReferences(
  initialActivity?: ProcurementActivitySummary | null,
): AdditionalReference[] {
  if (!initialActivity) return [];
  const anyAct = initialActivity as any;
  const d = initialActivity.details as any;
  const fromDetails =
    d?.additionalReferences ||
    d?.form?.additionalReferences ||
    anyAct?.additionalReferences;
  if (Array.isArray(fromDetails) && fromDetails.length > 0) {
    return fromDetails.map((r: any, idx: number) => ({
      id: String(r.id || idx + 1),
      type: r.type || "STEP Reference",
      value: r.value || "",
    }));
  }
  const legacyStep =
    d?.form?.stepReference || anyAct.stepReference || anyAct.bidReferenceNo;
  if (legacyStep && typeof legacyStep === "string" && legacyStep.trim()) {
    return [
      {
        id: "1",
        type: "STEP Reference",
        value: legacyStep.trim(),
      },
    ];
  }
  return [];
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
  isAdditionalPlan = false,
  plan,
  planHref,
  project,
}: {
  initialActivity?: ProcurementActivitySummary;
  isAdditionalPlan?: boolean;
  plan: ProcurementPlanSummary;
  planHref: string;
  project: OfficerProject;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link className="hover:text-[#0A3C2F]" href="/dashboard/officer">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="hover:text-[#0A3C2F]" href="/workspace/projects">
            Projects
          </Link>
        </li>
        <li>/</li>
        <li>
          <Link
            className="hover:text-[#0A3C2F]"
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
            className="max-w-52 truncate hover:text-[#0A3C2F]"
            href={planHref}
          >
            {plan.name}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-slate-800">
          {isAdditionalPlan
            ? "Create Additional Plan & Activity"
            : initialActivity
              ? "Edit Activity"
              : "Add Activity"}
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
                  (complete ? "bg-[#0A3C2F]" : "bg-slate-300")
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
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all " +
                (canClick
                  ? "cursor-pointer hover:scale-110 "
                  : "cursor-default ") +
                (complete
                  ? "border-[#0A3C2F] bg-[#0A3C2F] text-white hover:bg-[#00552c]"
                  : current
                    ? "border-2 border-[#0A3C2F] bg-white text-[#0A3C2F] shadow-xs"
                    : isEditing
                      ? "border-slate-300 bg-white text-slate-700 hover:border-[#0A3C2F] hover:text-[#0A3C2F]"
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
                  ? "cursor-pointer hover:text-[#0A3C2F] "
                  : "cursor-default ") +
                (current
                  ? "text-[#0A3C2F] font-semibold"
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
      <h2 className="border-b border-slate-300 bg-[#dfe8fb] px-3 py-2.5 text-[10px] font-semibold text-slate-800">
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
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A3C2F]"
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
      <h3 className="flex items-center gap-2 border-b border-[#ccd6e8] pb-2 text-[10px] font-semibold text-[#0A3C2F]">
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
        <span className="mt-0.5 text-[#0A3C2F]">{icon}</span>
        <div>
          <h2 className="text-[11px] font-semibold text-[#16243a]">{title}</h2>
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
  action,
  children,
  error,
  hint,
  label,
  required = false,
}: {
  action?: ReactNode;
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="block min-w-0" data-field-has-error={Boolean(error)}>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          className={
            "block text-xs " +
            (error ? "font-bold text-red-700" : "font-semibold text-slate-700")
          }
        >
          {label}
          {required ? (
            <span
              className={
                error ? "ml-1 font-bold text-red-600" : "ml-1 text-red-600"
              }
            >
              *
            </span>
          ) : null}
        </label>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
      {error ? (
        <span
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-red-600"
          />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-4 text-slate-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function SelectControl({
  children,
  hasError,
  onChange,
  value,
}: {
  children: ReactNode;
  hasError?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <span className="relative block">
      <select
        aria-invalid={hasError ? "true" : undefined}
        className={
          inputClasses +
          " appearance-none pr-9" +
          (hasError
            ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
            : "")
        }
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={
          "pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 " +
          (hasError ? "text-red-500" : "text-slate-500")
        }
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
              "flex h-full min-w-0 items-center justify-center border-r border-slate-200 px-3 text-xs font-semibold transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0A3C2F] " +
              (value === option
                ? "bg-[#0A3C2F] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-[#f6f7fb] hover:text-[#0A3C2F]")
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
  isAdditionalPlan = false,
  isEditing = false,
  isSaving = false,
  onBack,
  onContinue,
  onSave,
  planHref,
  step,
}: {
  isAdditionalPlan?: boolean;
  isEditing?: boolean;
  isSaving?: boolean;
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
          className="inline-flex h-10 items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0A3C2F]"
          href={planHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Cancel / Back to plan
        </Link>
      ) : (
        <button
          className="inline-flex h-10 items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0A3C2F] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#006837] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#00552c] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        )}

        <button
          className={
            "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed " +
            (step === 4
              ? isAdditionalPlan
                ? "bg-[#0A3C2F] text-white hover:bg-[#072F25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F]"
                : "bg-[#006837] text-white hover:bg-[#00552c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F]"
              : isEditing
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F]"
                : "bg-[#006837] text-white hover:bg-[#00552c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F]")
          }
          disabled={isSaving}
          onClick={step === 4 ? onSave : onContinue}
          type="button"
        >
          {step === 4 ? (
            <>
              {isSaving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : isAdditionalPlan ? (
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save Activity Changes"
                  : isAdditionalPlan
                    ? "Submit Additional Plan to Director"
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
  isAdditionalPlan = false,
  planHref,
}: {
  activityReference: string;
  isAdditionalPlan?: boolean;
  planHref: string;
}) {
  return (
    <section className="mt-5 rounded-lg border border-emerald-200 bg-white p-8 text-center shadow-sm">
      <CheckCircle2
        aria-hidden="true"
        className="mx-auto h-10 w-10 text-[#0A3C2F]"
      />
      <h2 className="mt-3 text-lg font-semibold text-[#10243f]">
        {isAdditionalPlan
          ? "Additional Procurement Plan & Activity Submitted"
          : "Procurement activity saved"}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-600">
        {isAdditionalPlan
          ? `Supplementary submission for Activity ${activityReference} has been created and submitted to the Director for review and committee endorsement.`
          : `Activity ${activityReference} has been prepared with its method-specific roadmap and is ready for the next workflow action.`}
      </p>
      <Link
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#006837] px-5 text-xs font-semibold text-white hover:bg-[#00552c]"
        href={planHref}
      >
        Return to procurement plan
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

function KeyDetailsStep({
  additionalPlanReason,
  attempted,
  category,
  form,
  isAdditionalPlan = false,
  methodOptions,
  onAdditionalPlanReasonChange,
  onCategoryChange,
  onChange,
  onMethodChange,
  parentPlan,
  project,
  usesCompetition,
}: {
  additionalPlanReason?: string;
  attempted: boolean;
  category: ProcurementActivityCategory;
  form: ActivityFormState;
  isAdditionalPlan?: boolean;
  methodOptions: ReturnType<typeof methodsForCategory>;
  onAdditionalPlanReasonChange?: (reason: string) => void;
  onCategoryChange?: (category: ProcurementActivityCategory) => void;
  onChange: UpdateActivityField;
  onMethodChange: (value: string) => void;
  parentPlan?: ProcurementPlanSummary;
  project: OfficerProject;
  usesCompetition: boolean;
}) {
  const selectedMethod =
    procurementMethodOptions.find((method) => method.key === form.method) ||
    resolveProcurementMethodOption(form.method);
  const usesRfb =
    form.method === "rfb" ||
    form.method === "rfb-international" ||
    form.method === "rfb-national";
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

  const justificationHasError = Boolean(
    isAdditionalPlan &&
    attempted &&
    (!additionalPlanReason || additionalPlanReason.trim().length < 10),
  );

  return (
    <div className="space-y-4">
      {/* Mandatory Justification Card for Supplementary Submission */}
      {isAdditionalPlan && (
        <section className="rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/50 via-teal-50/20 to-white p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="additional-plan-justification"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-900"
            >
              <FileText className="h-4 w-4 text-[#0A3C2F]" />
              <span>
                Justification: Why was this activity not submitted with the
                original plan / batch?{" "}
              </span>
              <span className="text-rose-600">*</span>
            </label>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0A3C2F] bg-emerald-50/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Visible to Director &amp; Committee
            </span>
          </div>
          <textarea
            id="additional-plan-justification"
            required
            rows={3}
            value={additionalPlanReason || ""}
            onChange={(e) => onAdditionalPlanReasonChange?.(e.target.value)}
            placeholder="Explain the operational necessity or reason why this item was not included in the original collection of plans submitted to the Director (e.g. newly allocated contingency funds, urgent institutional expansion, unforeseen project requirements)..."
            className={
              "w-full rounded-lg border bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15 outline-none transition " +
              (justificationHasError
                ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-500"
                : "border-slate-300 hover:border-slate-400")
            }
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <p>
              This explanation will be prominently displayed on the Director and
              Endorsement Committee review boards.
            </p>
            <span
              className={
                (additionalPlanReason?.trim().length || 0) < 10
                  ? "text-slate-500 font-medium"
                  : "text-[#0A3C2F] font-bold"
              }
            >
              {additionalPlanReason?.trim().length || 0} chars (min 10)
            </span>
          </div>
          {justificationHasError && (
            <div
              role="alert"
              className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-700 animate-in fade-in"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span>
                Please provide a thorough justification (at least 10 characters)
                explaining why this activity was not included with the original
                procurement plan.
              </span>
            </div>
          )}
        </section>
      )}

      <FormSection
        description="The category stays within the procurement plan. Method-dependent controls appear after a method is selected."
        icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
        title="Procurement Method & Controls"
      >
        {attempted &&
        (!form.method ||
          (usesCompetition && !form.marketApproach) ||
          (usesRfb && !form.qualificationApproach) ||
          (preferenceApplies && !form.domesticPreference) ||
          (usesRfb && !form.procurementProcess) ||
          (consultancy && Boolean(form.method) && !form.contractType)) ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            role="alert"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
            />
            <span>
              Please complete the required procurement controls highlighted
              below before continuing.
            </span>
          </div>
        ) : null}

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
            <SelectControl
              hasError={attempted && !form.method}
              onChange={onMethodChange}
              value={form.method}
            >
              <option value="">Select method</option>
              {methodOptions.map((method) => (
                <option key={method.key} value={method.key}>
                  {method.label}
                </option>
              ))}
              {form.method &&
              !methodOptions.some((m) => m.key === form.method) &&
              selectedMethod ? (
                <option key={selectedMethod.key} value={selectedMethod.key}>
                  {selectedMethod.label}
                </option>
              ) : null}
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
            <Field
              error={
                attempted && !form.marketApproach
                  ? "Select a market approach."
                  : undefined
              }
              label="Market Approach"
              required
            >
              <SelectControl
                hasError={attempted && !form.marketApproach}
                onChange={(value) => onChange("marketApproach", value)}
                value={form.marketApproach}
              >
                <option value="">Select approach</option>
                <option value="Open - International">
                  Open - International
                </option>
                <option value="Open - National">Open - National</option>
                <option value="Limited">Limited</option>
                <option value="Direct">Direct</option>
                {form.method === "rfq-shopping" || form.method === "rfq" ? (
                  <option value="Shopping">Shopping</option>
                ) : null}
                {form.marketApproach &&
                ![
                  "Open - International",
                  "Open - National",
                  "Limited",
                  "Direct",
                  "Shopping",
                ].includes(form.marketApproach) ? (
                  <option value={form.marketApproach}>
                    {form.marketApproach}
                  </option>
                ) : null}
              </SelectControl>
            </Field>
          ) : null}

          {usesRfb ? (
            <Field
              error={
                attempted && !form.qualificationApproach
                  ? "Select a qualification approach."
                  : undefined
              }
              label="Qualification Approach"
              required
            >
              <SelectControl
                hasError={attempted && !form.qualificationApproach}
                onChange={(value) => onChange("qualificationApproach", value)}
                value={form.qualificationApproach}
              >
                <option value="">Select qualification</option>
                <option>Prequalification</option>
                <option>Post-qualification</option>
              </SelectControl>
            </Field>
          ) : null}

          {preferenceApplies ? (
            <Field
              error={
                attempted && !form.domesticPreference
                  ? "Select domestic/regional preference."
                  : undefined
              }
              label="Domestic / Regional Preference"
              required
            >
              <SelectControl
                hasError={attempted && !form.domesticPreference}
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
                value={
                  form.reviewType.toLowerCase().includes("prior")
                    ? "Prior Review"
                    : form.reviewType.toLowerCase().includes("post")
                      ? "Post Review"
                      : form.reviewType
                }
              >
                <option value="">Select review type</option>
                <option value="Prior Review">Prior Review</option>
                <option value="Post Review">Post Review</option>
                {form.reviewType &&
                !["Prior Review", "Post Review"].includes(form.reviewType) ? (
                  <option value={form.reviewType}>{form.reviewType}</option>
                ) : null}
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
            <Field
              error={
                attempted && !form.procurementProcess
                  ? "Select a procurement process."
                  : undefined
              }
              label="Procurement Process"
              required
            >
              <SelectControl
                hasError={attempted && !form.procurementProcess}
                onChange={(value) => onChange("procurementProcess", value)}
                value={form.procurementProcess}
              >
                <option value="">Select configured process</option>
                <option>Single Stage One Envelope</option>
                <option>Single Stage - One Envelope</option>
                <option>1 Envelope (Single Stage 1 Env)</option>
                <option>Two Stage Two Envelope</option>
                {form.procurementProcess &&
                ![
                  "Single Stage One Envelope",
                  "Single Stage - One Envelope",
                  "1 Envelope (Single Stage 1 Env)",
                  "Two Stage Two Envelope",
                ].includes(form.procurementProcess) ? (
                  <option value={form.procurementProcess}>
                    {form.procurementProcess}
                  </option>
                ) : null}
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
                {form.procurementDocumentType &&
                !documentTypes.includes(form.procurementDocumentType) ? (
                  <option value={form.procurementDocumentType}>
                    {form.procurementDocumentType}
                  </option>
                ) : null}
              </SelectControl>
            </Field>
          ) : null}

          {consultancy && form.method ? (
            <Field
              error={
                attempted && !form.contractType
                  ? "Select a contract type."
                  : undefined
              }
              label="Contract Type"
              required
            >
              <SelectControl
                hasError={attempted && !form.contractType}
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
          ) : null}
        </div>

        {form.method ? (
          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <YesNoChoice
              label="Requires UN Agency Contracting"
              onChange={(value) => onChange("requiresUnAgency", value)}
              value={form.requiresUnAgency}
            />
            <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-slate-300 bg-[#fbfcfd] px-3">
              <input
                checked={form.inProcess}
                className="h-4 w-4 accent-[#0A3C2F]"
                onChange={(event) =>
                  onChange("inProcess", event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="block text-[10px] font-semibold text-slate-700">
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
          <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] leading-4 text-[#0A3C2F]">
            <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The {selectedMethod.label} roadmap template will be generated in
            Step 4.
          </div>
        ) : null}
      </FormSection>
    </div>
  );
}

export function RelatedInformationStep({
  additionalReferences,
  attempted,
  context,
  currencyOptions,
  financingAllocations,
  form,
  lots,
  onAddAdditionalReference,
  onChange,
  onFinancingChange,
  onLotsChange,
  onRemoveAdditionalReference,
  onUpdateAdditionalReference,
}: {
  additionalReferences: AdditionalReference[];
  attempted: boolean;
  context: {
    activityReference: string;
    category: ProcurementActivityCategory;
    plan: ProcurementPlanSummary;
    project: OfficerProject;
  };
  currencyOptions: { code: string; label: string }[];
  financingAllocations: Allocation[];
  form: ActivityFormState;
  lots: LotEntry[];
  onAddAdditionalReference: () => void;
  onChange: UpdateActivityField;
  onFinancingChange: (value: Allocation[]) => void;
  onLotsChange: (value: LotEntry[]) => void;
  onRemoveAdditionalReference: (id: string) => void;
  onUpdateAdditionalReference: (
    id: string,
    field: "type" | "value",
    value: string,
  ) => void;
}) {
  const { activityReference, category, project } = context;

  const inheritedFundingSources = useMemo(() => {
    const fromProject = getProjectFundingSources(project);
    if (form.fundingSource && !fromProject.includes(form.fundingSource)) {
      return [...fromProject, form.fundingSource];
    }
    return fromProject;
  }, [project, form.fundingSource]);

  useEffect(() => {
    if (!form.fundingSource && inheritedFundingSources.length > 0) {
      onChange("fundingSource", inheritedFundingSources[0]);
    }
  }, [form.fundingSource, inheritedFundingSources, onChange]);

  const [showAddCurrencyModal, setShowAddCurrencyModal] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [isSubmittingCurrency, setIsSubmittingCurrency] = useState(false);
  const [customSourceRows, setCustomSourceRows] = useState<
    Record<string, boolean>
  >({});
  const [activeCurrencyContribId, setActiveCurrencyContribId] = useState<
    string | null
  >(null);

  const contributions: FundingContribution[] = useMemo(() => {
    if (form.fundingContributions && form.fundingContributions.length > 0) {
      return form.fundingContributions;
    }
    return [
      {
        id: "contrib-1",
        fundingSource: form.fundingSource || inheritedFundingSources[0] || "",
        amount: form.estimatedAmount || "",
        currency: form.currency || "ETB",
        exchangeRate: form.exchangeRate || "",
      },
    ];
  }, [
    form.fundingContributions,
    form.fundingSource,
    form.estimatedAmount,
    form.currency,
    form.exchangeRate,
    inheritedFundingSources,
  ]);

  const totalComputed = useMemo(() => {
    const target = (form.currency || "ETB").trim().toUpperCase();
    return contributions.reduce((sum, item) => {
      const amt = Number(item.amount) || 0;
      const cur = (item.currency || target).trim().toUpperCase();
      const isSame = cur === target;
      const rateNum = Number(item.exchangeRate);
      const effectiveRate = isSame ? 1 : rateNum > 0 ? rateNum : 1;
      return sum + amt * effectiveRate;
    }, 0);
  }, [contributions, form.currency]);

  const multiFundingInvalid = useMemo(() => {
    return Boolean(
      form.hasMultiFunding &&
      (!form.fundingContributions ||
        form.fundingContributions.length === 0 ||
        form.fundingContributions.some(
          (c) =>
            !c.fundingSource.trim() ||
            !c.currency.trim() ||
            !(Number(c.amount) > 0),
        )),
    );
  }, [form.hasMultiFunding, form.fundingContributions]);

  function recalculateMultiFunding(
    items: FundingContribution[],
    targetCurrency: string,
  ) {
    const target = (targetCurrency || "ETB").trim().toUpperCase();
    let total = 0;
    for (const item of items) {
      const amt = Number(item.amount) || 0;
      const cur = (item.currency || target).trim().toUpperCase();
      const isSame = cur === target;
      const rateNum = Number(item.exchangeRate);
      const effectiveRate = isSame ? 1 : rateNum > 0 ? rateNum : 1;
      total += amt * effectiveRate;
    }

    const roundedTotal =
      total > 0
        ? (Math.round(total * 100) / 100).toString()
        : total === 0 && items.some((i) => i.amount.trim() === "0")
          ? "0"
          : "";
    onChange("estimatedAmount", roundedTotal);

    const sources = Array.from(
      new Set(items.map((i) => i.fundingSource.trim()).filter(Boolean)),
    );
    if (sources.length > 0) {
      onChange("fundingSource", sources.join(" / "));
    }
  }

  function handleToggleMultiFunding(enable: boolean) {
    if (enable) {
      const existing = form.fundingContributions || [];
      const currentSources = inheritedFundingSources;
      let nextList = existing;
      if (nextList.length === 0) {
        nextList = [
          {
            id: `contrib-${Date.now()}-1`,
            fundingSource: form.fundingSource || currentSources[0] || "",
            amount: form.estimatedAmount || "",
            currency: form.currency || "ETB",
            exchangeRate: form.exchangeRate || "",
          },
        ];
      }
      onChange("hasMultiFunding", true);
      onChange("fundingContributions", nextList);
      recalculateMultiFunding(nextList, form.currency || "ETB");
    } else {
      onChange("hasMultiFunding", false);
    }
  }

  function handleUpdateContribution(
    id: string,
    field: keyof FundingContribution,
    val: string,
  ) {
    const currentList =
      form.fundingContributions && form.fundingContributions.length > 0
        ? form.fundingContributions
        : contributions;

    const nextList = currentList.map((item) => {
      if (item.id !== id) return item;
      return { ...item, [field]: val };
    });

    onChange("fundingContributions", nextList);
    recalculateMultiFunding(nextList, form.currency || "ETB");
  }

  function handleAddContribution() {
    const currentList =
      form.fundingContributions && form.fundingContributions.length > 0
        ? form.fundingContributions
        : contributions;

    const usedSources = new Set(currentList.map((c) => c.fundingSource));
    const nextDefaultSource =
      inheritedFundingSources.find((s) => !usedSources.has(s)) ||
      inheritedFundingSources[0] ||
      "";

    const newItem: FundingContribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fundingSource: nextDefaultSource,
      amount: "",
      currency: form.currency || "ETB",
      exchangeRate: "",
    };

    const nextList = [...currentList, newItem];
    onChange("fundingContributions", nextList);
    recalculateMultiFunding(nextList, form.currency || "ETB");
  }

  function handleRemoveContribution(id: string) {
    const currentList =
      form.fundingContributions && form.fundingContributions.length > 0
        ? form.fundingContributions
        : contributions;

    if (currentList.length <= 1) return;
    const nextList = currentList.filter((c) => c.id !== id);
    onChange("fundingContributions", nextList);
    recalculateMultiFunding(nextList, form.currency || "ETB");
  }

  function handleTargetCurrencyChange(newTarget: string) {
    onChange("currency", newTarget);
    if (form.hasMultiFunding) {
      const currentList =
        form.fundingContributions && form.fundingContributions.length > 0
          ? form.fundingContributions
          : contributions;
      recalculateMultiFunding(currentList, newTarget);
    }
  }

  async function handleAddCurrencySubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = newCurrencyCode.trim().toUpperCase();
    const cleanName = newCurrencyName.trim();

    if (!cleanCode) {
      setCurrencyError("Please provide a currency code (e.g. GBP, CAD, JPY).");
      return;
    }

    if (
      currencyOptions.some(
        (c) =>
          c.code.trim().toUpperCase() === cleanCode ||
          (cleanName &&
            c.label.toLowerCase() ===
              `${cleanCode} (${cleanName})`.toLowerCase()),
      )
    ) {
      if (activeCurrencyContribId) {
        handleUpdateContribution(
          activeCurrencyContribId,
          "currency",
          cleanCode,
        );
        setActiveCurrencyContribId(null);
      } else {
        handleTargetCurrencyChange(cleanCode);
      }
      setShowAddCurrencyModal(false);
      setNewCurrencyCode("");
      setNewCurrencyName("");
      setCurrencyError(null);
      return;
    }

    setIsSubmittingCurrency(true);
    setCurrencyError(null);

    const displayLabel = cleanName ? `${cleanCode} (${cleanName})` : cleanCode;

    try {
      const created = await createLookup({
        type: "CURRENCY",
        code: cleanCode,
        label: displayLabel,
      });

      if (activeCurrencyContribId) {
        handleUpdateContribution(
          activeCurrencyContribId,
          "currency",
          created.code,
        );
        setActiveCurrencyContribId(null);
      } else {
        handleTargetCurrencyChange(created.code);
      }
      setNewCurrencyCode("");
      setNewCurrencyName("");
      setShowAddCurrencyModal(false);
    } catch (err: any) {
      setCurrencyError(err?.message || "Failed to add currency.");
    } finally {
      setIsSubmittingCurrency(false);
    }
  }

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
        {attempted &&
        (!form.activityDescription.trim() ||
          !(Number(form.estimatedAmount) > 0) ||
          !form.currency ||
          !form.fundingSource ||
          (category === "Works" && !form.pricingBasis) ||
          (form.hasMultiFunding &&
            (!form.fundingContributions ||
              form.fundingContributions.length === 0 ||
              form.fundingContributions.some(
                (c) =>
                  !c.fundingSource.trim() ||
                  !c.currency.trim() ||
                  !(Number(c.amount) > 0),
              ))) ||
          (form.lotRequired &&
            lots.some(
              (lot) =>
                !lot.number.trim() ||
                !lot.description.trim() ||
                !lot.amount.trim() ||
                !(Number(lot.amount) >= 0),
            ))) ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            role="alert"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
            />
            <span>
              Please complete all required activity fields highlighted below
              before continuing.
            </span>
          </div>
        ) : null}
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

            {additionalReferences.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Additional Reference(s)
                  </span>
                  <button
                    type="button"
                    onClick={onAddAdditionalReference}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A3C2F] hover:text-[#06241c] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add Another
                  </button>
                </div>
                {additionalReferences.map((ref) => (
                  <div
                    key={ref.id}
                    className="rounded-md border border-slate-200 bg-slate-50/70 p-2 text-xs"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <select
                        aria-label="Reference type"
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 focus:border-[#0A3C2F] focus:outline-none"
                        onChange={(e) =>
                          onUpdateAdditionalReference(
                            ref.id,
                            "type",
                            e.target.value,
                          )
                        }
                        value={ref.type}
                      >
                        <option value="STEP Reference">STEP Reference</option>
                        <option value="Donor Reference">Donor Reference</option>
                        <option value="Ministry / Agency Reference">
                          Ministry / Agency Reference
                        </option>
                        <option value="External Reference">
                          External Reference
                        </option>
                        <option value="Other Reference">Other Reference</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onRemoveAdditionalReference(ref.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove reference"
                        aria-label="Remove reference"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      className={inputClasses + " bg-white font-mono text-xs"}
                      onChange={(e) =>
                        onUpdateAdditionalReference(
                          ref.id,
                          "value",
                          e.target.value,
                        )
                      }
                      placeholder={
                        ref.type.toLowerCase().includes("step")
                          ? "e.g. WB-STEP-00123"
                          : "Enter reference number"
                      }
                      value={ref.value}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={onAddAdditionalReference}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#0A3C2F] hover:bg-[#0A3C2F]/5 hover:text-[#0A3C2F] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-[#0A3C2F]" />
                  Add Reference Number (e.g. STEP)
                </button>
              </div>
            )}
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
                aria-invalid={
                  attempted && !form.activityDescription.trim()
                    ? "true"
                    : undefined
                }
                className={
                  textareaClasses +
                  " min-h-20" +
                  (attempted && !form.activityDescription.trim()
                    ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
                    : "")
                }
                onChange={(event) =>
                  onChange("activityDescription", event.target.value)
                }
                placeholder="Describe what will be procured"
                value={form.activityDescription}
              />
            </Field>
          </div>

          {/* Budget & Funding Structure Toggle Header */}
          <div className="md:col-span-2 xl:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 pb-1 border-t border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-emerald-700" />
                Budget & Funding Structure
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Allocate budget using a single project funding source or
                register exact amounts across multiple funding sources with
                their native currencies.
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-medium self-start sm:self-auto shadow-xs">
              <button
                type="button"
                onClick={() => handleToggleMultiFunding(false)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  !form.hasMultiFunding
                    ? "bg-white text-emerald-800 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Single Funding Source
              </button>
              <button
                type="button"
                onClick={() => handleToggleMultiFunding(true)}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  form.hasMultiFunding
                    ? "bg-white text-emerald-800 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Multiple Sources (Co-Financing)</span>
              </button>
            </div>
          </div>

          {!form.hasMultiFunding ? (
            <>
              <Field
                error={
                  attempted && !(Number(form.estimatedAmount) > 0)
                    ? "Enter an estimated amount greater than zero."
                    : undefined
                }
                hint={
                  form.currency &&
                  form.currency.trim().toUpperCase() !== "ETB" &&
                  Number(form.estimatedAmount) > 0 &&
                  Number(form.exchangeRate) > 0
                    ? `≈ ${(Number(form.estimatedAmount) * Number(form.exchangeRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB equivalent`
                    : undefined
                }
                label="Estimated Amount"
                required
              >
                <input
                  aria-invalid={
                    attempted && !(Number(form.estimatedAmount) > 0)
                      ? "true"
                      : undefined
                  }
                  className={
                    inputClasses +
                    (attempted && !(Number(form.estimatedAmount) > 0)
                      ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
                      : "")
                  }
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

              <Field
                error={
                  attempted && !form.currency
                    ? "Select a currency for this activity."
                    : undefined
                }
                label="Currency"
                required
              >
                <SelectControl
                  hasError={attempted && !form.currency}
                  onChange={(value) => {
                    if (value === "__add_new_currency__") {
                      setActiveCurrencyContribId(null);
                      setCurrencyError(null);
                      setShowAddCurrencyModal(true);
                      return;
                    }
                    onChange("currency", value);
                  }}
                  value={form.currency}
                >
                  <option value="">Select currency</option>
                  {currencyOptions.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.label}
                    </option>
                  ))}
                  {form.currency &&
                  !currencyOptions.some((cur) => cur.code === form.currency) ? (
                    <option value={form.currency}>{form.currency}</option>
                  ) : null}
                  <option value="__add_new_currency__">
                    + Add currency if not listed...
                  </option>
                </SelectControl>
              </Field>

              {form.currency && form.currency.trim().toUpperCase() !== "ETB" ? (
                <Field
                  hint={
                    Number(form.estimatedAmount) > 0 &&
                    Number(form.exchangeRate) > 0
                      ? `Rate: 1 ${form.currency} = ${Number(form.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ETB`
                      : `Conversion rate to Ethiopian Birr (1 ${form.currency} = ... ETB).`
                  }
                  label="Exchange Rate (to ETB)"
                >
                  <div className="relative">
                    <input
                      className={
                        inputClasses +
                        " pr-12 text-right font-mono tabular-nums"
                      }
                      min="0"
                      onChange={(event) =>
                        onChange("exchangeRate", event.target.value)
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
                      placeholder="e.g. 125.00"
                      step="0.0001"
                      type="number"
                      value={form.exchangeRate || ""}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-slate-500">
                      ETB
                    </span>
                  </div>
                </Field>
              ) : null}

              <Field
                error={
                  attempted && !form.fundingSource
                    ? "Select a funding source for this activity."
                    : undefined
                }
                hint={
                  inheritedFundingSources.length > 1
                    ? "Auto-inherited from project. Select the funding source that finances this activity."
                    : "Auto-inherited from project."
                }
                label="Funding Source"
                required
              >
                <SelectControl
                  hasError={attempted && !form.fundingSource}
                  onChange={(value) => onChange("fundingSource", value)}
                  value={form.fundingSource}
                >
                  {inheritedFundingSources.length > 1 &&
                    !form.fundingSource && (
                      <option value="">Select funding source</option>
                    )}
                  {inheritedFundingSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </>
          ) : (
            <>
              <Field
                error={
                  attempted && !form.currency
                    ? "Select activity base reporting currency."
                    : undefined
                }
                hint="Main reporting currency. Total budget is computed in this currency."
                label="Activity Base Reporting Currency"
                required
              >
                <SelectControl
                  hasError={attempted && !form.currency}
                  onChange={(value) => {
                    if (value === "__add_new_currency__") {
                      setActiveCurrencyContribId(null);
                      setCurrencyError(null);
                      setShowAddCurrencyModal(true);
                      return;
                    }
                    handleTargetCurrencyChange(value);
                  }}
                  value={form.currency}
                >
                  <option value="">Select reporting currency</option>
                  {currencyOptions.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.label}
                    </option>
                  ))}
                  {form.currency &&
                  !currencyOptions.some((cur) => cur.code === form.currency) ? (
                    <option value={form.currency}>{form.currency}</option>
                  ) : null}
                  <option value="__add_new_currency__">
                    + Add currency if not listed...
                  </option>
                </SelectControl>
              </Field>

              <Field
                error={
                  attempted && !(Number(form.estimatedAmount) > 0)
                    ? "Enter native funds greater than zero below."
                    : undefined
                }
                hint="Auto-computed in real time from all funding contributions below."
                label={`Total Estimated Amount (${form.currency || "ETB"})`}
                required
              >
                <div className="relative">
                  <input
                    aria-label="Total estimated amount auto-calculated"
                    className={
                      inputClasses +
                      " bg-emerald-50/40 text-emerald-950 font-bold font-mono pr-28 border-emerald-300 cursor-not-allowed"
                    }
                    readOnly
                    type="text"
                    value={
                      totalComputed > 0
                        ? totalComputed.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"
                    }
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-Total
                  </span>
                </div>
              </Field>

              <Field
                hint="Derived from the active funding contributions registered below."
                label="Combined Funding Sources"
              >
                <div
                  className={
                    inputClasses +
                    " bg-slate-50 text-slate-700 text-xs truncate"
                  }
                >
                  {form.fundingSource || "Multiple Funding Sources"}
                </div>
              </Field>

              {/* Multi-Source Funding Breakdown Card */}
              <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-emerald-200/90 bg-emerald-50/20 p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                      <CircleDollarSign className="h-4 w-4 text-emerald-700" />
                      Funding Sources & Native Currency Breakdown
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Register the exact fund amount in each source&apos;s native
                      currency. Enter an optional conversion rate to compute the
                      total in {form.currency || "ETB"}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContribution}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs border border-emerald-300 hover:bg-emerald-50 transition-colors self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-700" />
                    Add Funding Source
                  </button>
                </div>

                {attempted && multiFundingInvalid ? (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>
                      Please select a funding source and specify an amount
                      greater than zero for all registered funding sources.
                    </span>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {contributions.map((contrib, idx) => {
                    const isSameCurrency =
                      contrib.currency &&
                      form.currency &&
                      contrib.currency.trim().toUpperCase() ===
                        form.currency.trim().toUpperCase();
                    const rateNum = Number(contrib.exchangeRate);
                    const effectiveRate = isSameCurrency
                      ? 1
                      : rateNum > 0
                        ? rateNum
                        : 1;
                    const equiv = (Number(contrib.amount) || 0) * effectiveRate;
                    const hasRowError =
                      attempted &&
                      (!contrib.fundingSource.trim() ||
                        !(Number(contrib.amount) > 0));

                    return (
                      <div
                        key={contrib.id}
                        className={`rounded-xl border bg-white p-3.5 shadow-xs transition-all ${
                          hasRowError
                            ? "border-red-300 bg-red-50/20"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            Funding Source #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveContribution(contrib.id)}
                            disabled={contributions.length <= 1}
                            className={`p-1.5 rounded-md transition-colors ${
                              contributions.length <= 1
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-400 hover:bg-red-50 hover:text-red-600"
                            }`}
                            title={
                              contributions.length <= 1
                                ? "At least one funding source is required"
                                : "Remove this funding source"
                            }
                            aria-label="Remove this funding source"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
                          {/* Funding Source (col-span-4) */}
                          <div className="lg:col-span-4 flex flex-col">
                            <label className="text-[11px] font-semibold text-slate-700 mb-1">
                              Funding Source{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            {customSourceRows[contrib.id] ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  aria-label="Custom funding source"
                                  className={
                                    inputClasses +
                                    " text-xs" +
                                    (attempted && !contrib.fundingSource.trim()
                                      ? " !border-red-500 !bg-red-50/20"
                                      : "")
                                  }
                                  onChange={(e) =>
                                    handleUpdateContribution(
                                      contrib.id,
                                      "fundingSource",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter funding source name"
                                  type="text"
                                  value={contrib.fundingSource}
                                />
                                <button
                                  aria-label="Select from list"
                                  className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs shrink-0"
                                  onClick={() =>
                                    setCustomSourceRows((prev) => ({
                                      ...prev,
                                      [contrib.id]: false,
                                    }))
                                  }
                                  title="Select from list"
                                  type="button"
                                >
                                  <ListChecks className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <SelectControl
                                hasError={
                                  attempted && !contrib.fundingSource.trim()
                                }
                                onChange={(val) => {
                                  if (val === "__custom__") {
                                    setCustomSourceRows((prev) => ({
                                      ...prev,
                                      [contrib.id]: true,
                                    }));
                                    handleUpdateContribution(
                                      contrib.id,
                                      "fundingSource",
                                      "",
                                    );
                                    return;
                                  }
                                  handleUpdateContribution(
                                    contrib.id,
                                    "fundingSource",
                                    val,
                                  );
                                }}
                                value={contrib.fundingSource}
                              >
                                <option value="">Select funding source</option>
                                {inheritedFundingSources.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                                {contrib.fundingSource &&
                                !inheritedFundingSources.includes(
                                  contrib.fundingSource,
                                ) ? (
                                  <option value={contrib.fundingSource}>
                                    {contrib.fundingSource}
                                  </option>
                                ) : null}
                                <option value="__custom__">
                                  + Enter custom funding source...
                                </option>
                              </SelectControl>
                            )}
                          </div>

                          {/* Native Currency (col-span-2) */}
                          <div className="lg:col-span-2 flex flex-col">
                            <label className="text-[11px] font-semibold text-slate-700 mb-1">
                              Native Currency{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <SelectControl
                              hasError={attempted && !contrib.currency}
                              onChange={(val) => {
                                if (val === "__add_new_currency__") {
                                  setActiveCurrencyContribId(contrib.id);
                                  setCurrencyError(null);
                                  setShowAddCurrencyModal(true);
                                  return;
                                }
                                handleUpdateContribution(
                                  contrib.id,
                                  "currency",
                                  val,
                                );
                              }}
                              value={contrib.currency}
                            >
                              <option value="">Select currency</option>
                              {currencyOptions.map((cur) => (
                                <option key={cur.code} value={cur.code}>
                                  {cur.code}
                                </option>
                              ))}
                              {contrib.currency &&
                              !currencyOptions.some(
                                (c) => c.code === contrib.currency,
                              ) ? (
                                <option value={contrib.currency}>
                                  {contrib.currency}
                                </option>
                              ) : null}
                              <option value="__add_new_currency__">
                                + Add...
                              </option>
                            </SelectControl>
                          </div>

                          {/* Exact Amount in Native Currency (col-span-3) */}
                          <div className="lg:col-span-3 flex flex-col">
                            <label className="text-[11px] font-semibold text-slate-700 mb-1">
                              Amount ({contrib.currency || "Native"}){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              aria-label={`Exact amount in ${contrib.currency}`}
                              className={
                                inputClasses +
                                " text-xs font-mono tabular-nums" +
                                (attempted && !(Number(contrib.amount) > 0)
                                  ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500"
                                  : "")
                              }
                              min="0"
                              onChange={(e) =>
                                handleUpdateContribution(
                                  contrib.id,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.key === "ArrowUp" ||
                                  e.key === "ArrowDown"
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="0.00"
                              step="0.01"
                              type="number"
                              value={contrib.amount}
                            />
                          </div>

                          {/* Conversion Rate (col-span-3) */}
                          <div className="lg:col-span-3 flex flex-col">
                            <label className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                              <span>Conversion Rate</span>
                              {!isSameCurrency ? (
                                <span className="text-[10px] font-normal text-slate-500">
                                  optional
                                </span>
                              ) : null}
                            </label>
                            {isSameCurrency ? (
                              <div className="flex items-center h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                                1.00{" "}
                                <span className="ml-1 text-[10px] text-slate-500">
                                  (Base {form.currency || "ETB"})
                                </span>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  aria-label={`Conversion rate from ${contrib.currency} to ${form.currency || "ETB"}`}
                                  className={
                                    inputClasses +
                                    " pr-12 text-right font-mono tabular-nums text-xs"
                                  }
                                  min="0"
                                  onChange={(e) =>
                                    handleUpdateContribution(
                                      contrib.id,
                                      "exchangeRate",
                                      e.target.value,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "ArrowUp" ||
                                      e.key === "ArrowDown"
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  placeholder="e.g. 125.00"
                                  step="0.0001"
                                  type="number"
                                  value={contrib.exchangeRate || ""}
                                />
                                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] font-bold text-slate-500">
                                  {form.currency || "ETB"}
                                </span>
                              </div>
                            )}
                            {!isSameCurrency ? (
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                {Number(contrib.exchangeRate) > 0
                                  ? `1 ${contrib.currency} = ${Number(contrib.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${form.currency || "ETB"}`
                                  : `1:1 applied if omitted`}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Converted Equivalent live row footer */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600">
                              Registered:
                            </span>
                            <span className="font-mono font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {Number(contrib.amount) > 0
                                ? Number(contrib.amount).toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )
                                : "0.00"}{" "}
                              {contrib.currency || "Native"}
                            </span>
                            {!isSameCurrency &&
                            Number(contrib.exchangeRate) > 0 ? (
                              <span className="text-[11px] text-slate-500">
                                ×{" "}
                                {Number(contrib.exchangeRate).toLocaleString()}{" "}
                                rate
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                            <span className="text-slate-500 font-normal">
                              Converted:
                            </span>
                            <span className="font-mono text-sm">
                              {equiv.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {form.currency || "ETB"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grand Total Summary Box */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-100/70 to-teal-100/50 border border-emerald-300/80 p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                          Total Computed Activity Budget
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900/80 mt-1">
                        Computed automatically from {contributions.length}{" "}
                        funding source{contributions.length > 1 ? "s" : ""}{" "}
                        based on native currency amounts and entered conversion
                        rates.
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xs font-semibold text-emerald-900/80 block">
                        Total Converted Budget:
                      </span>
                      <span className="text-2xl font-extrabold text-emerald-950 font-mono tracking-tight">
                        {totalComputed.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-sm font-bold text-emerald-800">
                          {form.currency || "ETB"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

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
                hasError={attempted && !form.pricingBasis}
                onChange={(value) => onChange("pricingBasis", value)}
                value={
                  form.pricingBasis === "BOQ" ||
                  form.pricingBasis === "Bill of Quantities (BOQ)"
                    ? "Bill of Quantities (BOQ)"
                    : form.pricingBasis === "LUMP_SUM" ||
                        form.pricingBasis === "Lump Sum"
                      ? "Lump Sum"
                      : form.pricingBasis
                }
              >
                <option value="">Select pricing basis</option>
                <option value="Lump Sum">Lump Sum</option>
                <option value="Bill of Quantities (BOQ)">
                  Bill of Quantities (BOQ)
                </option>
                {form.pricingBasis &&
                ![
                  "Lump Sum",
                  "Bill of Quantities (BOQ)",
                  "BOQ",
                  "LUMP_SUM",
                ].includes(form.pricingBasis) ? (
                  <option value={form.pricingBasis}>{form.pricingBasis}</option>
                ) : null}
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
              {form.subcomponent &&
              !(project.subcomponents ?? []).includes(form.subcomponent) ? (
                <option value={form.subcomponent}>{form.subcomponent}</option>
              ) : null}
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
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
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
                    aria-invalid={
                      attempted && !lot.number.trim() ? "true" : undefined
                    }
                    className={
                      inputClasses +
                      (attempted && !lot.number.trim()
                        ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
                        : "")
                    }
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
                    aria-invalid={
                      attempted && !lot.description.trim() ? "true" : undefined
                    }
                    className={
                      inputClasses +
                      (attempted && !lot.description.trim()
                        ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
                        : "")
                    }
                    onChange={(event) =>
                      updateLot(lot.id, "description", event.target.value)
                    }
                    placeholder="Describe this lot"
                    value={lot.description}
                  />
                </Field>
                <Field
                  error={
                    attempted &&
                    (!lot.amount.trim() || !(Number(lot.amount) >= 0))
                      ? "Enter a valid lot amount."
                      : undefined
                  }
                  label="Estimated Lot Amount"
                  required
                >
                  <input
                    aria-invalid={
                      attempted &&
                      (!lot.amount.trim() || !(Number(lot.amount) >= 0))
                        ? "true"
                        : undefined
                    }
                    className={
                      inputClasses +
                      (attempted &&
                      (!lot.amount.trim() || !(Number(lot.amount) >= 0))
                        ? " !border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
                        : "")
                    }
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
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[10px] font-semibold text-[#0A3C2F] hover:border-[#0A3C2F] hover:bg-emerald-50 transition"
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

      {showAddCurrencyModal && (
        <div
          aria-labelledby="add-currency-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3
                id="add-currency-title"
                className="text-sm font-semibold text-slate-900 flex items-center gap-2"
              >
                <Plus className="h-4 w-4 text-[#0A3C2F]" />
                Add New Currency
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingCurrency) {
                    setShowAddCurrencyModal(false);
                    setCurrencyError(null);
                  }
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCurrencySubmit} className="mt-4 space-y-4">
              {currencyError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{currencyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Currency Code (ISO) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={10}
                  placeholder="e.g. GBP, CAD, JPY, CHF"
                  value={newCurrencyCode}
                  onChange={(e) =>
                    setNewCurrencyCode(e.target.value.toUpperCase())
                  }
                  className={inputClasses + " font-mono uppercase"}
                  disabled={isSubmittingCurrency}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Standard 3-letter ISO code or recognized currency symbol.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name / Description{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. British Pound Sterling"
                  value={newCurrencyName}
                  onChange={(e) => setNewCurrencyName(e.target.value)}
                  className={inputClasses}
                  disabled={isSubmittingCurrency}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCurrencyModal(false);
                    setCurrencyError(null);
                  }}
                  disabled={isSubmittingCurrency}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCurrency || !newCurrencyCode.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#006837] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#00552c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingCurrency ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Add & Select Currency"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
            attempted={attempted}
            emptyMessage="No project component was entered for this project."
            icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
            onChange={onComponentChange}
            title="Component Allocation"
          />
          <AllocationBlock
            allocations={financingAllocations}
            attempted={attempted}
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
                {form.location && !regions.includes(form.location) ? (
                  <option value={form.location}>{form.location}</option>
                ) : null}
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
  attempted = false,
  emptyMessage,
  icon,
  onChange,
  title,
}: {
  allocations: Allocation[];
  attempted?: boolean;
  emptyMessage: string;
  icon: ReactNode;
  onChange: (value: Allocation[]) => void;
  title: string;
}) {
  const selected = allocations.filter((allocation) => allocation.selected);
  const total = selected.reduce(
    (sum, allocation) => sum + Number(allocation.percent),
    0,
  );
  const isValid = allocationTotalIsValid(allocations);
  const hasError = attempted && !isValid;

  return (
    <section
      className={
        "rounded-lg border p-3.5 transition-colors " +
        (hasError
          ? "border-red-300 bg-red-50/20"
          : "border-slate-200 bg-transparent")
      }
      data-field-has-error={hasError}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <h3 className="flex items-center gap-2 text-[10px] font-semibold text-[#10243f]">
          <span className={hasError ? "text-red-600" : "text-[#0A3C2F]"}>
            {icon}
          </span>
          {title}
          {hasError ? (
            <span className="ml-1 text-red-600 font-bold">*</span>
          ) : null}
        </h3>
        {allocations.length > 0 ? (
          <span
            className={
              "rounded-md border px-2 py-0.5 text-[9px] font-medium " +
              (total === 100 && selected.every((a) => Number(a.percent) > 0)
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200")
            }
          >
            Total {total}%
          </span>
        ) : null}
      </div>
      {hasError ? (
        <p
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-red-600"
          />
          {allocations.length === 0
            ? emptyMessage
            : selected.length === 0
              ? `Select at least one ${title.toLowerCase()} and assign percentages totaling 100%.`
              : total !== 100
                ? `Total percentage must equal exactly 100% (currently ${total}%).`
                : "Each selected allocation must have a percentage greater than 0%."}
        </p>
      ) : null}
      <div className="mt-2">
        <AllocationSelector
          allocations={allocations}
          attempted={attempted}
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
  attempted = false,
  emptyMessage,
  onChange,
  showPercent,
}: {
  allocations: Allocation[];
  attempted?: boolean;
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
          className={
            "flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 " +
            (attempted &&
            showPercent &&
            allocation.selected &&
            !(Number(allocation.percent) > 0)
              ? "border-red-300 bg-red-50/30"
              : "border-slate-200 bg-white")
          }
          key={allocation.id}
        >
          <input
            aria-label={"Select " + allocation.id}
            checked={allocation.selected}
            className="h-4 w-4 shrink-0 accent-[#0A3C2F]"
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
                aria-invalid={
                  attempted && !(Number(allocation.percent) > 0)
                    ? "true"
                    : undefined
                }
                className={
                  "h-8 w-20 rounded border px-2 text-right text-[10px] outline-none " +
                  (attempted && !(Number(allocation.percent) > 0)
                    ? "!border-red-500 !bg-red-50/20 text-red-950 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20"
                    : "border-slate-300 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/15")
                }
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
              <span className="text-[10px] font-semibold text-slate-500">
                %
              </span>
            </label>
          ) : null}
        </div>
      ))}
    </div>
  );
}
