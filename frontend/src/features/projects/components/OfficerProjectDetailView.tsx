"use client";

import { useState } from "react";
import { StatusText } from "../../../components/dashboard/StatusText";
import type { OfficerProject } from "@/features/projects/data/officerProjects";
import {
  AlertCircle,
  Building2,
  CalendarRange,
  CheckCircle2,
  Download,
  FileText,
  HandCoins,
  Info,
  Landmark,
  MapPin,
  Plus,
  Send,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatGregorianDate } from "@/features/projects/utils/ethiopianCalendar";
import { exportProjectPlansToExcel } from "@/features/projects/utils/projectExcelUtils";
import { PlanExcelImportModal } from "@/features/projects/components/PlanExcelImportModal";
import type { ProcurementPlanSummary } from "@/features/projects/data/officerProjects";

function formatProjectPeriod(project: OfficerProject): string | undefined {
  const rawFrom = project.projectPeriod?.from?.trim();
  const rawTo = project.projectPeriod?.to?.trim();

  if (!rawFrom && !rawTo) return undefined;

  const formatDate = (dateStr: string) => {
    return formatGregorianDate(dateStr) || dateStr;
  };

  const from = rawFrom ? formatDate(rawFrom) : undefined;
  const to = rawTo ? formatDate(rawTo) : undefined;

  if (from && to) return `${from} - ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return undefined;
}

export function OfficerProjectDetailView({
  project,
  onImportPlans,
  onSubmitPlans,
}: {
  project: OfficerProject;
  onImportPlans?: (imported: ProcurementPlanSummary[]) => Promise<void> | void;
  onSubmitPlans?: (
    planReferences: string[],
    revisionReason?: string,
  ) => Promise<void> | void;
}) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPlanRefs, setSelectedPlanRefs] = useState<string[]>([]);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const isPlanEligible = (plan: ProcurementPlanSummary) => {
    const s = (plan.status || "").toLowerCase();
    const isDraftOrReturned =
      s === "draft" ||
      s === "returned" ||
      s === "returned for revision" ||
      s === "returned_for_revision";
    const actCount = plan.activities || plan.planActivities?.length || 0;
    return isDraftOrReturned && actCount > 0;
  };

  const eligiblePlans = project.plans.filter(isPlanEligible);
  const isAllEligibleSelected =
    eligiblePlans.length > 0 &&
    eligiblePlans.every((p) => selectedPlanRefs.includes(p.reference));

  const handleToggleSelectAll = () => {
    if (isAllEligibleSelected) {
      setSelectedPlanRefs([]);
    } else {
      setSelectedPlanRefs(eligiblePlans.map((p) => p.reference));
    }
  };

  const handleTogglePlan = (ref: string) => {
    setSelectedPlanRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref],
    );
  };

  const handleConfirmBatchSubmit = async () => {
    if (!onSubmitPlans || selectedPlanRefs.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      await onSubmitPlans(selectedPlanRefs, revisionNotes.trim() || undefined);
      setSubmitSuccess(
        `Successfully submitted ${selectedPlanRefs.length} ${
          selectedPlanRefs.length === 1 ? "plan" : "plans"
        } to the Director for review!`,
      );
      setSelectedPlanRefs([]);
      setIsSubmitModalOpen(false);
      setRevisionNotes("");
    } catch (err: any) {
      setSubmitError(
        err?.message ||
          "Failed to submit selected plans. Please check your network and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const overviewFacts: Array<{
    icon: typeof Info;
    label: string;
    value?: string;
  }> = [
    {
      icon: MapPin,
      label: "Country / organisation",
      value: project.countryOrganisation,
    },
    {
      icon: Building2,
      label: "Executing agency",
      value: project.executingAgency,
    },
    {
      icon: Landmark,
      label: "Funding source",
      value: project.fundingSource,
    },
    {
      icon: HandCoins,
      label: "Funding type",
      value: project.fundingType,
    },
    {
      icon: Building2,
      label: "Organization / region",
      value: project.organizationRegion,
    },
    {
      icon: CalendarRange,
      label: "Project period",
      value: formatProjectPeriod(project),
    },
    {
      icon: UserRound,
      label: "Assigned officers",
      value: project.assignedOfficers.filter(Boolean).join(", "),
    },
    {
      icon: FileText,
      label: "SAP / identification no.",
      value: project.sapIdentificationNumber,
    },
  ];
  const visibleOverviewFacts = overviewFacts.filter(
    (fact): fact is (typeof overviewFacts)[number] & { value: string } =>
      Boolean(fact.value?.trim()),
  );
  const supportingFacts = [
    {
      label: "Financing no.",
      value: project.financingNumbers?.filter(Boolean).join(", "),
    },
    { label: "Base currency", value: project.baseCurrency },
    {
      label: "Components",
      value: project.components?.filter(Boolean).join(", "),
    },
    {
      label: "Subcomponents",
      value: project.subcomponents?.filter(Boolean).join(", "),
    },
  ].filter((fact): fact is { label: string; value: string } =>
    Boolean(fact.value?.trim()),
  );

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <header className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link className="hover:text-[#0A3C2F]" href="/dashboard/officer">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li>
              <Link className="hover:text-[#0A3C2F]" href="/workspace/projects">
                Assigned Projects
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li aria-current="page" className="font-semibold text-slate-800">
              {project.shortName} Details
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#10243f]">
                {project.name}
              </h1>
              <StatusText className="text-xs" label={project.status} />
            </div>
            <div className="mt-2">
              <span className="inline-block rounded-md bg-slate-100/90 px-2.5 py-1 font-mono text-xs font-medium text-slate-800 border border-slate-200/80">
                {project.code}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
              onClick={() => exportProjectPlansToExcel(project)}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export Excel
            </button>

            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
              onClick={() => setIsImportModalOpen(true)}
              type="button"
            >
              <Upload aria-hidden="true" className="h-4 w-4" />
              Import Excel
            </button>

            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#0A3C2F] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#083025] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F] transition"
              href={`/workspace/projects?project=${encodeURIComponent(
                project.code,
              )}&mode=create-plan`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create Plan
            </Link>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <Info aria-hidden="true" className="h-4.5 w-4.5 text-[#0A3C2F]" />
          <h2 className="font-semibold text-[#16253d]">Project Overview</h2>
        </div>

        <div className="grid gap-x-7 gap-y-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {visibleOverviewFacts.map((fact) => (
            <ProjectFact
              icon={fact.icon}
              key={fact.label}
              label={fact.label}
              value={fact.value}
            />
          ))}
        </div>

        {supportingFacts.length > 0 ? (
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-200 bg-[#fbfcfd] px-5 py-3 text-xs text-slate-600">
            {supportingFacts.map((fact) => (
              <p key={fact.label}>
                <span className="font-semibold text-slate-700">
                  {fact.label}:
                </span>{" "}
                {fact.value}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── BATCH SUBMIT SUCCESS NOTIFICATION ─────────────────────── */}
      {submitSuccess && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-xs animate-in fade-in"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1 space-y-1">
            <h3 className="text-xs font-semibold text-emerald-950">
              Plans Submitted for Director Review
            </h3>
            <p className="text-xs leading-relaxed text-emerald-800">
              {submitSuccess}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="min-h-104 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText
              aria-hidden="true"
              className="h-4.5 w-4.5 text-[#0A3C2F]"
            />
            <h2 className="font-semibold text-[#16253d]">Procurement Plans</h2>
          </div>
          <div className="flex items-center gap-2.5">
            {selectedPlanRefs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setIsSubmitModalOpen(true);
                }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#0A3C2F] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  Submit Selected for Review ({selectedPlanRefs.length})
                </span>
              </button>
            )}
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
              {project.plans.length} plans
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-208 border-collapse text-left">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="w-12 px-3.5 py-3.5 text-center" scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all eligible plans"
                    checked={isAllEligibleSelected}
                    onChange={handleToggleSelectAll}
                    disabled={eligiblePlans.length === 0}
                    className="h-4 w-4 rounded border-slate-300 text-[#0A3C2F] focus:ring-[#0A3C2F] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </th>
                <th className="w-[34%] px-5 py-3.5" scope="col">
                  Plan name / reference
                </th>
                <th className="w-[12%] px-5 py-3.5" scope="col">
                  Fiscal year
                </th>
                <th className="w-[25%] px-5 py-3.5" scope="col">
                  Category
                </th>
                <th className="w-[10%] px-5 py-3.5 text-center" scope="col">
                  Activities
                </th>
                <th className="w-[15%] px-5 py-3.5" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {project.plans.map((plan) => {
                const eligible = isPlanEligible(plan);
                const isSelected = selectedPlanRefs.includes(plan.reference);
                const s = (plan.status || "").toLowerCase();
                const isDraftOrReturned =
                  s === "draft" ||
                  s === "returned" ||
                  s === "returned for revision" ||
                  s === "returned_for_revision";
                const actCount =
                  plan.activities || plan.planActivities?.length || 0;
                const disableReason = !isDraftOrReturned
                  ? `Plan status is "${plan.status}" (already under review or approved)`
                  : actCount === 0
                    ? "Add at least 1 activity before submitting"
                    : "";

                return (
                  <tr
                    key={plan.reference}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    <td className="w-12 px-3.5 py-4 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Select plan ${plan.name}`}
                        checked={isSelected}
                        disabled={!eligible}
                        title={disableReason || undefined}
                        onChange={() => handleTogglePlan(plan.reference)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0A3C2F] focus:ring-[#0A3C2F] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-[#1261a8] underline-offset-4 hover:text-[#0A3C2F] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F]"
                        href={`/workspace/projects?project=${encodeURIComponent(
                          project.code,
                        )}&plan=${encodeURIComponent(plan.reference)}`}
                      >
                        {plan.name}
                      </Link>
                      <Link
                        aria-label={`Open ${plan.name}`}
                        className="mt-1 block w-fit font-mono text-[11px] font-medium text-slate-500 hover:text-[#0A3C2F]"
                        href={`/workspace/projects?project=${encodeURIComponent(
                          project.code,
                        )}&plan=${encodeURIComponent(plan.reference)}`}
                      >
                        {plan.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {plan.budgetYear}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-slate-700">
                        {plan.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm font-semibold text-slate-800">
                      {plan.activities}
                    </td>
                    <td className="px-5 py-4">
                      <StatusText className="text-xs" label={plan.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── BATCH SUBMISSION MODAL ── */}
      {isSubmitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <Send className="h-4.5 w-4.5 text-[#0A3C2F]" />
                <h3 className="font-semibold text-[#16253d] text-base">
                  Submit Plans for Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {submitError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <p>{submitError}</p>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to submit the following{" "}
                <strong className="text-slate-800 font-semibold">
                  {selectedPlanRefs.length}{" "}
                  {selectedPlanRefs.length === 1 ? "plan" : "plans"}
                </strong>{" "}
                from project{" "}
                <strong className="text-slate-800 font-semibold">
                  {project.name}
                </strong>{" "}
                to the Procurement Director for formal review.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 divide-y divide-slate-200/80">
                {selectedPlanRefs.map((ref) => {
                  const p = project.plans.find(
                    (item) => item.reference === ref,
                  );
                  if (!p) return null;
                  return (
                    <div
                      key={ref}
                      className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-slate-800 truncate">
                          {p.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          {p.reference} • {p.category}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                        {p.activities || p.planActivities?.length || 0}{" "}
                        activities
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedPlanRefs.some((ref) => {
                const p = project.plans.find((item) => item.reference === ref);
                const s = (p?.status || "").toLowerCase();
                return s.includes("returned");
              }) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Resubmission / Revision Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Describe the adjustments made to address the Director's feedback..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-[#0A3C2F] focus:outline-none focus:ring-1 focus:ring-[#0A3C2F]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBatchSubmit}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#0A3C2F] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PlanExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(imported) => {
          void onImportPlans?.(imported);
        }}
        projectCode={project.code}
        projectName={project.name}
      />
    </div>
  );
}

function ProjectFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Info;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#0A3C2F]" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-slate-800">
        {value}
      </p>
    </div>
  );
}
