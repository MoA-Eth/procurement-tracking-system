"use client";

import { useState } from "react";
import {
  Calendar,
  ChevronRight,
  FileText,
  Home,
  Info,
  Lock,
  Save,
  Send,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import type { ProjectItem } from "@/features/projects/management/projectsData";
import { DualCalendarInput } from "@/components/common/DualCalendarInput";
import {
  gregorianToEthiopian,
  formatEthiopianDate,
} from "@/features/projects/utils/ethiopianCalendar";
import {
  PLAN_CATEGORY_CHOICES,
  type PlanCategory,
  type PlanStatus,
  type ProcurementPlan,
} from "../plansData";
import { DualCalendarField } from "@/features/projects/components/DualCalendarField";
import type { UserRole } from "@/types";

interface CreatePlanFormProps {
  project: ProjectItem;
  initialData?: ProcurementPlan | null;
  userRole?: UserRole;
  readOnly?: boolean;
  onBackClick: () => void;
  onSavePlan: (plan: ProcurementPlan) => void;
}

const BUDGET_YEAR_OPTIONS = [
  "2018 EFY (2025/2026)",
  "2017 EFY (2024/2025)",
  "2019 EFY (2026/2027)",
];

const ORGANIZATION_REGION_OPTIONS = [
  "FPCU / Federal",
  "Oromia",
  "Somali",
  "Afar",
  "Southwest Ethiopia",
  "South Ethiopia",
  "Amhara",
  "Tigray",
  "Sidama",
  "Gambella",
  "Benishangul-Gumuz",
  "Dire Dawa",
  "Harari",
];

export function CreatePlanForm({
  project,
  initialData,
  userRole = "OFFICER",
  readOnly = false,
  onBackClick,
  onSavePlan,
}: CreatePlanFormProps) {
  const isDirector = userRole === "DIRECTOR";
  const isManagement = userRole === "MANAGEMENT";
  const isReviewer = isDirector || isManagement || readOnly;

  const [budgetYear, setBudgetYear] = useState(
    initialData?.budgetYear || project.budgetYear || "2018 EFY (2025/2026)",
  );
  const [category, setCategory] = useState<PlanCategory>(
    initialData?.category || "Goods",
  );
  const [planName, setPlanName] = useState(
    initialData?.planName ||
      `${project.code} - Goods Procurement Plan - 2018 EFY`,
  );
  const [planPeriodFrom, setPlanPeriodFrom] = useState(
    initialData?.planPeriodFrom || "2025-07-08",
  );
  const [planPeriodFromEthiopian, setPlanPeriodFromEthiopian] = useState("");
  const [planPeriodTo, setPlanPeriodTo] = useState(
    initialData?.planPeriodTo || "2026-07-07",
  );
  const [planPeriodToEthiopian, setPlanPeriodToEthiopian] = useState("");
  const [organizationRegion, setOrganizationRegion] = useState(
    initialData?.organizationRegion || project.region || "FPCU / Federal",
  );
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [generalNoticeDate, setGeneralNoticeDate] = useState(
    initialData?.generalNoticeDate || "",
  );
  const [generalNoticeDateEthiopian, setGeneralNoticeDateEthiopian] =
    useState("");
  const [status, setStatus] = useState<PlanStatus>(
    initialData?.status || "Draft",
  );

  const [dateError, setDateError] = useState<string | null>(null);
  const [revisionComment, setRevisionComment] = useState("");

  const handleCategoryChange = (newCategory: PlanCategory) => {
    setCategory(newCategory);
    if (!initialData && !isReviewer) {
      const yearShort = budgetYear.split(" ")[0] || "2018 EFY";
      setPlanName(
        `${project.code} - ${newCategory} Procurement Plan - ${yearShort}`,
      );
    }
  };

  const handleBudgetYearChange = (newYear: string) => {
    setBudgetYear(newYear);
    if (!initialData && !isReviewer) {
      const yearShort = newYear.split(" ")[0] || "2018 EFY";
      setPlanName(
        `${project.code} - ${category} Procurement Plan - ${yearShort}`,
      );
    }
  };

  // Is Director trying to view/edit a Draft plan?
  const isDraftPlanForDirector = isDirector && status === "Draft";

  const handleSaveWithStatus = (targetStatus?: PlanStatus) => {
    setDateError(null);

    if (new Date(planPeriodTo) <= new Date(planPeriodFrom)) {
      setDateError("Plan coverage end date must be after start date.");
      return;
    }

    const finalStatus = targetStatus || status;
    let finalDescription = description.trim();

    if (targetStatus === "Submitted to Director" && revisionComment.trim()) {
      const timeStamp = new Date().toLocaleDateString();
      finalDescription = finalDescription
        ? `${finalDescription}\n[Officer Revision (${timeStamp})]: ${revisionComment.trim()}`
        : `[Officer Revision (${timeStamp})]: ${revisionComment.trim()}`;
    }

    const savedPlan: ProcurementPlan = {
      id: initialData?.id || `plan-${Date.now()}`,
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      planName: planName.trim(),
      budgetYear,
      category,
      planPeriodFrom,
      planPeriodTo,
      organizationRegion,
      description: finalDescription || undefined,
      approvalDate:
        finalStatus === "Committee Review" || finalStatus === "Finally Approved"
          ? new Date().toISOString().split("T")[0]
          : initialData?.approvalDate,
      generalNoticeDate: generalNoticeDate.trim() || undefined,
      status: finalStatus,
      createdBy: initialData?.createdBy || "Procurement Officer",
      createdAt:
        initialData?.createdAt || new Date().toISOString().split("T")[0],
      activitiesCount: initialData?.activitiesCount || 0,
    };

    onSavePlan(savedPlan);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDraftPlanForDirector) return;
    handleSaveWithStatus();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200 pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={onBackClick}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {project.code} Plans
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-semibold text-[#0A3C2F]">
          {isManagement
            ? "Executive Plan Overview"
            : isDirector
              ? "Director Plan Review & Edits"
              : initialData
                ? "Edit Procurement Plan"
                : "Create Procurement Plan"}
        </span>
      </nav>

      {/* 1. Inherited Project Identity Header Context (Light Background) */}
      <section className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[#0A3C2F] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-[11px] font-semibold text-[#0A3C2F] uppercase tracking-wider block mb-0.5">
              Inherited Project Context (Locked)
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-slate-950 tracking-tight">
              {project.code} — {project.name}
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-500 font-medium">SAP ID:</span>{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {project.sapNumber || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">
                  Donor / Funding:
                </span>{" "}
                <span className="font-semibold text-slate-900">
                  {project.fundingSource}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">
                  Executing Agency:
                </span>{" "}
                <span className="font-semibold text-slate-900">
                  {project.executingAgency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Procurement Plan Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* RETURNED PLAN REVISION ALERT BANNER */}
        {!isReviewer &&
          (status === "Returned" || initialData?.status === "Returned") && (
            <div className="notice-card-clean space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <RotateCcw className="h-4 w-4 text-slate-600" />
                <span>Plan Returned for Revision</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                This procurement plan was returned by the Director or Management
                Committee for revision. Make your updates below, add your
                revision comments, and click{" "}
                <strong className="text-slate-900 font-semibold">
                  Resend to Director for Approval
                </strong>
                .
              </p>
            </div>
          )}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#0A3C2F]" />
              <h3 className="text-base font-semibold text-slate-900">
                Plan Identity & Scope
              </h3>
            </div>
            {isReviewer && (
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                {isManagement
                  ? "Executive View Mode"
                  : isDirector
                    ? "Restricted Director Controls"
                    : "Read Only View"}
              </span>
            )}
          </div>

          {/* Category Dropdown & Enforcement Notice */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs sm:text-sm font-semibold text-slate-800">
                Procurement Category <span className="text-rose-500">*</span>
              </label>
              {isReviewer && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Lock className="h-3 w-3" />{" "}
                  {isManagement
                    ? "Locked for Executive View"
                    : isDirector
                      ? "Locked for Director"
                      : "Locked"}
                </span>
              )}
            </div>
            <select
              value={category}
              onChange={(e) =>
                handleCategoryChange(e.target.value as PlanCategory)
              }
              disabled={readOnly || isReviewer || isDraftPlanForDirector}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                readOnly || isReviewer
                  ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium"
                  : "bg-white text-slate-900 border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
              }`}
              required
            >
              {PLAN_CATEGORY_CHOICES.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.description})
                </option>
              ))}
            </select>
          </div>

          {/* Plan Name */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Plan Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              disabled={readOnly || isDraftPlanForDirector}
              placeholder="e.g. BREFONS - Goods Procurement Plan - 2018 EFY"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                readOnly
                  ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium"
                  : "bg-white text-slate-900 border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
              }`}
              required
            />
          </div>

          {/* Grid: Budget Year & Organization/Region */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Budget / Fiscal Year */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-800">
                  Budget / Fiscal Year <span className="text-rose-500">*</span>
                </label>
                {isReviewer && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Lock className="h-3 w-3" /> Restricted
                  </span>
                )}
              </div>
              <select
                value={budgetYear}
                onChange={(e) => handleBudgetYearChange(e.target.value)}
                disabled={readOnly || isReviewer || isDraftPlanForDirector}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                  readOnly || isReviewer
                    ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium"
                    : "bg-white text-slate-900 border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
                }`}
                required
              >
                {BUDGET_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization / Region */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                Organization / Region <span className="text-rose-500">*</span>
              </label>
              <select
                value={organizationRegion}
                onChange={(e) => setOrganizationRegion(e.target.value)}
                disabled={readOnly || isDraftPlanForDirector}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                  readOnly
                    ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium"
                    : "bg-white text-slate-900 border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
                }`}
                required
              >
                {ORGANIZATION_REGION_OPTIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Plan Period From & To */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0A3C2F]" />
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                Plan Coverage Period <span className="text-rose-500">*</span>
              </label>
            </div>

            {dateError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {dateError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DualCalendarField
                id="create-plan-period-from"
                label="Plan Period From (Start Date)"
                gregorianValue={planPeriodFrom}
                ethiopianValue={planPeriodFromEthiopian}
                onChange={(greg, eth) => {
                  setPlanPeriodFrom(greg);
                  setPlanPeriodFromEthiopian(eth);
                }}
                disabled={readOnly || isDraftPlanForDirector}
                required={true}
              />

              <DualCalendarField
                id="create-plan-period-to"
                label="Plan Period To (End Date)"
                gregorianValue={planPeriodTo}
                ethiopianValue={planPeriodToEthiopian}
                onChange={(greg, eth) => {
                  setPlanPeriodTo(greg);
                  setPlanPeriodToEthiopian(eth);
                }}
                disabled={readOnly || isDraftPlanForDirector}
                required={true}
              />
            </div>
          </div>

          {/* General Notice Date & Workflow Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <DualCalendarField
                id="create-plan-general-notice-date"
                label="General Procurement Notice Date (Optional)"
                gregorianValue={generalNoticeDate}
                ethiopianValue={generalNoticeDateEthiopian}
                onChange={(greg, eth) => {
                  setGeneralNoticeDate(greg);
                  setGeneralNoticeDateEthiopian(eth);
                }}
                disabled={readOnly || isReviewer || isDraftPlanForDirector}
                required={false}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                Current Workflow Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanStatus)}
                disabled={readOnly || isReviewer || isDraftPlanForDirector}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                  readOnly || isReviewer
                    ? "bg-slate-100 text-slate-800 font-semibold border-slate-200 cursor-not-allowed"
                    : "bg-white text-slate-900 border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
                }`}
              >
                <option value="Draft">Draft</option>
                <option value="Submitted to Director">
                  Submitted to Director
                </option>
                <option value="Committee Review">Committee Review</option>
                <option value="Returned">Returned</option>
                <option value="Finally Approved">Finally Approved</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              Description / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly || isDraftPlanForDirector}
              placeholder="Plan-level notes, special coverage notes or donor guidelines..."
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                readOnly
                  ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium"
                  : "bg-white text-slate-900 border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]"
              }`}
            />
          </div>

          {/* Officer Revision Comment Box */}
          {!isReviewer &&
            (status === "Returned" || initialData?.status === "Returned") && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-[#0A3C2F]" />
                  <span>
                    Officer Revision Comment / Justification for Director{" "}
                    <span className="text-rose-600">*</span>
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="Explain the revisions made to address feedback before resending to the Director..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none transition-colors bg-white"
                />
              </div>
            )}

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onBackClick}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Back to Plans List
            </button>

            {!readOnly && !isManagement && !isDraftPlanForDirector && (
              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isDirector
                      ? "Save Edits"
                      : initialData
                        ? "Save Changes"
                        : "Create Procurement Plan"}
                  </span>
                </button>

                {!isReviewer &&
                  (status === "Returned" ||
                    initialData?.status === "Returned" ||
                    status === "Draft") && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveWithStatus("Submitted to Director")
                      }
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A3C2F] hover:bg-[#072F25] text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                      <span>
                        {status === "Returned" ||
                        initialData?.status === "Returned"
                          ? "Resend to Director for Approval"
                          : "Submit to Director"}
                      </span>
                    </button>
                  )}
              </div>
            )}
          </div>
        </section>
      </form>
    </div>
  );
}
