"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Home,
  Info,
  Lock,
  ListChecks,
  Save,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ProjectItem } from "@/features/projects/management/projectsData";
import type { PlanCategory, ProcurementPlan } from "../plansData";
import type { UserRole } from "@/types";

interface ProjectPlansViewProps {
  project: ProjectItem;
  plans: ProcurementPlan[];
  userRole?: UserRole;
  onBackToProjects: () => void;
  onCreatePlanClick?: () => void;
  onEditPlanClick?: (plan: ProcurementPlan) => void;
  onViewActivitiesClick: (plan: ProcurementPlan) => void;
}

const CATEGORY_BADGES: Record<
  PlanCategory,
  { bg: string; text: string; border: string }
> = {
  Goods: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  Works: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  "Non-Consulting Services": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  "Consultancy Services": {
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  Draft: { bg: "bg-slate-100", text: "text-slate-700" },
  "Submitted to Director": { bg: "bg-blue-100", text: "text-blue-800" },
  "Committee Review": { bg: "bg-purple-100", text: "text-purple-800" },
  Returned: { bg: "bg-rose-100", text: "text-rose-800" },
  "Finally Approved": { bg: "bg-emerald-100", text: "text-emerald-800" },
};

export function ProjectPlansView({
  project,
  plans,
  onBackToProjects,
  onViewActivitiesClick,
}: ProjectPlansViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [readOnlyPlan, setReadOnlyPlan] = useState<ProcurementPlan | null>(
    null,
  );

  // Editable Form States for Director Plan Review & Edits page
  const [editablePlanName, setEditablePlanName] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [editableBudgetYear, setEditableBudgetYear] = useState("");
  const [editableRegion, setEditableRegion] = useState("");
  const [editablePeriodFrom, setEditablePeriodFrom] = useState("");
  const [editablePeriodTo, setEditablePeriodTo] = useState("");
  const [editableNoticeDate, setEditableNoticeDate] = useState("");

  const handleOpenPlanDetail = (plan: ProcurementPlan) => {
    setReadOnlyPlan(plan);
    setEditablePlanName(plan.planName);
    setEditableDescription(plan.description || "");
    setEditableBudgetYear(plan.budgetYear);
    setEditableRegion(plan.organizationRegion);
    setEditablePeriodFrom(plan.planPeriodFrom);
    setEditablePeriodTo(plan.planPeriodTo);
    setEditableNoticeDate(plan.generalNoticeDate || "10-Jul-2025");
  };

  // Filter plans under this project
  const projectPlans = plans.filter(
    (p) =>
      p.projectId === project.id ||
      p.projectCode === project.code ||
      p.projectId === project.code ||
      (p.projectCode &&
        project.id &&
        p.projectCode.toLowerCase() === project.id.toLowerCase()),
  );

  const filteredPlans = projectPlans.filter((plan) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      plan.planName.toLowerCase().includes(q) ||
      plan.budgetYear.toLowerCase().includes(q) ||
      plan.organizationRegion.toLowerCase().includes(q) ||
      plan.category.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "All Categories" || plan.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All Statuses" || plan.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // FULL PAGE VIEW: DIRECTOR PLAN REVIEW (Strictly Read-Only, Matching Screenshot 1-to-1)
  if (readOnlyPlan) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-10">
        {/* 1. Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs"
        >
          <Link
            href="/dashboard"
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <button
            onClick={onBackToProjects}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Projects Directory
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <button
            onClick={() => setReadOnlyPlan(null)}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {project.code} Plans
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-[#0A3C2F]">Director Plan Review</span>
        </nav>

        {/* 2. Top Inherited Project Context Banner (Locked) */}
        <div className="rounded-2xl border border-[#BCE3D6] bg-[#EAF5F1] p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[#0B5C43] font-bold text-xs uppercase tracking-wider">
            <Info className="h-4 w-4 text-[#0B5C43]" />
            <span>INHERITED PROJECT CONTEXT (LOCKED)</span>
          </div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight leading-snug">
            {project.code} — {project.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-600">
            <span>
              SAP ID:{" "}
              <strong className="text-slate-900 font-mono">
                {project.sapNumber || "P-Z1-C00-080"}
              </strong>
            </span>
            <span>
              Donor / Funding:{" "}
              <strong className="text-slate-900">
                {project.fundingSource || "African Development Bank (AfDB)"}
              </strong>
            </span>
            <span>
              Executing Agency:{" "}
              <strong className="text-slate-900">
                {project.executingAgency || "Ministry of Agriculture (MoA)"}
              </strong>
            </span>
          </div>
        </div>

        {/* 3. Main Form Card: Plan Identity & Scope */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0B5C43]" />
              <h2 className="text-base font-extrabold text-slate-900">
                Plan Identity & Scope
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Restricted Director Controls</span>
            </div>
          </div>

          <div className="space-y-5 text-xs">
            {/* Procurement Category */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">
                  Procurement Category <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked for Director
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>
                  {readOnlyPlan.category} (Physical items and supplies)
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
              </div>

              {/* Category Examples Note Box */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 space-y-1.5 text-slate-600">
                <p className="font-bold text-slate-700">
                  Goods Category Examples:
                </p>
                <p>
                  Uniform, stationery, toners, vehicles, ICT equipment,
                  laboratory equipment
                </p>
                <div className="flex items-center gap-1 text-emerald-800 font-bold pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    Activities created inside this Plan strictly inherit this
                    category.
                  </span>
                </div>
              </div>
            </div>

            {/* Plan Name (Strictly Readonly) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Plan Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                readOnly
                value={readOnlyPlan.planName}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-xs font-extrabold text-slate-900 outline-none"
              />
            </div>

            {/* Budget / Fiscal Year & Organization / Region */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Budget / Fiscal Year{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Restricted
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 font-semibold text-slate-800 flex items-center justify-between">
                  <span>{readOnlyPlan.budgetYear}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Organization / Region <span className="text-rose-500">*</span>
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 font-semibold text-slate-800 flex items-center justify-between">
                  <span>{readOnlyPlan.organizationRegion}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                </div>
              </div>
            </div>

            {/* Plan Coverage Period */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Plan Coverage Period <span className="text-rose-500">*</span>
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                    Plan Period From (Start Date)
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={readOnlyPlan.planPeriodFrom}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                    Plan Period To (End Date)
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={readOnlyPlan.planPeriodTo}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* General Procurement Notice Date & Current Workflow Status */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  General Procurement Notice Date (Optional)
                </label>
                <input
                  type="text"
                  readOnly
                  value={readOnlyPlan.generalNoticeDate || "10-Jul-2025"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Current Workflow Status
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-3 font-extrabold text-[#0B5C43] flex items-center justify-between">
                  <span>{readOnlyPlan.status}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                </div>
              </div>
            </div>

            {/* Description / Remarks (Optional) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Description / Remarks (Optional)
              </label>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-semibold text-slate-800 leading-relaxed">
                {readOnlyPlan.description ||
                  "Procurement plan for vehicles, seed treating machines, and field laboratory equipment under BREFONS."}
              </div>
            </div>
          </div>

          {/* Footer Action Buttons (Only Back Button, Save Edits Removed) */}
          <div className="flex items-center justify-start pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setReadOnlyPlan(null)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Back to Plans List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={onBackToProjects}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Projects Directory
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="font-bold text-[#0A3C2F] max-w-xs truncate">
          {project.code} Plans
        </span>
      </nav>

      <div>
        <button
          onClick={onBackToProjects}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects Directory
        </button>
      </div>

      {/* 2. Page Title Header Section */}
      <div className="space-y-3 pb-2 border-b border-slate-200/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono font-extrabold text-xs px-3 py-1 rounded-lg bg-[#0A3C2F] text-[#A3E635] border border-[#125241] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635]" />
            {project.code}
          </span>
          {project.sapNumber && (
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
              SAP: {project.sapNumber}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight wrap-break-word">
          {project.name}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
          <span>
            Donor:{" "}
            <strong className="text-slate-800 font-semibold">
              {project.fundingSource}
            </strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Agency:{" "}
            <strong className="text-slate-800 font-semibold">
              {project.executingAgency}
            </strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Region:{" "}
            <strong className="text-slate-800 font-semibold">
              {project.region}
            </strong>
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans by name, category, region, budget year..."
            className="w-full rounded-xl bg-slate-50/80 border border-slate-200/90 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl bg-slate-50/80 border border-slate-200/90 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer"
          >
            <option value="All Categories">All Plan Categories</option>
            <option value="Goods">Goods</option>
            <option value="Works">Works</option>
            <option value="Non-Consulting Services">
              Non-Consulting Services
            </option>
            <option value="Consultancy Services">Consultancy Services</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-50/80 border border-slate-200/90 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer"
          >
            <option value="All Statuses">All Plan Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted to Director">Submitted to Director</option>
            <option value="Committee Review">Committee Review</option>
            <option value="Returned">Returned</option>
            <option value="Finally Approved">Finally Approved</option>
          </select>
        </div>
      </div>

      {/* 4. Tabular View of Procurement Plans */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1080px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-3.5 text-center w-12">#</th>
                <th className="py-3.5 px-3.5 min-w-64 max-w-80">Plan Name</th>
                <th className="py-3.5 px-3.5 w-36">Category</th>
                <th className="py-3.5 px-3.5 w-28">Budget Year</th>
                <th className="py-3.5 px-3.5 w-44">Coverage Period</th>
                <th className="py-3.5 px-3.5 w-36">Region / Unit</th>
                <th className="py-3.5 px-3.5 w-40">Notice / Approval</th>
                <th className="py-3.5 px-3.5 text-center w-36">Status</th>
                <th className="py-3.5 px-3.5 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">
                      No procurement plans found for this project
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &quot;Create Procurement Plan&quot; to add a new
                      plan for {project.code}.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan, index) => {
                  const catStyle =
                    CATEGORY_BADGES[plan.category] || CATEGORY_BADGES.Goods;
                  const statusStyle =
                    STATUS_BADGES[plan.status] || STATUS_BADGES.Draft;

                  return (
                    <tr
                      key={plan.id}
                      onClick={() => onViewActivitiesClick(plan)}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Index */}
                      <td className="py-3 px-3.5 font-mono text-slate-400 font-semibold text-center">
                        {index + 1}
                      </td>

                      {/* Plan Name */}
                      <td className="py-3 px-3.5 min-w-64 max-w-80 wrap-break-word">
                        <p className="font-bold text-slate-900 text-xs leading-snug group-hover:text-[#0A3C2F] wrap-break-word">
                          {plan.planName}
                        </p>
                        {plan.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug wrap-break-word line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
                        >
                          {plan.category}
                        </span>
                      </td>

                      {/* Budget Year */}
                      <td className="py-3 px-3.5 font-semibold text-slate-800 text-xs">
                        {plan.budgetYear}
                      </td>

                      {/* Coverage Period */}
                      <td className="py-3 px-3.5 text-slate-600 text-xs whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div>
                            <span className="text-slate-400 font-medium">
                              From:
                            </span>{" "}
                            <span className="font-semibold text-slate-800">
                              {plan.planPeriodFrom || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">
                              To:
                            </span>{" "}
                            <span className="font-semibold text-slate-800">
                              {plan.planPeriodTo || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Organization / Region */}
                      <td className="py-3 px-3.5 font-semibold text-slate-800 text-xs">
                        {plan.organizationRegion}
                      </td>

                      {/* Notice / Approval Dates */}
                      <td className="py-3 px-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {plan.approvalDate ? (
                          <p className="text-emerald-700 font-semibold text-[11px]">
                            Approved: {plan.approvalDate}
                          </p>
                        ) : (
                          <p className="text-slate-400 text-[11px]">
                            Pending Approval
                          </p>
                        )}
                        {plan.generalNoticeDate && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Notice: {plan.generalNoticeDate}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            plan.status === "Submitted to Director"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : plan.status === "Committee Review"
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : plan.status === "Returned"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : plan.status === "Finally Approved"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {/* View Read-Only Plan Details Page Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPlanDetail(plan);
                          }}
                          title="View Plan Review Page"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0A3C2F] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs mx-auto"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
