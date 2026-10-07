"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  History,
  Home,
  Layers,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ProcurementPlan } from "../../plansData";
import { VersionHistoryModal } from "../VersionHistoryModal";
import { CommitteeDeadlineModal } from "./CommitteeDeadlineModal";
import { PlanBatchReviewModal } from "./PlanBatchReviewModal";
import { StatusText } from "@/components/dashboard/StatusText";
import type { ProjectItem } from "@/features/projects/management/projectsData";

export interface PlanReviewDirectoryTableProps {
  userRole?: string;
  toastMessage: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  budgetYearFilter: string;
  setBudgetYearFilter: (yr: string) => void;
  regionFilter: string;
  setRegionFilter: (reg: string) => void;
  filteredPlans: ProcurementPlan[];
  allPlans?: ProcurementPlan[];
  selectedProjectCode?: string | null;
  onSelectProject?: (projectCode: string | null) => void;
  loading: boolean;
  onSelectPlan: (plan: ProcurementPlan) => void;
  historyModalPlan: ProcurementPlan | null;
  setHistoryModalPlan: (plan: ProcurementPlan | null) => void;
  pendingApprovePlan: ProcurementPlan | null;
  setPendingApprovePlan: (plan: ProcurementPlan | null) => void;
  committeeDeadlineDate: string;
  setCommitteeDeadlineDate: (date: string) => void;
  onApprovePlan: (plan: ProcurementPlan, deadline?: string) => void;
  onReturnPlan?: (plan: ProcurementPlan, remarks?: string) => void;
  onBatchReviewPlans?: (data: {
    approvedPlanIds: string[];
    unapprovedComments: Record<string, string>;
    deadlineDate?: string;
  }) => Promise<void> | void;
  getProjectForPlan?: (projectCode: string) => ProjectItem;
}

