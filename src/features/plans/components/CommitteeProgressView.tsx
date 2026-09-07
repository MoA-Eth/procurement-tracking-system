"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchPlans,
  returnPlanForRevision,
  fetchPlanComments,
  BackendComment,
} from "../../../lib/plansApi";
import { fetchCommitteeMembers } from "../../../lib/lookupsApi";
import type { UserRole } from "../../../types";
import {
  Search,
  Filter,
  Eye,
  ArrowLeft,
  ChevronRight,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileText,
  RotateCcw,
  Send,
  MessageSquare,
  AlertCircle,
  Building2,
  ShieldCheck,
  Check,
  X,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseRejectionDetails } from "../plansData";

export interface CommitteeMemberVote {
  id: string;
  name: string;
  email?: string;
  roleTitle: string;
  voteStatus: "Approved" | "Rejected" | "Pending";
  feedback?: string;
  votedAt?: string;
}

export interface VoteProgressItem {
  id: string;
  planNumber: string;
  planTitle: string;
  projectCode: string;
  projectName: string;
  sector: string;
  budgetYear: string;
  totalBudget: number;
  currency: string;
  description: string;
  rawStatus: string;
  overallStatus:
    "Approved" | "Rejected" | "Pending Approval" | "Returned for Revision";
  committeeStatus: "Approved" | "Rejected" | "Pending Approval";
  approvedCount: number;
  rejectedCount: number;
  memberVotes: CommitteeMemberVote[];
  // Management stage attributes
  hasAdvancedToManagement: boolean;
  managementStatus: "Awaiting Review" | "Approved" | "Rejected" | "Not Reached";
  managementDecision?: "APPROVE" | "REJECT" | string | null;
  managementComment?: string | null;
  managementByName?: string | null;
  managementAt?: string | null;
  directorRevisionComment?: string | null;
  comments?: BackendComment[];
  activities?: any[];
}

export interface CommitteeProgressViewProps {
  currentUser?: {
    id?: string;
    role: UserRole;
    name?: string;
    email?: string;
  };
}

