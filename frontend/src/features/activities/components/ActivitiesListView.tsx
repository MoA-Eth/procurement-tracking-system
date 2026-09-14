"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  FileText,
  Clock,
  Eye,
  Search,
  Filter,
  DollarSign,
  MapPin,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Send,
} from "lucide-react";
import Link from "next/link";
import type { PlanCategory, ProcurementPlan } from "../../plans/plansData";
import type { ProjectItem } from "@/features/projects/management/projectsData";
import {
  INITIAL_ACTIVITIES,
  type ProcurementActivity,
  type ProcurementMethod,
} from "../activitiesData";

interface ActivitiesListViewProps {
  plan: ProcurementPlan;
  project: ProjectItem;
  userRole?: "OFFICER" | "DIRECTOR" | "ADMIN";
  parentSection?: "projects" | "plan-for-review";
  onBackClick: () => void;
  onApprovePlan?: (plan: ProcurementPlan) => void;
  onReturnPlan?: (plan: ProcurementPlan, remarks: string) => void;
}

export function ActivitiesListView({
  plan,
  project,
  parentSection = "projects",
  onBackClick,
  onApprovePlan,
  onReturnPlan,
}: ActivitiesListViewProps) {
  const [activities, setActivities] = useState<ProcurementActivity[]>(() =>
    INITIAL_ACTIVITIES.filter(
      (a) => a.planId === plan.id || a.projectCode === project.code,
    ),
  );

  const [currentPlanName, setCurrentPlanName] = useState(plan.planName);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected Activity for Detailed View
  const [selectedActivity, setSelectedActivity] =
    useState<ProcurementActivity | null>(null);
  const [directorReturnRemarks, setDirectorReturnRemarks] = useState("");

  const isDirectorReview = parentSection === "plan-for-review";

  const handleUpdateActivityField = <K extends keyof ProcurementActivity>(
    actId: string,
    field: K,
    value: ProcurementActivity[K],
  ) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, [field]: value } : a)),
    );
    if (selectedActivity && selectedActivity.id === actId) {
      setSelectedActivity((prev) =>
        prev ? { ...prev, [field]: value } : null,
      );
    }
  };

  const handleUpdateRoadmapDate = (
    actId: string,
    stageId: string,
    newDate: string,
  ) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== actId) return a;
        const newRoadmap = a.roadmap.map((s) =>
          s.id === stageId
            ? {
                ...s,
                revisedTargetDate: newDate,
                originalPlannedDate: s.originalPlannedDate || newDate,
              }
            : s,
        );
        return { ...a, roadmap: newRoadmap };
      }),
    );
    if (selectedActivity && selectedActivity.id === actId) {
      setSelectedActivity((prev) => {
        if (!prev) return null;
        const newRoadmap = prev.roadmap.map((s) =>
          s.id === stageId
            ? {
                ...s,
                revisedTargetDate: newDate,
                originalPlannedDate: s.originalPlannedDate || newDate,
              }
            : s,
        );
        return { ...prev, roadmap: newRoadmap };
      });
    }
  };

  // Active Detail Tab state (1: Key Details, 2: Related Info, 3: Additional Details, 4: Roadmap)
  const [activeDetailTab, setActiveDetailTab] = useState<1 | 2 | 3 | 4>(1);

  const getActivityStatus = (
    act: ProcurementActivity,
  ): "Not Started" | "In Progress" | "Completed" | "Delayed" => {
    const completedStages = act.roadmap.filter(
      (s) => s.stageStatus === "Completed",
    ).length;
    const totalStages = act.roadmap.length;
    const hasDelay = act.roadmap.some(
      (s) =>
        (s.delayDays && s.delayDays > 0) ||
        s.remarks?.toLowerCase().includes("delay"),
    );

    if (hasDelay) return "Delayed";
    if (completedStages === totalStages && totalStages > 0) return "Completed";
    if (
      completedStages === 0 &&
      act.roadmap.every(
        (s) => s.stageStatus === "Not Started" || !s.stageStatus,
      )
    ) {
      return "Not Started";
    }
    return "In Progress";
  };

  // Filter activities
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.activityRefNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === "ALL" || act.method === methodFilter;
    const matchesReview =
      reviewFilter === "ALL" || act.reviewType === reviewFilter;
    const matchesStatus =
      statusFilter === "ALL" || getActivityStatus(act) === statusFilter;
    return matchesSearch && matchesMethod && matchesReview && matchesStatus;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-8">
      {/* 1. CLEAN BREADCRUMB NAVIGATION (Plan for Review > Selected Plan Name > [Activity Ref No]) */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs"
      >
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 shrink-0"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
        {parentSection === "plan-for-review" ? (
          <button
            onClick={onBackClick}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          >
            Plan for Review
          </button>
        ) : (
          <button
            onClick={onBackClick}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          >
            Projects
          </button>
        )}
        <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
        <button
          onClick={() => setSelectedActivity(null)}
          className={`transition-colors cursor-pointer truncate max-w-[260px] ${
            selectedActivity
              ? "text-slate-500 hover:text-slate-900"
              : "font-bold text-[#0A3C2F]"
          }`}
        >
          {currentPlanName}
        </button>
        {selectedActivity && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="font-bold text-[#0A3C2F] font-mono truncate max-w-[180px]">
              {selectedActivity.activityRefNo}
            </span>
          </>
        )}
      </nav>

      {/* COMPREHENSIVE ACTIVITY DETAIL VIEW */}
      {selectedActivity ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Streamlined Header Card */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Activities
                    Table
                  </button>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-xs font-extrabold text-[#0A3C2F] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {selectedActivity.activityRefNo}
                  </span>
                </div>

                <h1 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight leading-snug">
                  {selectedActivity.description}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>
                    Category:{" "}
                    <strong className="text-slate-900">
                      {selectedActivity.category}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Method:{" "}
                    <strong className="text-[#0A3C2F]">
                      {selectedActivity.method}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Estimated Amount:{" "}
                    <strong className="text-slate-900 font-mono">
                      {selectedActivity.currency}{" "}
                      {selectedActivity.estimatedAmount.toLocaleString()}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Review Type:{" "}
                    <strong className="text-amber-800 font-bold">
                      {selectedActivity.reviewType}
                    </strong>
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-[#0A3C2F] text-white shadow-2xs">
                {selectedActivity.status}
              </span>
            </div>
          </section>

          {/* 4-Step Stepper Bar (Matching Image 2) */}
          <div className="bg-white py-4 px-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex items-center justify-between max-w-4xl mx-auto">
              {/* Connecting Line */}
              <div className="absolute top-4 left-10 right-10 h-0.5 bg-slate-200 z-0" />

              {[
                { id: 1, label: "1. Key Details" },
                { id: 2, label: "2. Related Info" },
                { id: 3, label: "3. Additional Details" },
                { id: 4, label: "4. Roadmap" },
              ].map((step) => {
                const isActive = activeDetailTab === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveDetailTab(step.id as 1 | 2 | 3 | 4)}
                    className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    {/* Circle Number Badge */}
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm transition-all bg-white ${
                        isActive
                          ? "border-2 border-[#0A3C2F] text-[#0A3C2F] ring-4 ring-[#0A3C2F]/10 shadow-xs"
                          : "border border-slate-300 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-700"
                      }`}
                    >
                      {step.id}
                    </div>

                    {/* Step Label Underneath */}
                    <span
                      className={`mt-2 text-xs transition-colors whitespace-nowrap ${
                        isActive
                          ? "font-bold text-[#0A3C2F]"
                          : "font-medium text-slate-500 group-hover:text-slate-800"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* TAB 1: KEY DETAILS (Clean Unified Sheet Layout) */}
          {activeDetailTab === 1 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <FileText className="h-4 w-4 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  4.1 Step 1 — Key Details & Procurement Framework
                </h3>
              </div>

              {/* Unified Key-Value Table Sheet */}
              <div className="divide-y divide-slate-100 text-xs">
                {/* Activity Description */}
                <div className="py-2.5 flex items-start justify-between">
                  <span className="font-semibold text-slate-500 w-1/3 pt-1">
                    Activity Description
                  </span>
                  {isDirectorReview ? (
                    <textarea
                      rows={2}
                      value={selectedActivity.description}
                      onChange={(e) =>
                        handleUpdateActivityField(
                          selectedActivity.id,
                          "description",
                          e.target.value,
                        )
                      }
                      className="w-2/3 rounded-xl border border-emerald-300 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-[#0A3C2F] outline-none"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900 w-2/3">
                      {selectedActivity.description}
                    </span>
                  )}
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Procurement Category
                  </span>
                  <span className="font-extrabold text-slate-900 w-2/3 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {selectedActivity.category} (Inherited from Plan)
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Procurement Method
                  </span>
                  <span className="font-extrabold text-[#0A3C2F] w-2/3">
                    {selectedActivity.method}
                    {selectedActivity.specificMethod &&
                      ` (${selectedActivity.specificMethod})`}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Market Approach
                  </span>
                  <span className="font-bold text-slate-900 w-2/3">
                    {selectedActivity.marketApproach}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Qualification Approach
                  </span>
                  <span className="font-bold text-slate-900 w-2/3">
                    {selectedActivity.qualificationApproach}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Review Type / Oversight
                  </span>
                  <span className="font-extrabold text-amber-800 w-2/3">
                    {selectedActivity.reviewType} Review
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Domestic / Regional Preference
                  </span>
                  <span className="font-bold text-slate-900 w-2/3">
                    {selectedActivity.domesticPreference
                      ? "Yes (Applied)"
                      : "No"}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Procurement Process
                  </span>
                  <span className="font-bold text-slate-900 w-2/3">
                    {selectedActivity.procurementProcess ||
                      "Single Stage One Envelope"}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Procurement Document Type
                  </span>
                  <span className="font-bold text-slate-900 w-2/3">
                    {selectedActivity.procurementDocumentType ||
                      "Standard Bidding Document (SPD)"}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Framework Flags
                  </span>
                  <div className="w-2/3 flex flex-wrap gap-4 text-slate-700">
                    <span className="flex items-center gap-1">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${selectedActivity.requiresUnAgency ? "text-emerald-600" : "text-slate-300"}`}
                      />
                      UN Contracting:{" "}
                      <strong>
                        {selectedActivity.requiresUnAgency ? "Yes" : "No"}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 ${selectedActivity.isInProcess ? "text-emerald-600" : "text-slate-300"}`}
                      />
                      In-Process (Migrated):{" "}
                      <strong>
                        {selectedActivity.isInProcess ? "Yes" : "No"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RELATED INFORMATION (Clean Unified Sheet Layout) */}
          {activeDetailTab === 2 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <DollarSign className="h-4 w-4 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  4.2 Step 2 — Scope, Budget, Lot Packaging & Financing
                </h3>
              </div>

              {/* Unified Key-Value Table Sheet */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Activity Reference No.
                  </span>
                  <span className="font-mono font-extrabold text-[#0A3C2F] w-2/3">
                    {selectedActivity.activityRefNo}
                  </span>
                </div>

                {/* Estimated Amount */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Estimated Amount
                  </span>
                  {isDirectorReview ? (
                    <div className="w-2/3 flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-500">
                        {selectedActivity.currency}
                      </span>
                      <input
                        type="number"
                        value={selectedActivity.estimatedAmount}
                        onChange={(e) =>
                          handleUpdateActivityField(
                            selectedActivity.id,
                            "estimatedAmount",
                            Number(e.target.value),
                          )
                        }
                        className="w-48 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-[#0A3C2F] outline-none"
                      />
                    </div>
                  ) : (
                    <span className="font-mono font-extrabold text-slate-950 w-2/3">
                      {selectedActivity.currency}{" "}
                      {selectedActivity.estimatedAmount.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Remarks / Comments */}
                <div className="py-2.5 flex items-start justify-between">
                  <span className="font-semibold text-slate-500 w-1/3 pt-1">
                    Remarks / Comments
                  </span>
                  {isDirectorReview ? (
                    <textarea
                      rows={2}
                      value={selectedActivity.remarks || ""}
                      onChange={(e) =>
                        handleUpdateActivityField(
                          selectedActivity.id,
                          "remarks",
                          e.target.value,
                        )
                      }
                      placeholder="Enter clarification remarks..."
                      className="w-2/3 rounded-xl border border-emerald-300 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-[#0A3C2F] outline-none"
                    />
                  ) : (
                    <span className="font-medium text-slate-800 w-2/3">
                      {selectedActivity.remarks || "—"}
                    </span>
                  )}
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Funding Source & Instrument
                  </span>
                  <div className="w-2/3 font-bold text-slate-900">
                    {selectedActivity.fundingSource}
                    {selectedActivity.loanGrantNo && (
                      <span className="font-mono text-[11px] text-slate-500 ml-2 font-normal">
                        (No: {selectedActivity.loanGrantNo}, 100% allocation)
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Project Component
                  </span>
                  <div className="w-2/3 font-bold text-slate-900">
                    {selectedActivity.component || "N/A"}
                    {selectedActivity.subcomponent && (
                      <span className="text-[11px] text-slate-600 ml-2 font-normal">
                        [{selectedActivity.subcomponent}]
                      </span>
                    )}
                  </div>
                </div>

                {selectedActivity.invitationRefNo && (
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-500 w-1/3">
                      Invitation / Bid Ref No.
                    </span>
                    <span className="font-mono font-bold text-slate-900 w-2/3">
                      {selectedActivity.invitationRefNo}
                    </span>
                  </div>
                )}

                <div className="py-2.5 flex items-start justify-between">
                  <span className="font-semibold text-slate-500 w-1/3 pt-0.5">
                    Lot Packaging Requirements
                  </span>
                  <div className="w-2/3 space-y-1.5">
                    <div className="font-bold text-slate-900">
                      {selectedActivity.isLotRequired
                        ? `${selectedActivity.lots?.length || 0} Repeatable Lots Configured`
                        : "Single Package (No Split Lots)"}
                    </div>
                    {selectedActivity.isLotRequired &&
                      selectedActivity.lots && (
                        <div className="space-y-1 text-xs pt-1">
                          {selectedActivity.lots.map((lot) => (
                            <div
                              key={lot.id}
                              className="flex items-center justify-between text-slate-700 font-medium"
                            >
                              <span>
                                <strong>{lot.lotNumber}:</strong>{" "}
                                {lot.lotDescription}
                              </span>
                              <span className="font-mono font-bold text-[#0A3C2F] ml-3">
                                {selectedActivity.currency}{" "}
                                {lot.estimatedAmount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADDITIONAL DETAILS (Clean Unified Sheet Layout) */}
          {activeDetailTab === 3 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <MapPin className="h-4 w-4 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  4.3 Step 3 — Classification & Regional Location
                </h3>
              </div>

              {/* Unified Key-Value Table Sheet */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Classification Code
                  </span>
                  <span className="font-mono font-extrabold text-slate-900 w-2/3">
                    {selectedActivity.classificationCode || "42100000"} —{" "}
                    {selectedActivity.classificationDescription ||
                      "Agricultural Machinery & Equipment"}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Implementation Location / Region
                  </span>
                  <span className="font-bold text-slate-900 w-2/3">
                    {selectedActivity.locationRegion || plan.organizationRegion}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 w-1/3">
                    Location Coordinates
                  </span>
                  <span className="font-mono font-bold text-slate-900 w-2/3">
                    Latitude: {selectedActivity.latitude || "9.0192"} |
                    Longitude: {selectedActivity.longitude || "38.7525"}
                  </span>
                </div>

                {/* Remarks / Notes */}
                <div className="py-2.5 flex items-start justify-between">
                  <span className="font-semibold text-slate-500 w-1/3 pt-1">
                    Remarks / Notes
                  </span>
                  {isDirectorReview ? (
                    <textarea
                      rows={2}
                      value={selectedActivity.additionalRemarks || ""}
                      onChange={(e) =>
                        handleUpdateActivityField(
                          selectedActivity.id,
                          "additionalRemarks",
                          e.target.value,
                        )
                      }
                      placeholder="Enter additional notes..."
                      className="w-2/3 rounded-xl border border-emerald-300 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-[#0A3C2F] outline-none"
                    />
                  ) : (
                    <span className="font-medium text-slate-800 w-2/3">
                      {selectedActivity.additionalRemarks || "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROADMAP */}
          {activeDetailTab === 4 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#0A3C2F]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    4.4 Step 4 — Activity Roadmap & Stage Milestones
                  </h3>
                </div>
                <span className="text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Method: {selectedActivity.method}
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[180px]">
                          Stage Name
                        </th>
                        <th className="py-2.5 px-3 font-mono">
                          Original Baseline
                        </th>
                        <th className="py-2.5 px-3 font-mono">
                          Current Target
                        </th>
                        <th className="py-2.5 px-3 font-mono">Actual Date</th>
                        <th className="py-2.5 px-3 text-center">
                          Stage Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedActivity.roadmap.map((stage, idx) => (
                        <tr key={stage.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 max-w-xs wrap-break-word">
                            <p className="wrap-break-word line-clamp-2">
                              {stage.stageName}
                            </p>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {stage.notApplicable ||
                            stage.originalPlannedDate === "Not applicable"
                              ? "Not applicable"
                              : stage.originalPlannedDate || "—"}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                            {stage.notApplicable ||
                            stage.revisedTargetDate === "Not applicable" ? (
                              <span className="text-slate-400 font-medium italic">
                                Not applicable
                              </span>
                            ) : isDirectorReview ? (
                              <input
                                type="date"
                                value={
                                  stage.revisedTargetDate ||
                                  stage.originalPlannedDate ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleUpdateRoadmapDate(
                                    selectedActivity.id,
                                    stage.id,
                                    e.target.value,
                                  )
                                }
                                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-[#0A3C2F] outline-none cursor-pointer"
                              />
                            ) : (
                              stage.revisedTargetDate ||
                              stage.originalPlannedDate ||
                              "—"
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                            {stage.actualDate || "—"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                stage.notApplicable ||
                                stage.stageStatus === "Not Applicable"
                                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                                  : stage.stageStatus === "Completed"
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                    : stage.stageStatus === "In Progress"
                                      ? "bg-blue-100 text-blue-900 border border-blue-300"
                                      : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {stage.notApplicable ||
                              stage.stageStatus === "Not Applicable"
                                ? "Not Applicable"
                                : stage.stageStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN TABULAR ACTIVITY DIRECTORY */
        <div className="space-y-4">
          {/* Context Header Card Matching Screenshot 2 */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onBackClick}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs font-extrabold text-[#0A3C2F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {project.code}
              </span>
            </div>

            {isDirectorReview ? (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#0A3C2F] uppercase tracking-wider">
                  Plan Name (Editable for Minor Corrections / Typo Fixes)
                </label>
                <input
                  type="text"
                  value={currentPlanName}
                  onChange={(e) => setCurrentPlanName(e.target.value)}
                  placeholder="Enter plan name..."
                  className="w-full text-base sm:text-lg font-extrabold text-slate-950 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 focus:border-[#0A3C2F] focus:ring-2 focus:ring-[#0A3C2F]/10 outline-none transition-all"
                />
              </div>
            ) : (
              <h1 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight leading-snug">
                {currentPlanName}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                Category:{" "}
                <strong className="text-slate-900 font-bold">
                  {plan.category}
                </strong>
              </span>
              <span>•</span>
              <span>
                Fiscal Year:{" "}
                <strong className="text-slate-900 font-bold">
                  {plan.budgetYear}
                </strong>
              </span>
              <span>•</span>
              <span>
                Region:{" "}
                <strong className="text-slate-900 font-bold">
                  {plan.organizationRegion}
                </strong>
              </span>
            </div>
          </section>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search package activities by Ref No or Description..."
                className="w-full pl-10 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-[#0A3C2F] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Methods</option>
                  <option value="RFB - National">RFB - National</option>
                  <option value="RFB - International">
                    RFB - International
                  </option>
                  <option value="RFQ / Shopping">RFQ / Shopping</option>
                  <option value="QCBS">QCBS</option>
                  <option value="Direct Procurement">Direct Procurement</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Reviews</option>
                  <option value="Prior">Prior Review</option>
                  <option value="Post">Post Review</option>
                  <option value="Audit">Audit</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Status</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabular Activity Directory */}
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[920px]">
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 min-w-[140px]">
                      Activity Ref No
                    </th>
                    <th className="py-2.5 px-3 min-w-[220px]">
                      Description & Scope
                    </th>
                    <th className="py-2.5 px-3 min-w-[140px]">
                      Method / Market
                    </th>
                    <th className="py-2.5 px-3 min-w-[90px]">Review</th>
                    <th className="py-2.5 px-3 min-w-[120px]">
                      Estimated Amount
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">
                      Status
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-500"
                      >
                        <FileText className="mx-auto h-7 w-7 text-slate-300 mb-1" />
                        <p className="font-semibold text-slate-700 text-xs">
                          No procurement activities found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act, index) => {
                      const completedStages = act.roadmap.filter(
                        (s) => s.stageStatus === "Completed",
                      ).length;
                      const totalStages = act.roadmap.length;
                      const hasDelay = act.roadmap.some(
                        (s) =>
                          (s.delayDays && s.delayDays > 0) ||
                          s.remarks?.toLowerCase().includes("delay"),
                      );

                      let computedStatus:
                        | "Not Started"
                        | "In Progress"
                        | "Completed"
                        | "Delayed" = "In Progress";
                      if (hasDelay) {
                        computedStatus = "Delayed";
                      } else if (
                        completedStages === totalStages &&
                        totalStages > 0
                      ) {
                        computedStatus = "Completed";
                      } else if (
                        completedStages === 0 &&
                        act.roadmap.every(
                          (s) =>
                            s.stageStatus === "Not Started" || !s.stageStatus,
                        )
                      ) {
                        computedStatus = "Not Started";
                      } else {
                        computedStatus = "In Progress";
                      }

                      const statusColorStyle =
                        computedStatus === "Completed"
                          ? "text-[#166534] font-bold"
                          : computedStatus === "Delayed"
                            ? "text-[#b91c1c] font-extrabold"
                            : computedStatus === "In Progress"
                              ? "text-blue-700 font-bold"
                              : "text-slate-500 font-semibold";

                      return (
                        <tr
                          key={act.id}
                          onClick={() => setSelectedActivity(act)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="py-2 px-3 font-mono text-slate-400 font-semibold text-center">
                            {index + 1}
                          </td>

                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                            {act.activityRefNo}
                          </td>

                          <td className="py-2 px-3 max-w-xs wrap-break-word">
                            <p className="font-bold text-slate-900 text-xs leading-snug wrap-break-word line-clamp-2">
                              {act.description}
                            </p>
                          </td>

                          <td className="py-2 px-3 text-xs">
                            <div className="font-bold text-[#0A3C2F]">
                              {act.method}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {act.marketApproach}
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <span
                              className={`text-xs font-extrabold ${
                                act.reviewType === "Prior"
                                  ? "text-amber-800"
                                  : "text-slate-700"
                              }`}
                            >
                              {act.reviewType}
                            </span>
                          </td>

                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                            {act.currency}{" "}
                            {act.estimatedAmount.toLocaleString()}
                          </td>

                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className={`text-xs ${statusColorStyle}`}>
                              {computedStatus}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedActivity(act);
                              }}
                              title="View Activity Details"
                              className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer mx-auto"
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

          {/* Director Decision & Workflow Actions Card (Aligned Below Activities Directory Table) */}
          {isDirectorReview && onApprovePlan && onReturnPlan && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5 mt-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-5 w-5 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Director Decision & Workflow Actions
                </h3>
              </div>

              {/* Revision Remarks Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Revision Notes (If returning to Officer)
                </label>
                <textarea
                  rows={3}
                  value={directorReturnRemarks}
                  onChange={(e) => setDirectorReturnRemarks(e.target.value)}
                  placeholder="Specify required corrections, missing documents or revision notes for the Procurement Officer..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F]"
                />
              </div>

              {/* Action Buttons Aligned Side-by-Side Below Comment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onApprovePlan(plan)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4 text-[#A3E635]" />
                  <span>Approve & Send to Committee</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReturnPlan(plan, directorReturnRemarks)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-rose-600" />
                  <span>Return to Officer for Revision</span>
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