export function PlanReviewDirectoryTable({
  userRole,
  toastMessage,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  budgetYearFilter,
  setBudgetYearFilter,
  regionFilter,
  setRegionFilter,
  filteredPlans,
  allPlans = [],
  selectedProjectCode = null,
  onSelectProject,
  loading,
  onSelectPlan,
  historyModalPlan,
  setHistoryModalPlan,
  pendingApprovePlan,
  setPendingApprovePlan,
  committeeDeadlineDate,
  setCommitteeDeadlineDate,
  onApprovePlan,
  onReturnPlan,
  onBatchReviewPlans,
  getProjectForPlan,
}: PlanReviewDirectoryTableProps) {
  // Tabs within project view
  const [activeTab, setActiveTab] = useState<
    "AWAITING_REVIEW" | "PREVIOUSLY_APPROVED" | "RETURNED"
  >("AWAITING_REVIEW");

  // Multi-selection within project review
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<"ALL" | "SELECTED">(
    "SELECTED",
  );

  // Single plan return modal
  const [singleReturnModalPlan, setSingleReturnModalPlan] =
    useState<ProcurementPlan | null>(null);
  const [singleReturnFeedback, setSingleReturnFeedback] = useState("");
  const [isReturningSingle, setIsReturningSingle] = useState(false);

  // Fallback plans source
  const effectiveAllPlans = allPlans.length > 0 ? allPlans : filteredPlans;

  // Build Project Groups
  const projectGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        projectCode: string;
        projectName: string;
        executingAgency: string;
        organizationRegion: string;
        pendingPlans: ProcurementPlan[];
        approvedPlans: ProcurementPlan[];
        returnedPlans: ProcurementPlan[];
        allProjectPlans: ProcurementPlan[];
      }
    >();

    effectiveAllPlans.forEach((plan) => {
      const code = plan.projectCode || "GENERAL";
      if (!map.has(code)) {
        const projMeta = getProjectForPlan?.(code);
        map.set(code, {
          projectCode: code,
          projectName: projMeta?.name || plan.projectName || `${code} Project`,
          executingAgency:
            projMeta?.executingAgency || "Ministry of Agriculture (MoA)",
          organizationRegion:
            plan.organizationRegion || projMeta?.region || "Federal / FPCU",
          pendingPlans: [],
          approvedPlans: [],
          returnedPlans: [],
          allProjectPlans: [],
        });
      }

      const grp = map.get(code)!;
      grp.allProjectPlans.push(plan);

      const s = (plan.status || "").toLowerCase();
      const rawS = ((plan as any).status || "").toLowerCase();

      // Check if plan is awaiting review for this role
      const isPending = filteredPlans.some((fp) => fp.id === plan.id);
      if (isPending) {
        grp.pendingPlans.push(plan);
      } else if (
        s.includes("committee") ||
        s.includes("approved") ||
        rawS === "with_committee" ||
        rawS === "committee_endorsed" ||
        rawS === "management_approved"
      ) {
        grp.approvedPlans.push(plan);
      } else if (
        s.includes("returned") ||
        rawS === "returned_for_revision" ||
        rawS === "rejected" ||
        rawS === "committee_rejected"
      ) {
        grp.returnedPlans.push(plan);
      }
    });

    return Array.from(map.values());
  }, [effectiveAllPlans, filteredPlans, getProjectForPlan]);

  // Filter project groups by search & filters
  const filteredProjectGroups = useMemo(() => {
    return projectGroups.filter((grp) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        grp.projectCode.toLowerCase().includes(q) ||
        grp.projectName.toLowerCase().includes(q) ||
        grp.allProjectPlans.some((p) => p.planName.toLowerCase().includes(q));

      const matchesRegion =
        regionFilter === "ALL" ||
        grp.organizationRegion
          .toLowerCase()
          .includes(regionFilter.toLowerCase());

      const matchesCategory =
        categoryFilter === "ALL" ||
        grp.allProjectPlans.some((p) => p.category === categoryFilter);

      const matchesBudgetYear =
        budgetYearFilter === "ALL" ||
        grp.allProjectPlans.some((p) =>
          p.budgetYear.includes(budgetYearFilter),
        );

      return (
        matchesSearch && matchesRegion && matchesCategory && matchesBudgetYear
      );
    });
  }, [
    projectGroups,
    searchTerm,
    regionFilter,
    categoryFilter,
    budgetYearFilter,
  ]);

  // If a project is selected, get its data
  const currentProjectGroup = useMemo(() => {
    if (!selectedProjectCode) return null;
    return (
      projectGroups.find(
        (g) =>
          g.projectCode.toLowerCase() === selectedProjectCode.toLowerCase(),
      ) || null
    );
  }, [projectGroups, selectedProjectCode]);

  // Current project's plans
  const currentPendingPlans = currentProjectGroup?.pendingPlans || [];
  const currentApprovedPlans = currentProjectGroup?.approvedPlans || [];
  const currentReturnedPlans = currentProjectGroup?.returnedPlans || [];

  // Toggle selection
  const isAllPendingSelected =
    currentPendingPlans.length > 0 &&
    currentPendingPlans.every((p) => selectedPlanIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllPendingSelected) {
      setSelectedPlanIds([]);
    } else {
      setSelectedPlanIds(currentPendingPlans.map((p) => p.id));
    }
  };

  const handleTogglePlan = (id: string) => {
    setSelectedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // Open batch approve modal
  const handleOpenApproveAll = () => {
    setSelectedPlanIds(currentPendingPlans.map((p) => p.id));
    setBatchActionType("ALL");
    setIsBatchModalOpen(true);
  };

  const handleOpenApproveSelected = () => {
    setBatchActionType("SELECTED");
    setIsBatchModalOpen(true);
  };

  const handleBatchConfirm = async (data: {
    approvedPlanIds: string[];
    unapprovedComments: Record<string, string>;
    deadlineDate: string;
  }) => {
    if (onBatchReviewPlans) {
      await onBatchReviewPlans(data);
    }
    setSelectedPlanIds([]);
    setIsBatchModalOpen(false);
  };

  // Single plan return
  const handleConfirmSingleReturn = async () => {
    if (!singleReturnModalPlan || !onReturnPlan) return;
    setIsReturningSingle(true);
    try {
      await onReturnPlan(singleReturnModalPlan, singleReturnFeedback.trim());
      setSingleReturnModalPlan(null);
      setSingleReturnFeedback("");
    } finally {
      setIsReturningSingle(false);
    }
  };

  // Plans to approve / return in batch modal
  const batchSelectedPlans = currentPendingPlans.filter((p) =>
    selectedPlanIds.includes(p.id),
  );
  const batchUnselectedPlans = currentPendingPlans.filter(
    (p) => !selectedPlanIds.includes(p.id),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-700 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{toastMessage}</p>
        </div>
      )}

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
          type="button"
          onClick={() => onSelectProject?.(null)}
          className={`hover:text-[#0A3C2F] transition-colors ${
            selectedProjectCode
              ? "text-slate-500 hover:underline cursor-pointer"
              : "font-semibold text-[#0A3C2F]"
          }`}
        >
          {userRole === "ENDORSING_COMMITTEE"
            ? "Committee Plans for Review"
            : userRole === "MANAGEMENT"
              ? "Management Executive Review"
              : "Plans for Review"}
        </button>
        {selectedProjectCode && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-[#0A3C2F]">
              {currentProjectGroup?.projectName || selectedProjectCode}
            </span>
          </>
        )}
      </nav>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP DIRECTORY VIEW: PROJECTS LIST (WHEN NO PROJECT SELECTED) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!selectedProjectCode ? (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {userRole === "ENDORSING_COMMITTEE"
                  ? "Endorsement Committee — Projects for Review"
                  : userRole === "MANAGEMENT"
                    ? "Executive Management — Projects for Review"
                    : "Director — Projects for Review"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Select an assigned project below to review and decide on its
                submitted procurement plans.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Project Name, Code, or Plan..."
                className="w-full pl-10 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-[#0A3C2F] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Goods">Goods</option>
                  <option value="Works">Works</option>
                  <option value="Non-Consultancy Services">
                    Non-Consultancy Services
                  </option>
                  <option value="Consultancy Services">
                    Consultancy Services
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <select
                  value={budgetYearFilter}
                  onChange={(e) => setBudgetYearFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Fiscal Years</option>
                  <option value="2018 EFY">2018 EFY</option>
                  <option value="2017 EFY">2017 EFY</option>
                  <option value="2019 EFY">2019 EFY</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Regions / Units</option>
                  <option value="FPCU / Federal">FPCU / Federal</option>
                  <option value="Oromia">Oromia</option>
                  <option value="Somali">Somali</option>
                  <option value="Afar">Afar</option>
                  <option value="Amhara">Amhara</option>
                  <option value="Tigray">Tigray</option>
                </select>
              </div>
            </div>
          </div>

          {/* Projects Directory Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">#</th>
                    <th className="py-3.5 px-4 w-36">Project Code</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Project Name</th>
                    <th className="py-3.5 px-4 w-48">Executing Agency</th>
                    <th className="py-3.5 px-4 w-36">Region / Unit</th>
                    <th className="py-3.5 px-4 text-center w-44">
                      Awaiting Review
                    </th>
                    <th className="py-3.5 px-4 text-center w-48">
                      Approved / Returned
                    </th>
                    <th className="py-3.5 px-4 text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-500 font-medium"
                      >
                        Loading projects and plans from server...
                      </td>
                    </tr>
                  ) : filteredProjectGroups.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-500"
                      >
                        <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                          No projects with procurement plans awaiting review
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Plans submitted by Procurement Officers will appear
                          here grouped by project.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProjectGroups.map((group, index) => {
                      const hasPending = group.pendingPlans.length > 0;
                      return (
                        <tr
                          key={group.projectCode}
                          onClick={() => onSelectProject?.(group.projectCode)}
                          className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-400 font-semibold text-center">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-medium text-[#0A3C2F] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-xs inline-block">
                              {group.projectCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900 group-hover:text-[#0A3C2F] transition-colors">
                              {group.projectName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {group.allProjectPlans.length} total procurement
                              plans
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {group.executingAgency}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {group.organizationRegion}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {hasPending ? (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 font-medium px-2.5 py-1 rounded-md text-xs border border-amber-200">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                {group.pendingPlans.length}{" "}
                                {group.pendingPlans.length === 1
                                  ? "Plan Awaiting"
                                  : "Plans Awaiting"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                                None Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                                ✓ {group.approvedPlans.length} Approved
                              </span>
                              {group.returnedPlans.length > 0 && (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                                  ↩ {group.returnedPlans.length} Returned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProject?.(group.projectCode);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A3C2F] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer"
                            >
                              <span>Enter Project</span>
                              <ChevronRight className="h-3.5 w-3.5" />
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
      ) : (
        /* ──────────────────────────────────────────────────────────── */
        /* 2. PROJECT DETAIL VIEW: PLANS FOR REVIEW WITHIN THIS PROJECT */
        /* ──────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Project Header Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onSelectProject?.(null)}
                  className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 transition cursor-pointer mt-0.5"
                  title="Return to Projects List"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl font-bold text-slate-900">
                      {currentProjectGroup?.projectName || selectedProjectCode}
                    </h1>
                    <span className="font-mono text-xs font-medium bg-emerald-50 text-[#0A3C2F] border border-emerald-200 px-2.5 py-0.5 rounded-md">
                      {selectedProjectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentProjectGroup?.executingAgency} •{" "}
                    {currentProjectGroup?.organizationRegion}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectProject?.(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A3C2F] transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to All Projects</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab("AWAITING_REVIEW")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === "AWAITING_REVIEW"
                    ? "bg-[#0A3C2F] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Plans Awaiting Review</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "AWAITING_REVIEW"
                      ? "bg-white/20 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {currentPendingPlans.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PREVIOUSLY_APPROVED")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === "PREVIOUSLY_APPROVED"
                    ? "bg-[#0A3C2F] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Previously Approved</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "PREVIOUSLY_APPROVED"
                      ? "bg-white/20 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {currentApprovedPlans.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("RETURNED")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === "RETURNED"
                    ? "bg-[#0A3C2F] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Returned for Revision</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "RETURNED"
                      ? "bg-white/20 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {currentReturnedPlans.length}
                </span>
              </button>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 1: PLANS AWAITING REVIEW */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "AWAITING_REVIEW" && (
            <div className="space-y-4">
              {/* Batch Action Bar */}
              {userRole === "DIRECTOR" && currentPendingPlans.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-700">
                      {selectedPlanIds.length} of {currentPendingPlans.length}{" "}
                      plans selected
                    </span>
                    {selectedPlanIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPlanIds([])}
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenApproveAll}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>
                        Approve All Plans ({currentPendingPlans.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedPlanIds.length === 0}
                      onClick={handleOpenApproveSelected}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0A3C2F] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#083025] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>
                        Approve Selected ({selectedPlanIds.length})
                        {selectedPlanIds.length > 0 &&
                        selectedPlanIds.length < currentPendingPlans.length
                          ? " & Return Remaining"
                          : ""}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Table of Plans Awaiting Review */}
              <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1040px]">
                    <thead>
                      <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider">
                        {userRole === "DIRECTOR" && (
                          <th
                            className="w-12 px-3.5 py-3.5 text-center"
                            scope="col"
                          >
                            <input
                              type="checkbox"
                              aria-label="Select all plans"
                              checked={isAllPendingSelected}
                              onChange={handleToggleSelectAll}
                              disabled={currentPendingPlans.length === 0}
                              className="h-4 w-4 rounded border-slate-300 text-[#0A3C2F] focus:ring-[#0A3C2F] cursor-pointer disabled:opacity-40"
                            />
                          </th>
                        )}
                        <th className="py-3.5 px-4 min-w-[260px]">
                          Plan Name / Reference
                        </th>
                        <th className="py-3.5 px-4 w-36">Category</th>
                        <th className="py-3.5 px-4 w-28">Fiscal Year</th>
                        <th className="py-3.5 px-4 w-40">Coverage Period</th>
                        <th className="py-3.5 px-4 text-center w-28">
                          Activities
                        </th>
                        <th className="py-3.5 px-4 text-center w-36">Status</th>
                        <th className="py-3.5 px-4 text-right w-52">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {currentPendingPlans.length === 0 ? (
                        <tr>
                          <td
                            colSpan={userRole === "DIRECTOR" ? 8 : 7}
                            className="py-12 text-center text-slate-500"
                          >
                            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                            <p className="font-semibold text-slate-700 text-sm">
                              All plans for this project have been reviewed!
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Check the &ldquo;Previously Approved&rdquo; or
                              &ldquo;Returned for Revision&rdquo; tabs to see
                              past actions.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        currentPendingPlans.map((plan) => {
                          const isSelected = selectedPlanIds.includes(plan.id);
                          const isReturned =
                            (plan.status || "")
                              .toLowerCase()
                              .includes("return") ||
                            Boolean(plan.directorRevisionComment);

                          return (
                            <tr
                              key={plan.id}
                              className={`hover:bg-emerald-50/40 transition-colors ${
                                isSelected ? "bg-emerald-50/50" : ""
                              }`}
                            >
                              {userRole === "DIRECTOR" && (
                                <td className="w-12 px-3.5 py-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select plan ${plan.planName}`}
                                    checked={isSelected}
                                    onChange={() => handleTogglePlan(plan.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-[#0A3C2F] focus:ring-[#0A3C2F] cursor-pointer"
                                  />
                                </td>
                              )}

                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => onSelectPlan(plan)}
                                  className="text-left font-semibold text-[#1261a8] hover:text-[#0A3C2F] hover:underline transition cursor-pointer"
                                >
                                  {plan.planName}
                                </button>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {plan.reference || plan.id}
                                  </span>
                                  {isReturned ? (
                                    <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                      Resubmitted (Revised)
                                    </span>
                                  ) : (
                                    <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-md">
                                      Initial Submission
                                    </span>
                                  )}
                                </div>
                                {plan.description && (
                                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                    {plan.description}
                                  </p>
                                )}
                              </td>

                              <td className="py-3.5 px-4 font-medium text-slate-800">
                                {plan.category}
                              </td>

                              <td className="py-3.5 px-4 font-semibold text-slate-800">
                                {plan.budgetYear}
                              </td>

                              <td className="py-3.5 px-4 text-[11px] text-slate-600">
                                {plan.planPeriodFrom || "—"} to{" "}
                                {plan.planPeriodTo || "—"}
                              </td>

                              <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                                {plan.activitiesCount ||
                                  plan.activities?.length ||
                                  0}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <StatusText label={plan.status} />
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectPlan(plan)}
                                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                  >
                                    Review Activities
                                  </button>

                                  {userRole === "DIRECTOR" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPendingApprovePlan(plan)
                                        }
                                        className="rounded-md bg-[#0A3C2F] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#083025] transition cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSingleReturnModalPlan(plan)
                                        }
                                        className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 transition cursor-pointer"
                                      >
                                        Return
                                      </button>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setHistoryModalPlan(plan)}
                                    className="rounded-md border border-slate-200 p-1 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                    title="View Revision History & Audit Trail"
                                  >
                                    <History className="h-3.5 w-3.5" />
                                  </button>
                                </div>
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
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 2: PREVIOUSLY APPROVED PLANS */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "PREVIOUSLY_APPROVED" && (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[960px]">
                  <thead>
                    <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4 min-w-[280px]">
                        Plan Name / Reference
                      </th>
                      <th className="py-3.5 px-4 w-36">Category</th>
                      <th className="py-3.5 px-4 w-28">Fiscal Year</th>
                      <th className="py-3.5 px-4 text-center w-28">
                        Activities
                      </th>
                      <th className="py-3.5 px-4 text-center w-40">Status</th>
                      <th className="py-3.5 px-4 text-right w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {currentApprovedPlans.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-slate-500"
                        >
                          <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">
                            No previously approved plans for this project
                          </p>
                        </td>
                      </tr>
                    ) : (
                      currentApprovedPlans.map((plan) => (
                        <tr
                          key={plan.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => onSelectPlan(plan)}
                              className="text-left font-semibold text-[#1261a8] hover:text-[#0A3C2F] hover:underline transition cursor-pointer"
                            >
                              {plan.planName}
                            </button>
                            <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                              {plan.reference || plan.id}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {plan.category}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {plan.budgetYear}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                            {plan.activitiesCount ||
                              plan.activities?.length ||
                              0}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusText label={plan.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectPlan(plan)}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                              >
                                View Activities
                              </button>
                              <button
                                type="button"
                                onClick={() => setHistoryModalPlan(plan)}
                                className="rounded-md border border-slate-200 p-1 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                title="View Version History"
                              >
                                <History className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 3: RETURNED FOR REVISION PLANS */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === "RETURNED" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead>
                      <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-3.5 px-4 min-w-[240px]">
                          Plan Name / Reference
                        </th>
                        <th className="py-3.5 px-4 min-w-[320px]">
                          Director Feedback &amp; Revision Required
                        </th>
                        <th className="py-3.5 px-4 text-center w-28">
                          Activities
                        </th>
                        <th className="py-3.5 px-4 text-center w-36">Status</th>
                        <th className="py-3.5 px-4 text-right w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {currentReturnedPlans.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-12 text-center text-slate-500"
                          >
                            <RotateCcw className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                            <p className="font-semibold text-slate-700 text-sm">
                              No returned plans for revision in this project
                            </p>
                          </td>
                        </tr>
                      ) : (
                        currentReturnedPlans.map((plan) => (
                          <tr
                            key={plan.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => onSelectPlan(plan)}
                                className="text-left font-semibold text-[#1261a8] hover:text-[#0A3C2F] hover:underline transition cursor-pointer"
                              >
                                {plan.planName}
                              </button>
                              <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                                {plan.reference || plan.id}
                              </p>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-slate-800">
                                <p className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1 text-[11px]">
                                  <MessageSquare className="h-3 w-3 text-amber-700" />
                                  Director Revision Instructions:
                                </p>
                                <p className="italic text-slate-700 font-normal">
                                  &ldquo;
                                  {plan.directorRevisionComment ||
                                    plan.rejectionReason ||
                                    "Please adjust plan details and resubmit."}
                                  &rdquo;
                                </p>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                              {plan.activitiesCount ||
                                plan.activities?.length ||
                                0}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <StatusText label={plan.status} />
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onSelectPlan(plan)}
                                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  View Plan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryModalPlan(plan)}
                                  className="rounded-md border border-slate-200 p-1 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                                  title="View Revision Audit History"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BATCH / PARTIAL REVIEW APPROVAL MODAL ── */}
      <PlanBatchReviewModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedPlans={batchSelectedPlans}
        unselectedPlans={batchUnselectedPlans}
        committeeDeadlineDate={committeeDeadlineDate}
        setCommitteeDeadlineDate={setCommitteeDeadlineDate}
        onConfirm={handleBatchConfirm}
      />

      {/* ── SINGLE PLAN RETURN MODAL ── */}
      {singleReturnModalPlan && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4.5 w-4.5 text-rose-600" />
                <h3 className="font-semibold text-[#16253d] text-base">
                  Return Plan for Revision
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSingleReturnModalPlan(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are returning plan{" "}
                <strong className="text-slate-900 font-semibold">
                  &ldquo;{singleReturnModalPlan.planName}&rdquo;
                </strong>{" "}
                to the Procurement Officer. Please describe what needs to be
                adjusted before approval:
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Director Feedback &amp; Improvement Instructions{" "}
                  <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  value={singleReturnFeedback}
                  onChange={(e) => setSingleReturnFeedback(e.target.value)}
                  placeholder="Specify the revisions required (e.g. adjust activity budgets, refine timeline milestones, re-evaluate scope)..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:border-[#0A3C2F] focus:outline-none focus:ring-1 focus:ring-[#0A3C2F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                disabled={isReturningSingle}
                onClick={() => setSingleReturnModalPlan(null)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReturningSingle || !singleReturnFeedback.trim()}
                onClick={handleConfirmSingleReturn}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-rose-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReturningSingle ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Returning Plan...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Return to Officer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VERSION HISTORY MODAL ── */}
      {historyModalPlan && (
        <VersionHistoryModal
          currentStatus={historyModalPlan.status}
          isOpen={Boolean(historyModalPlan)}
          onClose={() => setHistoryModalPlan(null)}
          planId={historyModalPlan.id}
          planName={historyModalPlan.planName}
          projectCode={historyModalPlan.projectCode}
          plan={historyModalPlan}
          project={
            getProjectForPlan
              ? getProjectForPlan(historyModalPlan.projectCode)
              : undefined
          }
          activities={historyModalPlan.activities}
        />
      )}

      {/* ── SINGLE PLAN APPROVE MODAL ── */}
      <CommitteeDeadlineModal
        isOpen={Boolean(pendingApprovePlan)}
        plan={pendingApprovePlan}
        committeeDeadlineDate={committeeDeadlineDate}
        onChangeDeadlineDate={setCommitteeDeadlineDate}
        onClose={() => setPendingApprovePlan(null)}
        onConfirm={onApprovePlan}
      />
    </div>
  );
}
