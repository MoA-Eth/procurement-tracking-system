"use client";

import type {
  OfficerProject,
  ProcurementPlanSummary,
} from "../data/officerProjects";
import type { ProcurementPlanDraftInput } from "../data/officerPlanDrafts";
import {
  daysInEthiopianMonth,
  ETHIOPIAN_MONTHS,
  ethiopianToGregorian,
  ethiopianWeekday,
  formatEthiopianDate,
  gregorianToEthiopian,
  parseEthiopianDate,
  type EthiopianDate,
} from "../utils/ethiopianCalendar";
import { parseExcelDateToIso } from "../utils/projectExcelUtils";
import { DualCalendarField } from "./DualCalendarField";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Info,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  Save,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";

type SaveAction = "activity" | "draft" | null;

interface PlanFormState {
  budgetYear: string;
  contractAwardDate: string;
  contractAwardDateEthiopian: string;
  generalProcurementNoticeDate: string;
  generalProcurementNoticeDateEthiopian: string;
  organizationRegion: string;
  periodFrom: string;
  periodFromEthiopian: string;
  periodTo: string;
  periodToEthiopian: string;
  planName: string;
  remarks: string;
}

export function toInputDate(val?: unknown): string {
  if (!val) return "";
  return parseExcelDateToIso(val);
}

function toEthDate(greg?: unknown, eth?: unknown): string {
  if (typeof eth === "string" && eth.trim()) return eth.trim();
  const iso = toInputDate(greg);
  if (!iso) return "";
  const ethObj = gregorianToEthiopian(iso);
  return ethObj ? formatEthiopianDate(ethObj) : "";
}

function extractPlanFormData(
  initialPlan?: ProcurementPlanSummary,
  project?: OfficerProject,
): PlanFormState {
  const planAny = initialPlan as any;

  // Period From
  const rawFromGreg =
    initialPlan?.planPeriod?.from?.gregorian ||
    (typeof planAny?.planPeriod?.from === "string"
      ? planAny.planPeriod.from
      : "") ||
    planAny?.periodFrom ||
    planAny?.periodStart ||
    planAny?.planPeriodFrom ||
    planAny?.startDate ||
    "";
  const periodFrom = toInputDate(rawFromGreg);

  const rawFromEth =
    initialPlan?.planPeriod?.from?.ethiopian ||
    (typeof planAny?.periodFromEthiopian === "string"
      ? planAny.periodFromEthiopian
      : "") ||
    (typeof planAny?.planPeriodFromEthiopian === "string"
      ? planAny.planPeriodFromEthiopian
      : "") ||
    "";
  const periodFromEthiopian = toEthDate(periodFrom, rawFromEth);

  // Period To
  const rawToGreg =
    initialPlan?.planPeriod?.to?.gregorian ||
    (typeof planAny?.planPeriod?.to === "string"
      ? planAny.planPeriod.to
      : "") ||
    planAny?.periodTo ||
    planAny?.periodEnd ||
    planAny?.planPeriodTo ||
    planAny?.endDate ||
    "";
  const periodTo = toInputDate(rawToGreg);

  const rawToEth =
    initialPlan?.planPeriod?.to?.ethiopian ||
    (typeof planAny?.periodToEthiopian === "string"
      ? planAny.periodToEthiopian
      : "") ||
    (typeof planAny?.planPeriodToEthiopian === "string"
      ? planAny.planPeriodToEthiopian
      : "") ||
    "";
  const periodToEthiopian = toEthDate(periodTo, rawToEth);

  // General Procurement Notice Date
  const rawGpnGreg =
    initialPlan?.generalProcurementNoticeDate?.gregorian ||
    (typeof planAny?.generalProcurementNoticeDate === "string"
      ? planAny.generalProcurementNoticeDate
      : "") ||
    planAny?.gpnDate ||
    planAny?.generalNoticeDate ||
    "";
  const generalProcurementNoticeDate = toInputDate(rawGpnGreg);

  const rawGpnEth =
    initialPlan?.generalProcurementNoticeDate?.ethiopian ||
    (typeof planAny?.generalProcurementNoticeDateEthiopian === "string"
      ? planAny.generalProcurementNoticeDateEthiopian
      : "") ||
    "";
  const generalProcurementNoticeDateEthiopian = toEthDate(
    generalProcurementNoticeDate,
    rawGpnEth,
  );

  const rawContractAwardDateGreg =
    initialPlan?.contractAwardDate?.gregorian ||
    (typeof planAny?.contractAwardDate === "string"
      ? planAny.contractAwardDate
      : "") ||
    "";
  const contractAwardDate = toInputDate(rawContractAwardDateGreg);
  const rawContractAwardDateEth =
    initialPlan?.contractAwardDate?.ethiopian ||
    (typeof planAny?.contractAwardDateEthiopian === "string"
      ? planAny.contractAwardDateEthiopian
      : "") ||
    "";
  const contractAwardDateEthiopian = toEthDate(
    contractAwardDate,
    rawContractAwardDateEth,
  );

  const budgetYear =
    initialPlan?.budgetYear?.replace(/ EFY/i, "").trim() ||
    planAny?.fiscalYear?.replace(/ EFY/i, "").trim() ||
    "2017";

  return {
    budgetYear,
    contractAwardDate,
    contractAwardDateEthiopian,
    generalProcurementNoticeDate,
    generalProcurementNoticeDateEthiopian,
    organizationRegion:
      initialPlan?.organizationRegion ||
      planAny?.organization ||
      project?.availableOrganizationRegions?.[0] ||
      project?.organizationRegion ||
      "",
    periodFrom,
    periodFromEthiopian,
    periodTo,
    periodToEthiopian,
    planName:
      initialPlan?.name ||
      planAny?.title ||
      planAny?.planName ||
      (project ? suggestedPlanName(project, budgetYear) : ""),
    remarks: initialPlan?.description || planAny?.remarks || "",
  };
}

const compactFieldClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00843D] focus:ring-2 focus:ring-[#00843D]/15";

export function generateEfyBudgetYearOptions(
  baseYear = 2018,
  span = 100,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const maxYear = baseYear + span;
  const minYear = baseYear - span;

  for (let y = maxYear; y >= minYear; y--) {
    options.push({
      value: String(y),
      label: `${y} EFY (${y + 7}/${y + 8})`,
    });
  }
  return options;
}

export const EFY_BUDGET_YEAR_OPTIONS: Array<{ value: string; label: string }> =
  generateEfyBudgetYearOptions(2018, 100);

export function suggestedPlanName(project: OfficerProject, budgetYear: string) {
  return `${project.shortName} - Procurement Plan - ${budgetYear} EFY`;
}

export function CreateProcurementPlanView({
  initialPlan,
  onSavePlan,
  project,
}: {
  initialPlan?: ProcurementPlanSummary;
  onSavePlan: (
    input: ProcurementPlanDraftInput,
    action: Exclude<SaveAction, null>,
    revisionReason?: string,
  ) => Promise<void> | void;
  project: OfficerProject;
}) {
  const isEditing = Boolean(initialPlan);
  const [planNameEdited, setPlanNameEdited] = useState(() =>
    Boolean(initialPlan),
  );
  const [revisionReason, setRevisionReason] = useState("");
  const [saveAction, setSaveAction] = useState<SaveAction>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const lastLoadedPlanRef = useRef<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(() =>
    extractPlanFormData(initialPlan, project),
  );
  const [isCustomYear, setIsCustomYear] = useState(false);

  const budgetYearOptions = useMemo(() => {
    const options = [...EFY_BUDGET_YEAR_OPTIONS];
    if (form.budgetYear && !options.some((o) => o.value === form.budgetYear)) {
      options.unshift({
        value: form.budgetYear,
        label: `${form.budgetYear} EFY`,
      });
    }
    return options;
  }, [form.budgetYear]);

  useEffect(() => {
    if (!initialPlan) return;
    const planKey = initialPlan.id || initialPlan.reference || initialPlan.name;
    const extracted = extractPlanFormData(initialPlan, project);
    const planSignature = `${planKey}|${extracted.periodFrom}|${extracted.periodTo}|${extracted.generalProcurementNoticeDate}|${extracted.contractAwardDate}|${extracted.remarks}|${extracted.planName}|${extracted.budgetYear}|${extracted.organizationRegion}`;

    if (lastLoadedPlanRef.current === planSignature) return;
    lastLoadedPlanRef.current = planSignature;

    setPlanNameEdited(true);
    setForm(extracted);
  }, [initialPlan, project]);

  const detailHref = `/workspace/projects?project=${encodeURIComponent(
    project.code,
  )}`;
  const dateOrderError = Boolean(
    form.periodFrom && form.periodTo && form.periodTo < form.periodFrom,
  );
  const nameError = validationAttempted && !form.planName.trim();
  const budgetYearError = validationAttempted && !form.budgetYear.trim();
  const periodFromError = validationAttempted && !form.periodFrom;
  const periodToError =
    validationAttempted && (!form.periodTo || dateOrderError);

  function updateField(field: keyof PlanFormState, value: string) {
    setSaveAction(null);
    if (field === "planName") setPlanNameEdited(true);

    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "budgetYear" && !planNameEdited) {
        next.planName = suggestedPlanName(project, value);
      }

      return next;
    });
  }

  function updateDatePair(
    period: "award" | "from" | "notice" | "to",
    gregorianValue: string,
    ethiopianValue: string,
  ) {
    setSaveAction(null);
    setForm((current) => {
      if (period === "from") {
        return {
          ...current,
          periodFrom: gregorianValue,
          periodFromEthiopian: ethiopianValue,
        };
      }

      if (period === "to") {
        return {
          ...current,
          periodTo: gregorianValue,
          periodToEthiopian: ethiopianValue,
        };
      }

      if (period === "award") {
        return {
          ...current,
          contractAwardDate: gregorianValue,
          contractAwardDateEthiopian: ethiopianValue,
        };
      }

      return {
        ...current,
        generalProcurementNoticeDate: gregorianValue,
        generalProcurementNoticeDateEthiopian: ethiopianValue,
      };
    });
  }

  async function handleSubmit(
    event: SyntheticEvent | null,
    action: Exclude<SaveAction, null>,
  ) {
    if (event) event.preventDefault();
    setValidationAttempted(true);
    setSubmitError(null);

    if (
      !form.planName.trim() ||
      !form.budgetYear.trim() ||
      !form.periodFrom ||
      !form.periodTo ||
      dateOrderError
    ) {
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }

    try {
      setIsSubmitting(true);
      setSaveAction(action);
      await onSavePlan(
        { ...form, category: initialPlan?.category ?? "Per Activity" },
        action,
        revisionReason.trim() ||
          (isEditing ? "Updated plan parameters" : undefined),
      );
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          "Failed to create or update plan in the server database.",
      );
      window.scrollTo({ behavior: "smooth", top: 0 });
    } finally {
      setIsSubmitting(false);
    }
  }

  const organizationRegions =
    project.availableOrganizationRegions ??
    (project.organizationRegion ? [project.organizationRegion] : []);

  const isPlanReturned =
    initialPlan?.status === "Returned" ||
    initialPlan?.status === "Returned for Revision";

  const planBackHref = initialPlan
    ? `/workspace/projects?project=${encodeURIComponent(
        project.code,
      )}&plan=${encodeURIComponent(initialPlan.reference)}`
    : detailHref;

  return (
    <div className="w-full pb-8">
      <div className="space-y-4">
        <CreatePlanBreadcrumb
          detailHref={detailHref}
          initialPlan={initialPlan}
          project={project}
        />

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {isEditing
                  ? isPlanReturned
                    ? "Revise Procurement Plan"
                    : "Edit Procurement Plan"
                  : "Create Procurement Plan"}
              </h1>
              {initialPlan && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-300">
                  v{initialPlan.version || 1}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isEditing
                ? `Update procurement plan configuration and parameters under `
                : `Configure and register a new procurement plan under `}
              <strong className="font-semibold text-slate-700">
                {project.name}
              </strong>
              .
            </p>
          </div>
        </div>

        {/* Database Submission Error Alert Banner */}
        {submitError && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">
                Database Action Failed
              </p>
              <p className="mt-1 leading-relaxed text-red-800">{submitError}</p>
            </div>
          </div>
        )}

        {/* Director / Management Feedback Banner if Returned */}
        {(initialPlan?.directorRevisionComment ||
          initialPlan?.rejectionReason) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs shadow-2xs space-y-2.5">
            <div>
              <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-amber-700" />
                Director Feedback &amp; Revision Instructions:
              </p>
              <p className="italic leading-relaxed text-amber-950">
                &ldquo;
                {initialPlan.directorRevisionComment ||
                  initialPlan.rejectionReason}
                &rdquo;
              </p>
            </div>
            {Boolean(initialPlan.managementComment) && (
              <div className="pt-2 border-t border-amber-200/70">
                <p className="font-semibold text-indigo-900 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-indigo-700" />
                  Management Rejection Comment:
                </p>
                <p className="italic leading-relaxed text-indigo-950">
                  &ldquo;{initialPlan.managementComment}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {saveAction ? (
          <div
            aria-live="polite"
            className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 shadow-sm"
            role="status"
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#00843D]"
            />
            <span>
              {isEditing
                ? "Plan changes saved successfully."
                : "Plan draft saved successfully and added to this project's Procurement Plans."}
            </span>
          </div>
        ) : null}
      </div>

      <form
        className="mt-5 space-y-6"
        onSubmit={(event) => handleSubmit(event, "activity")}
      >
        {/* Section 1: Inherited Project Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <LockKeyhole
              aria-hidden="true"
              className="h-4 w-4 text-slate-500"
            />
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-700">
              Inherited Project Information
            </h2>
            <span className="ml-auto text-xs text-slate-400">
              Read-only from project setup
            </span>
          </div>
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <LockedInput label="Project" value={project.name} />
              <LockedInput label="Project Code" value={project.code} />
              <LockedInput
                label="Country / Organisation"
                value={project.countryOrganisation}
              />
              <LockedInput
                label="Executing Agency"
                value={project.executingAgency}
              />
              <LockedInput
                label="Funding Source"
                value={project.fundingSource}
              />
              <LockedInput label="Funding Type" value={project.fundingType} />
              {project.financingNumbers?.length ? (
                <LockedInput
                  label="Loan / Credit / Grant Number(s)"
                  value={project.financingNumbers.join(", ")}
                />
              ) : null}
              <LockedInput
                label="Base / Reporting Currency"
                value={currencyLabel(project.baseCurrency)}
              />
              <LockedInput
                icon
                label="Responsible Officers"
                value={project.assignedOfficers.join(", ")}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Plan Configuration & Scope */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-800">
              Plan Identification & Classification
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Plan Name */}
            <CompactFormField
              errorMessage={
                nameError ? "Please enter a procurement plan name." : undefined
              }
              htmlFor="planName"
              label="Procurement Plan Name"
              required
            >
              <input
                className={compactFieldClasses}
                id="planName"
                onChange={(event) =>
                  updateField("planName", event.target.value)
                }
                placeholder="e.g. BREFONS - Procurement Plan - 2018 EFY"
                value={form.planName}
              />
            </CompactFormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <CompactFormField
                action={
                  <button
                    type="button"
                    onClick={() => setIsCustomYear((prev) => !prev)}
                    className="text-[11px] font-semibold text-[#00843D] hover:text-[#0B6B3A] hover:underline transition-colors cursor-pointer"
                  >
                    {isCustomYear ? "Select from list" : "Enter custom year"}
                  </button>
                }
                errorMessage={
                  budgetYearError ? "Budget year is required." : undefined
                }
                htmlFor="budgetYear"
                label="Budget Year (EFY)"
                required
              >
                {isCustomYear ? (
                  <input
                    className={compactFieldClasses}
                    id="budgetYear"
                    inputMode="numeric"
                    maxLength={4}
                    name="budgetYear"
                    onChange={(event) => {
                      const digitsOnly = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
                      updateField("budgetYear", digitsOnly);
                    }}
                    placeholder="e.g. 2018"
                    type="text"
                    value={form.budgetYear}
                  />
                ) : (
                  <div className="relative">
                    <select
                      className={`${compactFieldClasses} appearance-none pr-9`}
                      id="budgetYear"
                      name="budgetYear"
                      onChange={(event) =>
                        updateField("budgetYear", event.target.value)
                      }
                      value={form.budgetYear}
                    >
                      {budgetYearOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                )}
              </CompactFormField>

              <CompactFormField
                htmlFor="organizationRegion"
                label="Organisation / Region"
              >
                <div className="relative">
                  <select
                    className={`${compactFieldClasses} appearance-none pr-9`}
                    id="organizationRegion"
                    name="organizationRegion"
                    onChange={(event) =>
                      updateField("organizationRegion", event.target.value)
                    }
                    value={form.organizationRegion}
                  >
                    {organizationRegions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </CompactFormField>
            </div>
          </div>
        </section>

        {/* Section 3: Plan Timeline & Notice Dates */}
        <section className="relative z-10 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="rounded-t-xl border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-800">
              Plan Schedule &amp; Coverage Period
            </h2>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <DualCalendarField
                errorMessage={
                  periodFromError ? "Start date is required." : undefined
                }
                ethiopianValue={form.periodFromEthiopian}
                gregorianValue={form.periodFrom}
                id="periodFrom"
                label="Plan Period From (Gregorian / Ethiopian)"
                onChange={(gregorianValue, ethiopianValue) =>
                  updateDatePair("from", gregorianValue, ethiopianValue)
                }
                required
              />

              <DualCalendarField
                errorMessage={
                  periodToError
                    ? dateOrderError
                      ? "End date must be after Start date."
                      : "End date is required."
                    : undefined
                }
                ethiopianValue={form.periodToEthiopian}
                gregorianValue={form.periodTo}
                id="periodTo"
                label="Plan Period To (Gregorian / Ethiopian)"
                onChange={(gregorianValue, ethiopianValue) =>
                  updateDatePair("to", gregorianValue, ethiopianValue)
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DualCalendarField
                ethiopianValue={form.contractAwardDateEthiopian}
                gregorianValue={form.contractAwardDate}
                id="contractAwardDate"
                label="Contract Award Date (Reference Only)"
                onChange={(gregorianValue, ethiopianValue) =>
                  updateDatePair("award", gregorianValue, ethiopianValue)
                }
                required={false}
              />
              <p className="self-end text-[10px] text-slate-500">
                Reference only; this date does not change the plan coverage
                period.
              </p>
              {form.generalProcurementNoticeDate ||
              !form.generalProcurementNoticeDateEthiopian ? (
                <DualCalendarField
                  ethiopianValue={form.generalProcurementNoticeDateEthiopian}
                  gregorianValue={form.generalProcurementNoticeDate}
                  id="generalNoticeDate"
                  label="General Procurement Notice (GPN) Publication Date"
                  onChange={(gregorianValue, ethiopianValue) =>
                    updateDatePair("notice", gregorianValue, ethiopianValue)
                  }
                  required={false}
                />
              ) : null}
              <div className="min-w-0">
                <CompactFormField
                  htmlFor="remarks"
                  label="Description / Remarks"
                >
                  <textarea
                    className="min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-[#00843D] focus:ring-2 focus:ring-[#00843D]/15"
                    id="remarks"
                    onChange={(event) =>
                      updateField("remarks", event.target.value)
                    }
                    placeholder="Enter any context, notes, or specific procurement plan remarks..."
                    value={form.remarks}
                  />
                </CompactFormField>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Revision Justification (When in Returned / Revision status) */}
        {isPlanReturned && (
          <section className="notice-card-clean space-y-2.5">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-700" />
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-800">
                Revision Reason / Justification for Audit Trail
              </h2>
            </div>
            <textarea
              className="min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-[#00843D] focus:ring-2 focus:ring-[#00843D]/15"
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="Specify justification for this revision (e.g., Updated budget year and adjusted coverage schedule per Director feedback)..."
              value={revisionReason}
            />
          </section>
        )}

        {/* Section 5: Actions & Navigation Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-300 bg-white pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex h-9 items-center gap-2 px-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            href={planBackHref}
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {isEditing
              ? `Back to Plan (${initialPlan?.name || "Detail"})`
              : `Back to ${project.shortName} Project`}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(event) => handleSubmit(event, "draft")}
              type="button"
            >
              <Save aria-hidden="true" className="h-3.5 w-3.5 text-slate-600" />
              {isSubmitting && saveAction === "draft"
                ? "Saving..."
                : isEditing
                  ? "Update Plan"
                  : "Save Draft"}
            </button>
            <button
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#00843D] bg-[#00843D] px-4 text-xs font-semibold text-white hover:bg-[#0B6B3A] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleSubmit(null, "activity")}
              type="button"
            >
              {isSubmitting && saveAction === "activity" ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <Save aria-hidden="true" className="h-3.5 w-3.5" />
                  {isEditing
                    ? "Save & Go to Activities"
                    : "Save & Add Procurement Activity"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CreatePlanBreadcrumb({
  detailHref,
  initialPlan,
  project,
}: {
  detailHref: string;
  initialPlan?: ProcurementPlanSummary;
  project: OfficerProject;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link className="hover:text-[#00843D]" href="/dashboard/officer">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="hover:text-[#00843D]" href="/workspace/projects">
            Projects
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link className="hover:text-[#00843D]" href={detailHref}>
            {project.shortName}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        {initialPlan ? (
          <>
            <li>
              <Link
                className="hover:text-[#00843D]"
                href={`/workspace/projects?project=${encodeURIComponent(
                  project.code,
                )}&plan=${encodeURIComponent(initialPlan.reference)}`}
              >
                {initialPlan.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-slate-800">
              {initialPlan.status === "Returned" ||
              initialPlan.status === "Returned for Revision"
                ? "Revise Plan"
                : "Edit Plan"}
            </li>
          </>
        ) : (
          <li aria-current="page" className="font-semibold text-slate-800">
            Create Plan
          </li>
        )}
      </ol>
    </nav>
  );
}

export { DualCalendarField } from "./DualCalendarField";

function LockedInput({
  icon = false,
  label,
  value,
}: {
  icon?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{label}</p>
      <div className="relative">
        <input
          className={`h-9 w-full truncate rounded-md border border-slate-300 bg-slate-50/80 px-2.5 text-xs text-slate-600 outline-none ${
            icon ? "pl-7" : ""
          }`}
          readOnly
          title={value}
          value={value}
        />
        {icon ? (
          <LockKeyhole
            aria-hidden="true"
            className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
          />
        ) : null}
      </div>
    </div>
  );
}

function CompactFormField({
  action,
  children,
  errorMessage,
  htmlFor,
  label,
  required = false,
}: {
  action?: ReactNode;
  children: ReactNode;
  errorMessage?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  const error = Boolean(errorMessage);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          className={`block text-xs font-semibold ${
            error ? "text-red-600" : "text-slate-700"
          }`}
          htmlFor={htmlFor}
        >
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
        {action}
      </div>
      {children}
      {errorMessage ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-medium">
          <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function currencyLabel(currency: string) {
  if (currency === "USD") return "USD ($)";
  if (currency === "ETB") return "ETB (Br)";
  if (currency === "EUR") return "EUR (€)";
  if (currency === "GBP") return "GBP (£)";
  if (currency === "JPY") return "JPY (¥)";
  if (currency === "UA") return "UA (Unit of Account)";
  return currency;
}
