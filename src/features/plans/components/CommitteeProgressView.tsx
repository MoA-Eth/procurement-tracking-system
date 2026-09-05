"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchPlans } from "../../../lib/plansApi";
import { fetchCommitteeMembers } from "../../../lib/lookupsApi";
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

export interface CommitteeProgressItem {
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
  overallStatus: "Approved" | "Rejected" | "Pending Approval";
  approvedCount: number;
  rejectedCount: number;
  memberVotes: CommitteeMemberVote[];
  activities?: any[];
}

export function CommitteeProgressView() {
  const [items, setItems] = useState<CommitteeProgressItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sectorFilter, setSectorFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    try {
      const [rawPlans, dbCommitteeMembers] = await Promise.all([
        fetchPlans(),
        fetchCommitteeMembers(),
      ]);

      const mappedItems: CommitteeProgressItem[] = rawPlans
        .filter(
          (bp) =>
            bp.status === "WITH_COMMITTEE" ||
            bp.status === "APPROVED" ||
            bp.status === "REJECTED" ||
            (bp.committeeVotes && bp.committeeVotes.length > 0),
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
              // EXACT MATCH: Match vote strictly by memberId, email, or name
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

          let overallStatus: "Approved" | "Rejected" | "Pending Approval" =
            "Pending Approval";

          // Business Rule:
          // 1. Approved: At least 3 committee members vote Approve (approvedCount >= 3)
          // 2. Rejected: At least 3 committee members vote Reject (rejectedCount >= 3, majority reject)
          // 3. Pending Approval: In progress awaiting remaining votes (0-2 approves, 0-2 rejects)
          if (rejectedCount >= 3) {
            overallStatus = "Rejected";
          } else if (approvedCount >= 3) {
            overallStatus = "Approved";
          } else {
            overallStatus = "Pending Approval";
          }

          const totalBudget = (bp.activities || []).reduce(
            (sum, a) => sum + (a.estimatedBudget || 0),
            0,
          );

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
              "Procurement plan submitted for committee review.",
            overallStatus,
            approvedCount,
            rejectedCount,
            memberVotes,
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

  // Selected item for Detailed Decision Inspector
  const [selectedPlan, setSelectedPlan] =
    useState<CommitteeProgressItem | null>(null);

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

  // In-page revision comment state for returning rejected plan to officer
  const [resendComment, setResendComment] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/committee-progress"
      ) {
        setSelectedPlan(null);
        setResendComment("");
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  const handleResendToOfficer = () => {
    if (!selectedPlan) return;

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === selectedPlan.id
          ? { ...item, overallStatus: "Rejected" }
          : item,
      ),
    );

    const planNo = selectedPlan.planNumber;
    setSelectedPlan(null);
    setResendComment("");

    setToastMessage(
      `Plan ${planNo} has been returned to the Officer for revision with your instructions.`,
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.planNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.planTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || item.overallStatus === statusFilter;
    const matchesSector =
      sectorFilter === "ALL" || item.sector === sectorFilter;
    return matchesSearch && matchesStatus && matchesSector;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
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
          Committee Progress
        </button>
        {selectedPlan && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-[#0A3C2F] font-mono">
              {selectedPlan.planNumber} Voting Details
            </span>
          </>
        )}
      </nav>

      {/* VIEW 1: DETAILED COMMITTEE DECISION INSPECTOR PAGE */}
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
                  <ArrowLeft className="h-4 w-4" /> Back to Committee Progress
                  Table
                </button>

                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                  {selectedPlan.planTitle}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-2">
                  <div>
                    <span className="text-slate-400 font-medium block text-[11px]">
                      Project:
                    </span>
                    <strong className="text-slate-900 font-semibold">
                      {selectedPlan.projectName}
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
                      Total Budget:
                    </span>
                    <strong className="text-[#0A3C2F] font-mono font-bold">
                      {selectedPlan.currency}{" "}
                      {selectedPlan.totalBudget.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedPlan.overallStatus === "Approved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : selectedPlan.overallStatus === "Rejected"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {selectedPlan.overallStatus === "Approved" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {selectedPlan.overallStatus === "Rejected" && (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  {selectedPlan.overallStatus === "Pending Approval" && (
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>{selectedPlan.overallStatus}</span>
                </span>
              </div>
            </div>

            {selectedPlan.description && (
              <p className="text-xs text-slate-600 italic leading-relaxed">
                &quot;{selectedPlan.description}&quot;
              </p>
            )}
          </section>

          {/* Endorsement Committee Votes from Database */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0A3C2F]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Endorsement Committee Votes & Member Remarks
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {selectedPlan.memberVotes.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border transition-all ${
                    member.voteStatus === "Approved"
                      ? "border-emerald-200 bg-emerald-50/20"
                      : member.voteStatus === "Rejected"
                        ? "border-rose-200 bg-rose-50/20"
                        : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">
                        {member.name}
                      </h4>
                      {member.email && (
                        <p className="text-xs text-slate-500 font-mono">
                          {member.email}
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        member.voteStatus === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : member.voteStatus === "Rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {member.voteStatus === "Approved" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      {member.voteStatus === "Rejected" && (
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      )}
                      {member.voteStatus === "Pending" && (
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
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
                    <p className="text-[11px] text-slate-400 font-mono pt-1">
                      Voted at: {member.votedAt}
                    </p>
                  )}
                </div>
              ))}
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

          {/* IN-PAGE REVISION & RESEND SECTION FOR REJECTED PLANS */}
          {selectedPlan.overallStatus === "Rejected" && (
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-amber-200/60 pb-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                  <RotateCcw className="h-4.5 w-4.5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-950">
                    Return Plan to Officer for Revision
                  </h3>
                  <p className="text-xs text-amber-800/80">
                    Provide feedback or instructions detailing adjustments
                    required by the officer before resubmitting the plan.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#0A3C2F]" />
                  <span>
                    Feedback / Revision Instructions for Officer{" "}
                    <span className="text-rose-600">*</span>
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={resendComment}
                  onChange={(e) => setResendComment(e.target.value)}
                  placeholder="Type feedback and revision instructions for the procurement officer..."
                  className="w-full p-3 rounded-xl border border-amber-300/80 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F] outline-none text-xs text-slate-800 bg-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResendToOfficer}
                  disabled={!resendComment.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#0A3C2F] hover:bg-[#072a21] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Resend to Officer for Revision</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: MAIN COMMITTEE PROGRESS TABLE */
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Plan Number, Title or Project..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0A3C2F] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Sectors</option>
                  <option value="Livestock & Pastoral Development">
                    Livestock & Pastoral Development
                  </option>
                  <option value="Agribusiness & Rural Finance">
                    Agribusiness & Rural Finance
                  </option>
                  <option value="Crops & Horticulture Directorate">
                    Crops & Horticulture Directorate
                  </option>
                  <option value="Natural Resources & Climate Change">
                    Natural Resources & Climate Change
                  </option>
                  <option value="Agricultural Mechanization & Infrastructure">
                    Agricultural Mechanization & Infrastructure
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending Approval">Pending Approval</option>
                </select>
              </div>
            </div>
          </div>

          {/* Committee Progress Directory Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-240">
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-40">Plan Number</th>
                    <th className="py-3.5 px-4 min-w-60">
                      Plan Title & Project
                    </th>
                    <th className="py-3.5 px-4 min-w-45">Sector</th>
                    <th className="py-3.5 px-4 text-center min-w-45">
                      Committee Voting
                    </th>
                    <th className="py-3.5 px-4 text-center min-w-35">Status</th>
                    <th className="py-3.5 px-4 text-center min-w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-slate-500"
                      >
                        <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                          No committee progress records found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Plan Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                          {item.planNumber}
                        </td>

                        {/* Plan Title & Project */}
                        <td className="py-3.5 px-4 min-w-56 max-w-xs wrap-break-word">
                          <p className="font-bold text-slate-950 text-xs leading-snug wrap-break-word line-clamp-2">
                            {item.planTitle}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug wrap-break-word line-clamp-2">
                            {item.projectName}
                          </p>
                        </td>

                        {/* Sector */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {item.sector}
                        </td>

                        {/* Clean Committee Members Voting Boxes (No extra text/padding) */}
                        <td className="py-3.5 px-4 text-center">
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

                        {/* Status (Approved, Rejected, Pending Approval) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                              item.overallStatus === "Approved"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.overallStatus === "Rejected"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {item.overallStatus}
                          </span>
                        </td>

                        {/* Action (Eye Icon) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPlan(item)}
                            title="View Committee Feedback & Decisions"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0A3C2F] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer mx-auto shadow-2xs"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
