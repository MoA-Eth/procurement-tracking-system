"use client";

import type {
  OfficerProject,
  ProcurementCategory,
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
import { DualCalendarField } from "./DualCalendarField";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Hammer,
  Info,
  Lightbulb,
  LockKeyhole,
  MessageSquare,
  RotateCcw,
  Save,
  Settings,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

type SaveAction = "activity" | "draft" | null;

interface PlanFormState {
  budgetYear: string;
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

const compactFieldClasses =
  "h-10 w-full rounded-none border border-slate-400 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";

export const procurementCategories = [
  {
    description: "Physical items, equipment, and commodities.",
    icon: ShoppingCart,
    value: "Goods" as const,
  },
  {
    description:
      "Construction, infrastructure, and civil engineering projects.",
    icon: Hammer,
    value: "Works" as const,
  },
  {
    description:
      "Operational services like maintenance, security, and transport.",
    icon: Settings,
    value: "Non-Consulting Services" as const,
  },
  {
    description: "Professional consulting firms, advisory, and study experts.",
    icon: Lightbulb,
    value: "Consultancy Services" as const,
  },
] as const;

export function suggestedPlanName(
  project: OfficerProject,
  category: ProcurementCategory,
  budgetYear: string,
) {
  return `${project.shortName} - ${category} Procurement Plan - ${budgetYear} EFY`;
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
  ) => void;
  project: OfficerProject;
}) {
  const isEditing = Boolean(initialPlan);
  const [selectedCategory, setSelectedCategory] =
    useState<ProcurementCategory | null>(() => initialPlan?.category ?? null);
  const [planNameEdited, setPlanNameEdited] = useState(() =>
    Boolean(initialPlan),
  );
  const [revisionReason, setRevisionReason] = useState("");
  const [saveAction, setSaveAction] = useState<SaveAction>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [form, setForm] = useState<PlanFormState>(() => ({
    budgetYear: initialPlan?.budgetYear?.replace(/ EFY/i, "").trim() || "2017",
    generalProcurementNoticeDate:
      initialPlan?.generalProcurementNoticeDate?.gregorian || "",
    generalProcurementNoticeDateEthiopian:
      initialPlan?.generalProcurementNoticeDate?.ethiopian || "",
    organizationRegion:
      initialPlan?.organizationRegion ||
      project.availableOrganizationRegions?.[0] ||
      project.organizationRegion ||
      "",
    periodFrom: initialPlan?.planPeriod?.from?.gregorian || "",
    periodFromEthiopian: initialPlan?.planPeriod?.from?.ethiopian || "",
    periodTo: initialPlan?.planPeriod?.to?.gregorian || "",
    periodToEthiopian: initialPlan?.planPeriod?.to?.ethiopian || "",
    planName: initialPlan?.name || "",
    remarks: initialPlan?.description || "",
  }));

  const detailHref = `/workspace/projects?project=${encodeURIComponent(
    project.code,
  )}`;
  const dateOrderError = Boolean(
    form.periodFrom && form.periodTo && form.periodTo < form.periodFrom,
  );
  const categoryError = validationAttempted && !selectedCategory;
  const nameError = validationAttempted && !form.planName.trim();
  const budgetYearError = validationAttempted && !form.budgetYear.trim();
  const periodFromError = validationAttempted && !form.periodFrom;
  const periodToError =
    validationAttempted && (!form.periodTo || dateOrderError);

  function handleCategoryChange(category: ProcurementCategory) {
    setSaveAction(null);
    setSelectedCategory(category);
    if (!planNameEdited) {
      setForm((current) => ({
        ...current,
        planName: suggestedPlanName(project, category, current.budgetYear),
      }));
    }
  }

  function updateField(field: keyof PlanFormState, value: string) {
    setSaveAction(null);
    if (field === "planName") setPlanNameEdited(true);

    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "budgetYear" && selectedCategory && !planNameEdited) {
        next.planName = suggestedPlanName(project, selectedCategory, value);
      }

      return next;
    });
  }

  function updateDatePair(
    period: "from" | "notice" | "to",
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

      return {
        ...current,
        generalProcurementNoticeDate: gregorianValue,
        generalProcurementNoticeDateEthiopian: ethiopianValue,
      };
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement> | null,
    action: Exclude<SaveAction, null>,
  ) {
    if (event) event.preventDefault();
    setValidationAttempted(true);

    if (
      !selectedCategory ||
      !form.planName.trim() ||
      !form.budgetYear.trim() ||
      !form.periodFrom ||
      !form.periodTo ||
      dateOrderError
    ) {
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }

    onSavePlan(
      { ...form, category: selectedCategory },
      action,
      revisionReason.trim() ||
        (isEditing ? "Updated plan parameters" : undefined),
    );
    setSaveAction(action);
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
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {isEditing
                  ? isPlanReturned
                    ? "Revise Procurement Plan"
                    : "Edit Procurement Plan"
                  : "Create Procurement Plan"}
              </h1>
              {initialPlan && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-300">
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

        {/* Director / Management Feedback Banner if Returned */}
        {(initialPlan?.directorRevisionComment || initialPlan?.rejectionReason) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs shadow-2xs space-y-2.5">
            <div>
              <p className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-amber-700" />
                Director Feedback &amp; Revision Instructions:
              </p>
              <p className="italic leading-relaxed text-amber-950">
                &ldquo;{initialPlan.directorRevisionComment || initialPlan.rejectionReason}&rdquo;
              </p>
            </div>
            {Boolean(initialPlan.managementComment) && (
              <div className="pt-2 border-t border-amber-200/70">
                <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
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
              className="mt-0.5 h-4 w-4 shrink-0 text-[#176c55]"
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
        <section className="overflow-hidden rounded border border-slate-300 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-[#f8f8ff] px-5 py-3.5">
            <LockKeyhole
              aria-hidden="true"
              className="h-4 w-4 text-slate-500"
            />
            <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-slate-700">
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
        <section className="overflow-hidden rounded border border-slate-300 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-[#edf5f1] px-5 py-3.5">
            <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-slate-800">
              Plan Identification & Classification
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Category Dropdown */}
            <fieldset className="max-w-2xl">
              <legend
                className={`mb-2 text-xs font-semibold ${
                  categoryError ? "text-red-600" : "text-slate-700"
                }`}
              >
                Procurement Category <span className="text-red-600">*</span>
              </legend>
              <div className="relative">
                <select
                  aria-invalid={categoryError}
                  aria-required="true"
                  className={`${compactFieldClasses} appearance-none pr-9`}
                  disabled={isEditing}
                  id="procurementCategory"
                  name="procurementCategory"
                  onChange={(event) =>
                    handleCategoryChange(
                      event.target.value as ProcurementCategory,
                    )
                  }
                  value={selectedCategory ?? ""}
                >
                  <option disabled value="">
                    Select category...
                  </option>
                  {procurementCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.value}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500"
                />
              </div>
              {categoryError ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                  <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  Please select a procurement category.
                </p>
              ) : null}
            </fieldset>

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
                placeholder="e.g. BREFONS - Goods Procurement Plan - 2018 EFY"
                value={form.planName}
              />
            </CompactFormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <CompactFormField
                errorMessage={
                  budgetYearError ? "Budget year is required." : undefined
                }
                htmlFor="budgetYear"
                label="Budget Year (EFY)"
                required
              >
                <input
                  className={compactFieldClasses}
                  id="budgetYear"
                  onChange={(event) =>
                    updateField("budgetYear", event.target.value)
                  }
                  placeholder="e.g. 2017"
                  value={form.budgetYear}
                />
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
        <section className="overflow-hidden rounded border border-slate-300 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-[#edf5f1] px-5 py-3.5">
            <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-slate-800">
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
                    className="min-h-24 w-full resize-y rounded-none border border-slate-400 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
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
          <section className="overflow-hidden rounded border border-amber-300 bg-amber-50/40 p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-700" />
              <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-amber-900">
                Revision Reason / Justification for Audit Trail
              </h2>
            </div>
            <textarea
              className="min-h-20 w-full resize-y rounded border border-amber-300 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
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
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              onClick={() => handleSubmit(null, "draft")}
              type="button"
            >
              {isEditing ? "Save Plan Changes" : "Save Draft"}
            </button>
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-[#125442] bg-[#176c55] px-4 text-xs font-medium text-white hover:bg-[#125f4c] cursor-pointer"
              onClick={() => handleSubmit(null, "activity")}
              type="button"
            >
              <Save aria-hidden="true" className="h-3.5 w-3.5" />
              {isEditing
                ? "Save & Go to Activities"
                : "Save & Add Procurement Activity"}
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
          <Link className="hover:text-[#176c55]" href={detailHref}>
            {project.shortName}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        {initialPlan ? (
          <>
            <li>
              <Link
                className="hover:text-[#176c55]"
                href={`/workspace/projects?project=${encodeURIComponent(
                  project.code,
                )}&plan=${encodeURIComponent(initialPlan.reference)}`}
              >
                {initialPlan.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-slate-800">
              {initialPlan.status === "Returned" || initialPlan.status === "Returned for Revision"
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
          className={`h-9 w-full truncate rounded-none border border-slate-400 bg-white px-2.5 text-xs text-slate-600 outline-none ${
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
  children,
  errorMessage,
  htmlFor,
  label,
  required = false,
}: {
  children: ReactNode;
  errorMessage?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  const error = Boolean(errorMessage);

  return (
    <div>
      <label
        className={`mb-2 block text-xs font-semibold ${
          error ? "text-red-600" : "text-slate-700"
        }`}
        htmlFor={htmlFor}
      >
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </label>
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
  return currency;
}
