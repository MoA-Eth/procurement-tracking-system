"use client";

import {
  CheckCircle2,
  Search,
  FileText,
  ChevronRight,
  Home,
  Filter,
} from "lucide-react";
import Link from "next/link";
import type { ProcurementPlan } from "../../plansData";
import { VersionHistoryModal } from "../VersionHistoryModal";
import { CommitteeDeadlineModal } from "./CommitteeDeadlineModal";

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
  loading: boolean;
  onSelectPlan: (plan: ProcurementPlan) => void;
  historyModalPlan: ProcurementPlan | null;
  setHistoryModalPlan: (plan: ProcurementPlan | null) => void;
  pendingApprovePlan: ProcurementPlan | null;
  setPendingApprovePlan: (plan: ProcurementPlan | null) => void;
  committeeDeadlineDate: string;
  setCommitteeDeadlineDate: (date: string) => void;
  onApprovePlan: (plan: ProcurementPlan, deadline?: string) => void;
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
  loading,
  onSelectPlan,
  historyModalPlan,
  setHistoryModalPlan,
  pendingApprovePlan,
  setPendingApprovePlan,
  committeeDeadlineDate,
  setCommitteeDeadlineDate,
  onApprovePlan,
}: PlanReviewDirectoryTableProps) {
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
        <span className="font-bold text-[#0A3C2F]">
          {userRole === "ENDORSING_COMMITTEE"
            ? "Committee Plan for Review"
            : "Plan for Review"}
        </span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {userRole === "ENDORSING_COMMITTEE"
              ? "Endorsement Committee — Plans for Review"
              : "Director — Plan for Review"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {userRole === "ENDORSING_COMMITTEE"
              ? "Review procurement plans awaiting committee endorsement and record your approval or rejection vote."
              : "Review procurement plans submitted by Officers, examine activities, and approve or return for revision."}
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
            placeholder="Search plans by Project Code or Plan Name..."
            className="w-full pl-10 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-[#0A3C2F] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
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
              <option value="Consultancy Services">Consultancy Services</option>
            </select>
          </div>

          {/* Budget Year Filter */}
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

          {/* Region / Unit Filter */}
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

      {/* Tabular Plans Pending Review */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1080px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-3.5 text-center w-12">#</th>
                <th className="py-3.5 px-3.5 w-36">Project Code</th>
                <th className="py-3.5 px-3.5 min-w-[256px] max-w-[320px]">
                  Plan Name
                </th>
                <th className="py-3.5 px-3.5 w-36">Category</th>
                <th className="py-3.5 px-3.5 w-28">Budget Year</th>
                <th className="py-3.5 px-3.5 w-44">Coverage Period</th>
                <th className="py-3.5 px-3.5 w-36">Region / Unit</th>
                <th className="py-3.5 px-3.5 w-40">Responsible Officer</th>
                <th className="py-3.5 px-3.5 text-center w-36">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    Loading plans from server...
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">
                      No procurement plans awaiting review
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Plans submitted by Officers will appear here
                      automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan, index) => (
                  <tr
                    key={plan.id}
                    onClick={() => onSelectPlan(plan)}
                    className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3.5 font-mono text-slate-400 font-semibold text-center">
                      {index + 1}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="font-mono font-extrabold text-[#0A3C2F] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs inline-block max-w-[128px] truncate">
                        {plan.projectCode}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 min-w-[256px] max-w-[320px] break-words">
                      <p className="font-bold text-slate-900 text-xs leading-snug group-hover:text-[#0A3C2F] break-words">
                        {plan.planName}
                      </p>
                      {plan.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug break-words line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-3.5 font-bold text-slate-800">
                      {plan.category}
                    </td>

                    <td className="py-3 px-3.5 font-semibold text-slate-800">
                      {plan.budgetYear}
                    </td>

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

                    <td className="py-3 px-3.5 font-semibold text-slate-800">
                      {plan.organizationRegion}
                    </td>

                    <td className="py-3 px-3.5 font-semibold text-slate-900 text-xs">
                      {plan.assignedOfficer ||
                        plan.createdBy ||
                        "Procurement Officer"}
                    </td>

                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          plan.status === "Submitted to Director"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : plan.status === "Committee Review"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : plan.status === "Returned"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyModalPlan && (
        <VersionHistoryModal
          currentStatus={historyModalPlan.status}
          isOpen={Boolean(historyModalPlan)}
          onClose={() => setHistoryModalPlan(null)}
          planId={historyModalPlan.id}
          planName={historyModalPlan.planName}
          projectCode={historyModalPlan.projectCode}
        />
      )}

      {/* Committee Deadline Modal */}
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
