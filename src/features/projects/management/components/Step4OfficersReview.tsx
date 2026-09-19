"use client";

import {
  UserCheck,
  Search,
  ShieldCheck,
  CheckCircle2,
  Users,
  Briefcase,
} from "lucide-react";
import type { ProjectOfficer, OfficerWorkload } from "../projectsData";

export interface Step4OfficersReviewProps {
  officersList: ProjectOfficer[];
  workloadMap?: Record<string, OfficerWorkload>;
  currentProjectId?: string;
  selectedOfficerIds: string[];
  officerSearch: string;
  onSearchChange: (search: string) => void;
  onToggleOfficer: (id: string) => void;
  onSelectAllOfficers: () => void;
  onClearAllOfficers: () => void;

  // Project Summary Data for Final Review Card
  code: string;
  name: string;
  sector: string;
  fundingSource: string;
  customFundingSource: string;
  currency: string;
  componentsCount: number;
  startDate?: string;
  endDate?: string;
}

export function Step4OfficersReview({
  officersList,
  workloadMap = {},
  selectedOfficerIds,
  officerSearch,
  onSearchChange,
  onToggleOfficer,
  onSelectAllOfficers,
  onClearAllOfficers,
  code,
  name,
  sector,
  fundingSource,
  customFundingSource,
  currency,
  componentsCount,
  startDate,
  endDate,
}: Step4OfficersReviewProps) {
  const getWorkload = (off: ProjectOfficer): OfficerWorkload => {
    return (
      workloadMap[off.id] ||
      off.workload || {
        officerId: off.id,
        totalProjects: 0,
        projects: [],
        isAssignedToCurrentProject: false,
        loadLevel: "light",
      }
    );
  };

  const filteredOfficers = officersList.filter((off) => {
    const q = officerSearch.trim().toLowerCase();
    if (!q) return true;

    const wl = getWorkload(off);
    return (
      off.name.toLowerCase().includes(q) ||
      (off.roleTag && off.roleTag.toLowerCase().includes(q)) ||
      off.email.toLowerCase().includes(q) ||
      wl.projects.some(
        (p) =>
          p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
    );
  });

  const displayDonor =
    fundingSource === "Other (Specify Custom Donor)"
      ? customFundingSource || "Custom Funding Source"
      : fundingSource;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Officer Selection Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-[#0A3C2F]" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Assign Procurement Officers (Optional)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one or more procurement officers responsible for managing
              procurement plans, or leave unassigned to save as a Draft project.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={onSelectAllOfficers}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Select All ({officersList.length})
            </button>
            <button
              type="button"
              onClick={onClearAllOfficers}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={officerSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search officers by name, role, email, or project..."
            className="w-full rounded-xl bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Officers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredOfficers.map((off) => {
            const isSelected = selectedOfficerIds.includes(off.id);
            const initial = off.name ? off.name.charAt(0).toUpperCase() : "O";
            const wl = getWorkload(off);

            return (
              <div
                key={off.id}
                onClick={() => onToggleOfficer(off.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? "bg-emerald-50/70 border-emerald-400 shadow-2xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
                }`}
              >
                {/* Officer Profile & Checkbox */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                        isSelected
                          ? "bg-[#0A3C2F] text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {off.name}
                        </p>
                        {off.status === "PENDING_INVITATION" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            Invited
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-[#0A3C2F] truncate">
                        {off.roleTag || "Procurement Officer"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {off.email}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>

                {/* Clean, Uncrowded Workload Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-slate-400" />
                    Assigned:
                  </span>
                  <div className="text-right truncate ml-2">
                    {wl.totalProjects === 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        0 projects (Available)
                      </span>
                    ) : (
                      <span
                        className="text-[11px] font-bold text-slate-700"
                        title={wl.projects
                          .map((p) => `${p.code}: ${p.name}`)
                          .join("\n")}
                      >
                        {wl.totalProjects}{" "}
                        {wl.totalProjects === 1 ? "project" : "projects"}{" "}
                        <span className="font-normal text-slate-400 font-mono text-[10px]">
                          ({wl.projects.map((p) => p.code).join(", ")})
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredOfficers.length === 0 && (
            <div className="col-span-full py-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                {officersList.length === 0
                  ? "No procurement officers found in the system."
                  : "No procurement officers match your search."}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {officersList.length === 0
                  ? "Ensure users with the Procurement Officer role are provisioned in User Management."
                  : "Try adjusting your search query."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Professional Light Summary Review Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-200/90 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[#0A3C2F]" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">
                Project Registration Summary
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Quick review of project configuration before saving
              </p>
            </div>
          </div>
          <span
            className={`text-[11px] font-bold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 self-start sm:self-auto ${
              selectedOfficerIds.length > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                selectedOfficerIds.length > 0
                  ? "bg-emerald-600 animate-pulse"
                  : "bg-amber-500"
              }`}
            />
            {selectedOfficerIds.length > 0
              ? "Ready for Submit (Active)"
              : "Save as Draft (Unassigned)"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Project Code
            </span>
            <span className="font-extrabold text-xs text-[#0A3C2F] tracking-tight font-mono">
              {code || "N/A"}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Sector
            </span>
            <span
              className="font-bold text-xs text-slate-800 truncate block"
              title={sector}
            >
              {sector || "N/A"}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Funding / Donor
            </span>
            <span
              className="font-bold text-xs text-slate-800 truncate block"
              title={displayDonor}
            >
              {displayDonor || "N/A"}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Assigned Officers
            </span>
            <span
              className={`font-extrabold text-xs block ${
                selectedOfficerIds.length > 0
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {selectedOfficerIds.length > 0
                ? `${selectedOfficerIds.length} Selected`
                : "0 Selected (Draft)"}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span className="truncate max-w-sm">
            Name:{" "}
            <strong className="font-bold text-slate-900">
              {name || "N/A"}
            </strong>
          </span>
          <div className="flex items-center gap-3.5 text-slate-600 font-medium">
            <span>
              Components:{" "}
              <strong className="font-bold text-slate-900">
                {componentsCount} Major
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Timeline:{" "}
              <strong className="font-bold text-slate-900 font-mono">
                {startDate && endDate ? `${startDate} → ${endDate}` : "N/A"}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Currency:{" "}
              <strong className="font-bold text-slate-900 font-mono">
                {currency}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