export function CommitteeProgressView({
  currentUser,
}: CommitteeProgressViewProps) {
  const [items, setItems] = useState<VoteProgressItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sectorFilter, setSectorFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<
    "ALL" | "COMMITTEE" | "MANAGEMENT" | "REVISIONS"
  >("ALL");

  // Selected item for Detailed Decision Inspector
  const [selectedPlan, setSelectedPlan] = useState<VoteProgressItem | null>(
    null,
  );

  // Modal state for Returning to Officer for Revision
  const [revisionModalPlan, setRevisionModalPlan] =
    useState<VoteProgressItem | null>(null);
  const [revisionInstructions, setRevisionInstructions] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // In-page revision comment state for detailed view
  const [resendComment, setResendComment] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isDirector = currentUser?.role === "DIRECTOR" || !currentUser?.role;

  const loadData = useCallback(async () => {
    try {
      const [rawPlans, dbCommitteeMembers] = await Promise.all([
        fetchPlans(),
        fetchCommitteeMembers(),
      ]);

      const mappedItems: VoteProgressItem[] = rawPlans
        .filter(
          (bp) =>
            bp.status === "WITH_COMMITTEE" ||
            bp.status === "COMMITTEE_ENDORSED" ||
            bp.status === "COMMITTEE_REJECTED" ||
            bp.status === "AWAITING_MANAGEMENT_APPROVAL" ||
            bp.status === "MANAGEMENT_APPROVED" ||
            bp.status === "MANAGEMENT_REJECTED" ||
            bp.status === "RETURNED_FOR_REVISION" ||
            bp.status === "APPROVED" ||
            bp.status === "REJECTED" ||
            (bp.committeeVotes && bp.committeeVotes.length > 0) ||
            bp.managementDecision != null,
        )
        .map((bp) => {
          const rawVotes = bp.committeeVotes || [];
          const committeeUsers =
            bp.committeeMembers && bp.committeeMembers.length > 0
              ? bp.committeeMembers
              : dbCommitteeMembers;

          // Map committee members fetched from database with their votes and comments
          const memberVotes: CommitteeMemberVote[] = committeeUsers.map(
            (userMember) => {
              const matchingVote = rawVotes.find(
                (v) =>
                  v.memberId === userMember.id ||
                  (v.memberEmail &&
                    userMember.email &&
                    v.memberEmail.toLowerCase() ===
                      userMember.email.toLowerCase()) ||
                  (v.memberName &&
                    userMember.name &&
                    v.memberName.toLowerCase() ===
                      userMember.name.toLowerCase()),
              );

              const memberDisplayName =
                (userMember as any).displayName ||
                userMember.name ||
                "Committee Member";
              const memberEmail = userMember.email || undefined;

              if (matchingVote) {
                return {
                  id: userMember.id,
                  name: memberDisplayName,
                  email: memberEmail,
                  roleTitle: "Endorsement Committee",
                  voteStatus:
                    matchingVote.decision === "APPROVE"
                      ? "Approved"
                      : "Rejected",
                  feedback: matchingVote.comment || undefined,
                  votedAt: matchingVote.createdAt
                    ? new Date(matchingVote.createdAt).toLocaleString()
                    : undefined,
                };
              }

              return {
                id: userMember.id,
                name: memberDisplayName,
                email: memberEmail,
                roleTitle: "Endorsement Committee",
                voteStatus: "Pending",
              };
            },
          );

          // Append any votes cast by members not in the committeeUsers array
          rawVotes.forEach((v) => {
            const alreadyMapped = memberVotes.some(
              (mv) =>
                mv.id === v.memberId ||
                (mv.email &&
                  v.memberEmail &&
                  mv.email.toLowerCase() === v.memberEmail.toLowerCase()),
            );
            if (!alreadyMapped) {
              memberVotes.push({
                id: v.memberId || `vote-${v.id}`,
                name: v.memberName || "Committee Member",
                email: v.memberEmail || undefined,
                roleTitle: v.memberRole || "Endorsement Committee",
                voteStatus: v.decision === "APPROVE" ? "Approved" : "Rejected",
                feedback: v.comment || undefined,
                votedAt: v.createdAt
                  ? new Date(v.createdAt).toLocaleString()
                  : undefined,
              });
            }
          });

          const approvedCount = memberVotes.filter(
            (v) => v.voteStatus === "Approved",
          ).length;
          const rejectedCount = memberVotes.filter(
            (v) => v.voteStatus === "Rejected",
          ).length;

          // Committee Status evaluation
          let committeeStatus: "Approved" | "Rejected" | "Pending Approval" =
            "Pending Approval";
          if (rejectedCount >= 3 || bp.status === "COMMITTEE_REJECTED") {
            committeeStatus = "Rejected";
          } else if (
            approvedCount >= 3 ||
            bp.status === "COMMITTEE_ENDORSED" ||
            bp.status === "AWAITING_MANAGEMENT_APPROVAL" ||
            bp.status === "MANAGEMENT_APPROVED" ||
            bp.status === "MANAGEMENT_REJECTED"
          ) {
            committeeStatus = "Approved";
          }

          // Management Status evaluation
          const hasAdvancedToManagement =
            approvedCount >= 3 ||
            bp.status === "AWAITING_MANAGEMENT_APPROVAL" ||
            bp.status === "MANAGEMENT_APPROVED" ||
            bp.status === "MANAGEMENT_REJECTED" ||
            bp.status === "COMMITTEE_ENDORSED" ||
            bp.managementDecision != null;

          let managementStatus:
            "Awaiting Review" | "Approved" | "Rejected" | "Not Reached" =
            "Not Reached";
          if (hasAdvancedToManagement) {
            if (
              bp.status === "MANAGEMENT_APPROVED" ||
              bp.managementDecision === "APPROVE"
            ) {
              managementStatus = "Approved";
            } else if (
              bp.status === "MANAGEMENT_REJECTED" ||
              bp.managementDecision === "REJECT"
            ) {
              managementStatus = "Rejected";
            } else {
              managementStatus = "Awaiting Review";
            }
          }

          // Overall Status
          let overallStatus:
            | "Approved"
            | "Rejected"
            | "Pending Approval"
            | "Returned for Revision" = "Pending Approval";
          if (bp.status === "RETURNED_FOR_REVISION") {
            overallStatus = "Returned for Revision";
          } else if (
            managementStatus === "Approved" ||
            bp.status === "APPROVED"
          ) {
            overallStatus = "Approved";
          } else if (
            managementStatus === "Rejected" ||
            committeeStatus === "Rejected" ||
            bp.status === "REJECTED"
          ) {
            overallStatus = "Rejected";
          } else {
            overallStatus = "Pending Approval";
          }

          const totalBudget = (bp.activities || []).reduce(
            (sum, a) => sum + (a.estimatedBudget || 0),
            0,
          );

          const managementName =
            bp.managementByUser?.displayName ||
            bp.managementByUser?.name ||
            (bp.managementById ? "Executive Management" : null);

          return {
            id: bp.id,
            planNumber: `MoA/${bp.project?.code || "PLAN"}/${bp.budgetYear || "2018"}/${(bp.title || "APP").substring(0, 10)}`,
            planTitle: bp.title,
            projectCode: bp.project?.code || "PROJECT",
            projectName: bp.project?.name || "MoA Project",
            sector: "Agriculture & Livestock",
            budgetYear: bp.budgetYear || "2018 EFY",
            totalBudget: totalBudget > 0 ? totalBudget : 25000000,
            currency: "ETB",
            description:
              bp.description ||
              "Procurement plan submitted for multi-tier executive review.",
            rawStatus: bp.status,
            overallStatus,
            committeeStatus,
            approvedCount,
            rejectedCount,
            memberVotes,
            hasAdvancedToManagement,
            managementStatus,
            managementDecision: bp.managementDecision,
            managementComment: bp.managementComment,
            managementByName: managementName,
            managementAt: bp.managementAt
              ? new Date(bp.managementAt).toLocaleString()
              : null,
            directorRevisionComment: bp.directorRevisionComment,
            comments: bp.comments || [],
            activities: bp.activities || [],
          };
        });

      setItems(mappedItems);
    } catch (err) {
      console.warn("fetchPlans CommitteeProgressView note:", err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const searchParams = useSearchParams();
  const planIdFromQuery = searchParams
    ? searchParams.get("planId") || searchParams.get("plan")
    : null;

  useEffect(() => {
    if (planIdFromQuery && items.length > 0) {
      const target = items.find(
        (it) =>
          it.id === planIdFromQuery ||
          it.planNumber.toLowerCase() === planIdFromQuery.toLowerCase() ||
          it.planTitle.toLowerCase().includes(planIdFromQuery.toLowerCase()),
      );
      if (target) {
        const timer = window.setTimeout(() => {
          setSelectedPlan(target);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [planIdFromQuery, items]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/vote-progress" ||
        customEvent.detail.href === "/workspace/committee-progress"
      ) {
        setSelectedPlan(null);
        setRevisionModalPlan(null);
        setResendComment("");
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  // Handle Returning to Officer for Revision
  const handleReturnToOfficer = async (
    planToReturn: VoteProgressItem,
    instructions: string,
  ) => {
    if (!instructions.trim()) return;

    try {
      setIsSubmittingRevision(true);
      await returnPlanForRevision(
        planToReturn.id,
        instructions,
        currentUser?.id,
      );

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === planToReturn.id
            ? {
                ...item,
                rawStatus: "RETURNED_FOR_REVISION",
                overallStatus: "Returned for Revision",
                directorRevisionComment: instructions,
              }
            : item,
        ),
      );

      if (selectedPlan && selectedPlan.id === planToReturn.id) {
        setSelectedPlan((prev) =>
          prev
            ? {
                ...prev,
                rawStatus: "RETURNED_FOR_REVISION",
                overallStatus: "Returned for Revision",
                directorRevisionComment: instructions,
              }
            : null,
        );
      }

      setRevisionModalPlan(null);
      setRevisionInstructions("");
      setResendComment("");

      setToastMessage(
        `Plan ${planToReturn.planNumber} returned to Officer for revision with your instructions.`,
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error("Error returning plan for revision:", err);
      alert(err.message || "Failed to return plan for revision.");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.planNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.planTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.projectName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || item.overallStatus === statusFilter;
      const matchesSector =
        sectorFilter === "ALL" || item.sector === sectorFilter;

      if (!matchesSearch || !matchesStatus || !matchesSector) return false;

      if (activeTab === "COMMITTEE") {
        return true;
      }
      if (activeTab === "MANAGEMENT") {
        return item.hasAdvancedToManagement;
      }
      if (activeTab === "REVISIONS") {
        return (
          item.overallStatus === "Rejected" ||
          item.overallStatus === "Returned for Revision" ||
          item.committeeStatus === "Rejected" ||
          item.managementStatus === "Rejected"
        );
      }
      return true;
    });
  }, [items, searchTerm, statusFilter, sectorFilter, activeTab]);

  // Section A items: All plans in committee voting or beyond
  const committeeItems = useMemo(() => {
    return filteredItems;
  }, [filteredItems]);

  // Section B items: Plans that reached management
  const managementItems = useMemo(() => {
    return filteredItems.filter((it) => it.hasAdvancedToManagement);
  }, [filteredItems]);

  // Quick stats
  const stats = useMemo(() => {
    const inCommittee = items.filter(
      (it) => it.committeeStatus === "Pending Approval",
    ).length;
    const committeeEndorsed = items.filter(
      (it) => it.committeeStatus === "Approved",
    ).length;
    const awaitingManagement = items.filter(
      (it) => it.managementStatus === "Awaiting Review",
    ).length;
    const managementApproved = items.filter(
      (it) => it.managementStatus === "Approved",
    ).length;
    const needsRevision = items.filter(
      (it) =>
        it.overallStatus === "Rejected" ||
        it.committeeStatus === "Rejected" ||
        it.managementStatus === "Rejected",
    ).length;

    return {
      inCommittee,
      committeeEndorsed,
      awaitingManagement,
      managementApproved,
      needsRevision,
    };
  }, [items]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* BREADCRUMB NAVIGATION */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={() => setSelectedPlan(null)}
          className={`transition-colors cursor-pointer ${
            selectedPlan
              ? "text-slate-500 hover:text-slate-900"
              : "font-bold text-[#0A3C2F]"
          }`}
        >
          Vote Progress
        </button>
        {selectedPlan && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-[#0A3C2F] font-mono">
              {selectedPlan.planNumber} Voting & Review Details
            </span>
          </>
        )}
      </nav>

      {/* VIEW 1: DETAILED DECISION INSPECTOR PAGE */}
      {selectedPlan ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Context Card */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A3C2F] hover:underline cursor-pointer mb-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Vote Progress
                  Overview
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 text-slate-700">
                    {selectedPlan.planNumber}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                    {selectedPlan.planTitle}
                  </h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-slate-600 pt-2">
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">
                      Project:
                    </span>
                    <strong className="text-slate-900 font-semibold">
                      {selectedPlan.projectName} ({selectedPlan.projectCode})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">
                      Sector / Directorate:
                    </span>
                    <strong className="text-slate-900 font-semibold">
                      {selectedPlan.sector}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">
                      Budget Year:
                    </span>
                    <strong className="text-slate-900 font-semibold">
                      {selectedPlan.budgetYear}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">
                      Total Estimated Budget:
                    </span>
                    <strong className="text-[#0A3C2F] font-mono font-bold text-sm">
                      {selectedPlan.currency}{" "}
                      {selectedPlan.totalBudget.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedPlan.overallStatus === "Approved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : selectedPlan.overallStatus === "Rejected"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : selectedPlan.overallStatus === "Returned for Revision"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {selectedPlan.overallStatus === "Approved" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {selectedPlan.overallStatus === "Rejected" && (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  {selectedPlan.overallStatus === "Returned for Revision" && (
                    <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  {selectedPlan.overallStatus === "Pending Approval" && (
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  <span>{selectedPlan.overallStatus}</span>
                </span>

                {isDirector &&
                  (selectedPlan.committeeStatus === "Rejected" ||
                    selectedPlan.managementStatus === "Rejected") &&
                  selectedPlan.rawStatus !== "RETURNED_FOR_REVISION" && (
                    <button
                      onClick={() => {
                        setRevisionModalPlan(selectedPlan);
                        setRevisionInstructions("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Return to Officer for Revision</span>
                    </button>
                  )}
              </div>
            </div>

            {selectedPlan.description && (
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &quot;{selectedPlan.description}&quot;
              </p>
            )}

            {/* If plan was returned for revision, show Director instructions */}
            {selectedPlan.directorRevisionComment && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-1.5 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <RotateCcw className="h-4 w-4 text-amber-700" />
                  <span>Director Revision Instructions:</span>
                </div>
                <p className="italic pl-6 leading-relaxed">
                  &quot;{selectedPlan.directorRevisionComment}&quot;
                </p>
              </div>
            )}
          </section>

          {/* TWO-TIER DECISION INSPECTION GRIDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECTION A: ENDORSEMENT COMMITTEE VOTES & REMARKS */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#0A3C2F] flex items-center justify-center font-bold">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Section A: Endorsement Committee Votes
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Requires at least 3 of 5 approvals to endorse to
                      Management.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    selectedPlan.committeeStatus === "Approved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : selectedPlan.committeeStatus === "Rejected"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {selectedPlan.approvedCount}/5 Approved
                </span>
              </div>

              {/* Committee Members Voting Cards */}
              <div className="space-y-3">
                {selectedPlan.memberVotes.map((member) => (
                  <div
                    key={member.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      member.voteStatus === "Approved"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : member.voteStatus === "Rejected"
                          ? "border-rose-200 bg-rose-50/20"
                          : "border-slate-200 bg-slate-50/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-950">
                          {member.name}
                        </h4>
                        {member.email && (
                          <p className="text-[11px] text-slate-500 font-mono">
                            {member.email}
                          </p>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          member.voteStatus === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : member.voteStatus === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {member.voteStatus === "Approved" && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        )}
                        {member.voteStatus === "Rejected" && (
                          <XCircle className="h-3 w-3 text-rose-600" />
                        )}
                        {member.voteStatus === "Pending" && (
                          <Clock className="h-3 w-3 text-slate-500" />
                        )}
                        <span>
                          {member.voteStatus === "Pending"
                            ? "Pending Vote"
                            : member.voteStatus}
                        </span>
                      </span>
                    </div>

                    {member.feedback &&
                      (() => {
                        const parsed = parseRejectionDetails(member.feedback);
                        const isRejectedWithSpecific =
                          member.voteStatus === "Rejected" &&
                          parsed.rejectedActivityRefs.length > 0;

                        return (
                          <div
                            className={`mt-2.5 p-3.5 rounded-xl border text-xs ${
                              member.voteStatus === "Rejected"
                                ? "bg-rose-50 border-rose-200 text-rose-950"
                                : "bg-emerald-50 border-emerald-200 text-emerald-950"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 font-bold mb-1.5">
                              <div className="flex items-center gap-1.5">
                                {member.voteStatus === "Rejected" ? (
                                  <>
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                    <span className="text-rose-900">
                                      Rejection Reason:
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-emerald-900">
                                      Deliberation Remarks:
                                    </span>
                                  </>
                                )}
                              </div>

                              {isRejectedWithSpecific && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-rose-200/80 text-rose-900 border border-rose-300">
                                  Specific Activity Objection
                                </span>
                              )}
                            </div>

                            {/* Interactive Clickable Flagged Activity Badges: Clicking takes Director directly to that specific activity */}
                            {parsed.rejectedActivityRefs.length > 0 && (
                              <div className="my-2.5 p-3 rounded-xl bg-white/95 border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[11px] font-extrabold text-rose-950 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                    <span>
                                      Flagged Activities (Click to Take to
                                      Activity):
                                    </span>
                                  </span>
                                  <span className="text-[10px] font-medium text-rose-700">
                                    Direct Link to Plan Review
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {parsed.rejectedActivityRefs.map((ref) => (
                                    <Link
                                      key={ref}
                                      href={`/workspace/plan-for-review?plan=${encodeURIComponent(selectedPlan.id)}&activity=${encodeURIComponent(ref)}`}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                                      title={`Click to open Director Review focused on activity ${ref}`}
                                    >
                                      <span>{ref}</span>
                                      <span className="h-3.5 w-px bg-rose-400/80" />
                                      <span className="font-sans text-[11px] font-semibold text-rose-100 group-hover:text-white flex items-center gap-1">
                                        Take to Activity
                                        <ArrowRight className="h-3.5 w-3.5 text-rose-200 group-hover:translate-x-0.5 transition-transform" />
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="pl-1 pt-1">
                              {parsed.rejectedActivityRefs.length > 0 && (
                                <span className="text-[11px] font-bold text-slate-700">
                                  Member Notes:{" "}
                                </span>
                              )}
                              <span className="font-medium italic leading-relaxed text-slate-800">
                                &quot;{parsed.cleanRemarks || member.feedback}
                                &quot;
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                    {member.votedAt && (
                      <p className="text-[10px] text-slate-400 font-mono pt-1">
                        Voted at: {member.votedAt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION B: EXECUTIVE MANAGEMENT REVIEW & AUTHORIZATION */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Section B: Executive Management Review
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Executive authorization following committee endorsement.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    selectedPlan.managementStatus === "Approved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : selectedPlan.managementStatus === "Rejected"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : selectedPlan.managementStatus === "Awaiting Review"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {selectedPlan.managementStatus === "Awaiting Review"
                    ? "Awaiting Review"
                    : selectedPlan.managementStatus === "Approved"
                      ? "Management Approved"
                      : selectedPlan.managementStatus === "Rejected"
                        ? "Management Rejected"
                        : "Not Yet Endorsed"}
                </span>
              </div>

              {/* Management Stage Body */}
              {!selectedPlan.hasAdvancedToManagement ? (
                <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Awaiting Endorsement Committee Quorum
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    This plan requires at least 3 approvals from the endorsement
                    committee before it advances to Executive Management for
                    review.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      selectedPlan.managementStatus === "Approved"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : selectedPlan.managementStatus === "Rejected"
                          ? "bg-rose-50 border-rose-200 text-rose-950"
                          : "bg-amber-50 border-amber-200 text-amber-950"
                    }`}
                  >
                    {selectedPlan.managementStatus === "Approved" && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {selectedPlan.managementStatus === "Rejected" && (
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    {selectedPlan.managementStatus === "Awaiting Review" && (
                      <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold">
                        {selectedPlan.managementStatus === "Approved" &&
                          "Authorized by Executive Management"}
                        {selectedPlan.managementStatus === "Rejected" &&
                          "Rejected by Executive Management"}
                        {selectedPlan.managementStatus === "Awaiting Review" &&
                          "Endorsed by Committee - Awaiting Executive Management Decision"}
                      </h4>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {selectedPlan.managementStatus === "Approved" &&
                          "This procurement plan and its activities have received final executive authorization."}
                        {selectedPlan.managementStatus === "Rejected" &&
                          "Management has rejected this plan. The Director may review comments and return it to the Officer for revision."}
                        {selectedPlan.managementStatus === "Awaiting Review" &&
                          "The plan has achieved committee quorum (>=3 approvals) and is pending Management review and comments."}
                      </p>
                      {selectedPlan.managementByName && (
                        <p className="text-[10px] font-mono text-slate-500 pt-1">
                          Decided by:{" "}
                          <strong>{selectedPlan.managementByName}</strong>
                          {selectedPlan.managementAt
                            ? ` at ${selectedPlan.managementAt}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Management Comment / Rationale */}
                  {selectedPlan.managementComment && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-700" />
                        <span>Executive Review Comments & Directives:</span>
                      </div>
                      <p className="text-xs text-slate-700 italic leading-relaxed pl-5">
                        &quot;{selectedPlan.managementComment}&quot;
                      </p>
                    </div>
                  )}

                  {/* Detailed Comments on activities */}
                  {selectedPlan.comments &&
                    selectedPlan.comments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                          <span>Recorded Plan & Activity Annotations:</span>
                        </h5>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedPlan.comments.map((c) => (
                            <div
                              key={c.id}
                              className="p-2.5 rounded-lg border border-slate-200/80 bg-white text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {c.author?.displayName ||
                                    c.author?.name ||
                                    "Reviewer"}
                                  {c.entityType === "ACTIVITY"
                                    ? " (on Activity)"
                                    : " (on Plan)"}
                                </span>
                                <span>
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-800 italic">
                                &quot;{c.body}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Plan Package Activities Directory */}
          {selectedPlan.activities && selectedPlan.activities.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-[#0A3C2F]" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Package Activities in this Plan
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedPlan.activities.length} activity packages
                      registered
                    </p>
                  </div>
                </div>

                <Link
                  href={`/workspace/plan-for-review?plan=${encodeURIComponent(selectedPlan.id)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold transition-colors shadow-2xs"
                >
                  <span>Open Full Plan Review</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[#A3E635]" />
                </Link>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Ref No</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">
                        Estimated Budget
                      </th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPlan.activities.map((act: any, idx: number) => {
                      const ref =
                        act.reference || act.activityRefNo || `ACT-${idx + 1}`;
                      const isFlaggedInVotes = selectedPlan.memberVotes.some(
                        (mv) => {
                          if (!mv.feedback) return false;
                          const parsed = parseRejectionDetails(mv.feedback);
                          return parsed.rejectedActivityRefs.some(
                            (r) =>
                              r.toLowerCase().trim() ===
                              ref.toLowerCase().trim(),
                          );
                        },
                      );

                      return (
                        <tr
                          key={act.id || idx}
                          id={`committee-activity-row-${ref}`}
                          className={`hover:bg-slate-50 transition-colors ${
                            isFlaggedInVotes
                              ? "bg-rose-50/70 border-l-4 border-l-rose-500"
                              : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{ref}</span>
                              {isFlaggedInVotes && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                                  Flagged
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-slate-800 font-medium">
                            {act.description || "Activity package"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {act.procurementMethod?.label ||
                              act.method ||
                              "RFB - National"}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0A3C2F] text-right">
                            {selectedPlan.currency}{" "}
                            {(
                              act.estimatedBudget ||
                              act.estimatedAmount ||
                              0
                            ).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Link
                              href={`/workspace/plan-for-review?plan=${encodeURIComponent(selectedPlan.id)}&activity=${encodeURIComponent(ref)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-[#0A3C2F] hover:text-white text-slate-700 transition-colors shadow-2xs"
                            >
                              <span>Take to Activity</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* IN-PAGE REVISION SECTION FOR DIRECTOR ON REJECTED PLANS */}
          {isDirector &&
            (selectedPlan.committeeStatus === "Rejected" ||
              selectedPlan.managementStatus === "Rejected") &&
            selectedPlan.rawStatus !== "RETURNED_FOR_REVISION" && (
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-amber-200/60 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                    <RotateCcw className="h-4.5 w-4.5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-950">
                      Return Plan to Officer for Revision
                    </h3>
                    <p className="text-xs text-amber-800/80">
                      Synthesize committee and executive management rejection
                      feedback into clear revision directives for the
                      procurement officer.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#0A3C2F]" />
                    <span>
                      Director Revision Instructions for Officer{" "}
                      <span className="text-rose-600">*</span>
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={resendComment}
                    onChange={(e) => setResendComment(e.target.value)}
                    placeholder="Provide actionable guidance for adjusting activities, estimated budget, or procurement packages..."
                    className="w-full p-3 rounded-xl border border-amber-300/80 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none text-xs text-slate-800 bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleReturnToOfficer(selectedPlan, resendComment)
                    }
                    disabled={!resendComment.trim() || isSubmittingRevision}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#0A3C2F] hover:bg-[#072a21] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {isSubmittingRevision
                        ? "Returning Plan..."
                        : "Return Plan to Officer for Revision"}
                    </span>
                  </button>
                </div>
              </div>
            )}
        </div>
      ) : (
        /* VIEW 2: MAIN VOTE PROGRESS DASHBOARD & DIRECTORY */
        <div className="space-y-6">
          {/* HEADER & SUMMARY METRIC TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                In Committee
              </span>
              <p className="text-xl font-extrabold text-blue-700">
                {stats.inCommittee}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Pending quorum
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Endorsed
              </span>
              <p className="text-xl font-extrabold text-[#0A3C2F]">
                {stats.committeeEndorsed}
              </p>
              <span className="text-[10px] text-slate-400 block">
                3+ votes approved
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Awaiting Mgmt
              </span>
              <p className="text-xl font-extrabold text-amber-600">
                {stats.awaitingManagement}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Ready for executive
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Mgmt Approved
              </span>
              <p className="text-xl font-extrabold text-emerald-600">
                {stats.managementApproved}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Finalized
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Action Required
              </span>
              <p className="text-xl font-extrabold text-rose-600">
                {stats.needsRevision}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Rejected / Revision
              </span>
            </div>
          </div>

          {/* TAB BAR & FILTER / SEARCH CONTROLS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-[#0A3C2F] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Vote Streams ({items.length})
              </button>
              <button
                onClick={() => setActiveTab("COMMITTEE")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "COMMITTEE"
                    ? "bg-[#0A3C2F] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Section A: Committee ({committeeItems.length})
              </button>
              <button
                onClick={() => setActiveTab("MANAGEMENT")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "MANAGEMENT"
                    ? "bg-[#0A3C2F] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Section B: Management ({managementItems.length})
              </button>
              <button
                onClick={() => setActiveTab("REVISIONS")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === "REVISIONS"
                    ? "bg-rose-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Revisions ({stats.needsRevision})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search plan number, title or project..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-[#0A3C2F] outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                <Filter className="h-3 w-3 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Returned for Revision">
                    Returned for Revision
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION A: ENDORSEMENT COMMITTEE PROGRESS TABLE */}
          {(activeTab === "ALL" ||
            activeTab === "COMMITTEE" ||
            activeTab === "REVISIONS") && (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden space-y-0">
              <div className="p-4 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#0A3C2F] text-white flex items-center justify-center font-bold text-xs">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-[#0A3C2F] uppercase tracking-wider">
                      Section A: Endorsement Committee Progress
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tracks 5-member Endorsement Committee deliberations. 3
                      approvals trigger auto-advancement to Executive
                      Management.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#0A3C2F]">
                  {committeeItems.length} Plans
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-240">
                  <thead>
                    <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-4 min-w-36">Plan Number</th>
                      <th className="py-3 px-4 min-w-56">
                        Plan Title & Project
                      </th>
                      <th className="py-3 px-4 min-w-32">Total Budget</th>
                      <th className="py-3 px-4 text-center min-w-44">
                        Committee Votes
                      </th>
                      <th className="py-3 px-4 text-center min-w-36">
                        Endorsement Status
                      </th>
                      <th className="py-3 px-4 text-center min-w-28">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {committeeItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-slate-500"
                        >
                          <FileText className="mx-auto h-7 w-7 text-slate-300 mb-1.5" />
                          <p className="font-semibold text-slate-700 text-xs">
                            No committee records match current filters
                          </p>
                        </td>
                      </tr>
                    ) : (
                      committeeItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Plan Number */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                            {item.planNumber}
                          </td>

                          {/* Plan Title & Project */}
                          <td className="py-3 px-4 min-w-56 max-w-xs">
                            <p className="font-bold text-slate-950 text-xs leading-snug line-clamp-1">
                              {item.planTitle}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {item.projectName}
                            </p>
                          </td>

                          {/* Total Budget */}
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {item.currency}{" "}
                            {item.totalBudget.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </td>

                          {/* Committee Members Voting Boxes */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {item.memberVotes.map((member, idx) => {
                                const boxNum = idx + 1;
                                if (member.voteStatus === "Approved") {
                                  return (
                                    <div
                                      key={member.id}
                                      title={`${member.name}: Approved`}
                                      className="h-6 w-6 rounded bg-[#0A3C2F] text-white flex items-center justify-center text-[11px] font-bold"
                                    >
                                      ✓
                                    </div>
                                  );
                                }
                                if (member.voteStatus === "Rejected") {
                                  return (
                                    <div
                                      key={member.id}
                                      title={`${member.name}: Rejected`}
                                      className="h-6 w-6 rounded bg-rose-700 text-white flex items-center justify-center text-[11px] font-bold"
                                    >
                                      ✕
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={member.id}
                                    title={`${member.name}: Pending Vote`}
                                    className="h-6 w-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-semibold"
                                  >
                                    {boxNum}
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Endorsement Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                item.committeeStatus === "Approved"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : item.committeeStatus === "Rejected"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {item.committeeStatus === "Approved"
                                ? "Endorsed (3+ Approved)"
                                : item.committeeStatus === "Rejected"
                                  ? "Committee Rejected"
                                  : `Pending (${item.approvedCount}/5)`}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedPlan(item)}
                                title="Inspect voting details"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0A3C2F] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {isDirector &&
                                item.committeeStatus === "Rejected" &&
                                item.rawStatus !== "RETURNED_FOR_REVISION" && (
                                  <button
                                    onClick={() => {
                                      setRevisionModalPlan(item);
                                      setRevisionInstructions("");
                                    }}
                                    title="Return plan to Officer for revision"
                                    className="flex h-7 items-center gap-1 px-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer text-[11px] font-bold"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Return</span>
                                  </button>
                                )}
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

          {/* SECTION B: EXECUTIVE MANAGEMENT PROGRESS TABLE */}
          {(activeTab === "ALL" ||
            activeTab === "MANAGEMENT" ||
            activeTab === "REVISIONS") && (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden space-y-0">
              <div className="p-4 bg-indigo-50/60 border-b border-indigo-100/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                      Section B: Executive Management Progress
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Final executive authorization gate after Endorsement
                      Committee review. Management provides plan/activity review
                      and approval/rejection.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-900">
                  {managementItems.length} Plans
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-240">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-4 min-w-36">Plan Number</th>
                      <th className="py-3 px-4 min-w-56">
                        Plan Title & Project
                      </th>
                      <th className="py-3 px-4 min-w-32">Total Budget</th>
                      <th className="py-3 px-4 text-center min-w-36">
                        Committee Endorsement
                      </th>
                      <th className="py-3 px-4 text-center min-w-40">
                        Management Status
                      </th>
                      <th className="py-3 px-4 text-center min-w-28">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {managementItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-slate-500"
                        >
                          <Building2 className="mx-auto h-7 w-7 text-slate-300 mb-1.5" />
                          <p className="font-semibold text-slate-700 text-xs">
                            No plans currently in Executive Management review
                          </p>
                        </td>
                      </tr>
                    ) : (
                      managementItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Plan Number */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                            {item.planNumber}
                          </td>

                          {/* Plan Title & Project */}
                          <td className="py-3 px-4 min-w-56 max-w-xs">
                            <p className="font-bold text-slate-950 text-xs leading-snug line-clamp-1">
                              {item.planTitle}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {item.projectName}
                            </p>
                          </td>

                          {/* Total Budget */}
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {item.currency}{" "}
                            {item.totalBudget.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </td>

                          {/* Committee Result */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>{item.approvedCount}/5 Endorsed</span>
                            </span>
                          </td>

                          {/* Management Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                item.managementStatus === "Approved"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : item.managementStatus === "Rejected"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {item.managementStatus === "Approved" &&
                                "Management Approved"}
                              {item.managementStatus === "Rejected" &&
                                "Management Rejected"}
                              {item.managementStatus === "Awaiting Review" &&
                                "Awaiting Approval"}
                              {item.managementStatus === "Not Reached" &&
                                "Pending Committee"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedPlan(item)}
                                title="Inspect executive review details"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {isDirector &&
                                item.managementStatus === "Rejected" &&
                                item.rawStatus !== "RETURNED_FOR_REVISION" && (
                                  <button
                                    onClick={() => {
                                      setRevisionModalPlan(item);
                                      setRevisionInstructions("");
                                    }}
                                    title="Return plan to Officer for revision"
                                    className="flex h-7 items-center gap-1 px-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer text-[11px] font-bold"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Return</span>
                                  </button>
                                )}
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
        </div>
      )}

      {/* MODAL: RETURN TO OFFICER FOR REVISION */}
      {revisionModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <RotateCcw className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Return Plan to Officer for Revision
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {revisionModalPlan.planNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRevisionModalPlan(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Rejection Context Display */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500">
                  Plan Title:
                </span>
                <span className="font-bold text-slate-900">
                  {revisionModalPlan.planTitle}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500">Project:</span>
                <span className="font-bold text-slate-900">
                  {revisionModalPlan.projectName}
                </span>
              </div>

              {/* Committee Rejection info */}
              {revisionModalPlan.committeeStatus === "Rejected" && (
                <div className="pt-1.5 border-t border-slate-200">
                  <span className="text-rose-700 font-bold block text-[11px] mb-1">
                    Committee Rejection Feedback:
                  </span>
                  {revisionModalPlan.memberVotes
                    .filter((m) => m.voteStatus === "Rejected" && m.feedback)
                    .map((m) => (
                      <p
                        key={m.id}
                        className="text-slate-700 italic pl-3 border-l-2 border-rose-300 text-[11px]"
                      >
                        <strong>{m.name}:</strong> &quot;{m.feedback}&quot;
                      </p>
                    ))}
                </div>
              )}

              {/* Management Rejection info */}
              {revisionModalPlan.managementStatus === "Rejected" &&
                revisionModalPlan.managementComment && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <span className="text-rose-700 font-bold block text-[11px] mb-1">
                      Management Rejection Rationale:
                    </span>
                    <p className="text-slate-700 italic pl-3 border-l-2 border-rose-300 text-[11px]">
                      &quot;{revisionModalPlan.managementComment}&quot;
                    </p>
                  </div>
                )}
            </div>

            {/* Revision Instructions Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-[#0A3C2F]" />
                <span>
                  Director Revision Instructions for Officer{" "}
                  <span className="text-rose-600">*</span>
                </span>
              </label>
              <textarea
                rows={4}
                value={revisionInstructions}
                onChange={(e) => setRevisionInstructions(e.target.value)}
                placeholder="Enter detailed directives on required amendments to activities, estimated budget lines, timelines, or procurement methods..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevisionModalPlan(null)}
                disabled={isSubmittingRevision}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleReturnToOfficer(revisionModalPlan, revisionInstructions)
                }
                disabled={!revisionInstructions.trim() || isSubmittingRevision}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {isSubmittingRevision
                    ? "Returning..."
                    : "Return Plan to Officer"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// Alias export for consistency
export const VoteProgressView = CommitteeProgressView;
