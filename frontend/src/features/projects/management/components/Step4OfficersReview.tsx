"use client";

import {
  UserCheck,
  Search,
  ShieldCheck,
  CheckCircle2,
  Users,
  Briefcase,
  Check,
  Minus,
  X,
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
  onSelectOfficers?: (ids: string[]) => void;

  // Project Summary Data for Final Review Card
  code: string;
  name: string;
  sector: string;
  fundingSources: string[];
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
  onSelectOfficers,
  code,
  name,
  sector,
  fundingSources,
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

  const filteredIds = filteredOfficers.map((o) => o.id);
  const allFilteredSelected =
    filteredOfficers.length > 0 &&
    filteredOfficers.every((off) => selectedOfficerIds.includes(off.id));
  const someFilteredSelected =
    filteredOfficers.some((off) => selectedOfficerIds.includes(off.id)) &&
    !allFilteredSelected;

  const handleToggleFiltered = () => {
    if (allFilteredSelected) {
      if (onSelectOfficers) {
        onSelectOfficers(
          selectedOfficerIds.filter((id) => !filteredIds.includes(id)),
        );
      } else {
        filteredOfficers.forEach((off) => {
          if (selectedOfficerIds.includes(off.id)) {
            onToggleOfficer(off.id);
          }
        });
      }
    } else {
      if (onSelectOfficers) {
        onSelectOfficers(
          Array.from(new Set([...selectedOfficerIds, ...filteredIds])),
        );
      } else {
        filteredOfficers.forEach((off) => {
          if (!selectedOfficerIds.includes(off.id)) {
            onToggleOfficer(off.id);
          }
        });
      }
    }
  };

  const displayDonor = (() => {
    const standardSources = fundingSources.filter(
      (s) => s !== "Other (Specify Custom Donor)",
    );
    const hasCustom = fundingSources.includes("Other (Specify Custom Donor)");
    const parts = [
      ...standardSources,
      ...(hasCustom
        ? [customFundingSource || "Custom Funding Source"]
        : []),
    ];
    return parts.length > 0 ? parts.join(", ") : "N/A";
  })();

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
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
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
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Select All ({officersList.length})
            </button>
            <button
              type="button"
              onClick={onClearAllOfficers}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Search Input & Filter Stats */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={officerSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search officers by name, role, email, or project..."
              className="w-full rounded-xl bg-slate-50/80 border border-slate-200 pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
            {officerSearch && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
            <span>
              Showing{" "}
              <strong className="text-slate-800 font-semibold">
                {filteredOfficers.length}
              </strong>{" "}
              of {officersList.length} officers
            </span>
            <span
              className={
                selectedOfficerIds.length > 0
                  ? "text-emerald-700 font-semibold"
                  : "text-slate-500"
              }
            >
              {selectedOfficerIds.length > 0
                ? `${selectedOfficerIds.length} officer${selectedOfficerIds.length > 1 ? "s" : ""} selected`
                : "0 selected (Draft mode)"}
            </span>
          </div>
        </div>

        {/* Officers Tabular View */}
        <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
          <div className="max-h-80 sm:max-h-96 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[680px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase tracking-wider select-none">
                <tr>
                  <th className="w-12 py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFiltered();
                      }}
                      title={
                        allFilteredSelected
                          ? "Deselect all filtered officers"
                          : "Select all filtered officers"
                      }
                      className={`h-4.5 w-4.5 mx-auto rounded border flex items-center justify-center transition-colors cursor-pointer ${
                        allFilteredSelected
                          ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                          : someFilteredSelected
                            ? "bg-emerald-100 border-[#0A3C2F] text-[#0A3C2F]"
                            : "border-slate-300 bg-white hover:border-slate-400"
                      }`}
                    >
                      {allFilteredSelected && (
                        <Check className="h-3 w-3 stroke-[3]" />
                      )}
                      {someFilteredSelected && (
                        <Minus className="h-3 w-3 stroke-[3]" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 min-w-[200px]">Officer</th>
                  <th className="py-3 px-3 min-w-[130px]">Role</th>
                  <th className="py-3 px-3 min-w-[180px]">Email</th>
                  <th className="py-3 px-3 min-w-[220px]">
                    Assigned Projects / Workload
                  </th>
                  <th className="py-3 px-3 text-center min-w-[100px]">
                    Assignment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOfficers.map((off) => {
                  const isSelected = selectedOfficerIds.includes(off.id);
                  const initial = off.name
                    ? off.name.charAt(0).toUpperCase()
                    : "O";
                  const wl = getWorkload(off);

                  return (
                    <tr
                      key={off.id}
                      onClick={() => onToggleOfficer(off.id)}
                      className={`cursor-pointer transition-colors select-none text-xs ${
                        isSelected
                          ? "bg-emerald-50/70 hover:bg-emerald-50/90"
                          : "bg-white hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-12 py-3 px-3 text-center">
                        <div
                          className={`h-4.5 w-4.5 mx-auto rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 stroke-[3]" />
                          )}
                        </div>
                      </td>

                      {/* Officer Name & Avatar */}
                      <td className="py-3 px-3 min-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#0A3C2F] text-white"
                                : "bg-emerald-100/70 text-[#0A3C2F] border border-emerald-200/60"
                            }`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-slate-900 truncate">
                                {off.name}
                              </span>
                              {off.status === "PENDING_INVITATION" && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                                  Invited
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Tag */}
                      <td className="py-3 px-3 min-w-[130px] whitespace-nowrap">
                        <span className="inline-flex items-center text-[10px] font-semibold text-[#0A3C2F] bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                          {off.roleTag || "Procurement Officer"}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 min-w-[180px]">
                        <span
                          className="text-xs text-slate-500 font-normal truncate block max-w-[200px]"
                          title={off.email}
                        >
                          {off.email}
                        </span>
                      </td>

                      {/* Workload */}
                      <td className="py-3 px-3 min-w-[220px]">
                        {wl.totalProjects === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            0 projects (Available)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                              <Briefcase className="h-3 w-3 text-slate-500 shrink-0" />
                              {wl.totalProjects}{" "}
                              {wl.totalProjects === 1 ? "project" : "projects"}
                            </span>
                            {wl.projects.length > 0 && (
                              <span
                                className="text-[10px] font-mono text-slate-500 truncate max-w-[160px]"
                                title={wl.projects
                                  .map((p) => `${p.code}: ${p.name}`)
                                  .join("\n")}
                              >
                                ({wl.projects.map((p) => p.code).join(", ")})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Assignment Indicator */}
                      <td className="py-3 px-3 text-center min-w-[100px] whitespace-nowrap">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-700" />
                            Assigned
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredOfficers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center bg-slate-50/50">
                      <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        {officersList.length === 0
                          ? "No procurement officers found in the system."
                          : "No procurement officers match your search."}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {officersList.length === 0
                          ? "Ensure users with the Procurement Officer role are provisioned in User Management."
                          : "Try adjusting your search query or clear the filter."}
                      </p>
                      {officerSearch && (
                        <button
                          type="button"
                          onClick={() => onSearchChange("")}
                          className="mt-3 inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Search Filter
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
                Project Registration Summary
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Quick review of project configuration before saving
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 self-start sm:self-auto ${
              selectedOfficerIds.length > 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                selectedOfficerIds.length > 0
                  ? "bg-emerald-600 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            {selectedOfficerIds.length > 0
              ? "Ready for Submit (Active)"
              : "Save as Draft (Unassigned)"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">
              Project Code
            </span>
            <span className="font-semibold text-xs text-[#0A3C2F] tracking-tight font-mono">
              {code || "N/A"}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">
              Sector
            </span>
            <span
              className="font-semibold text-xs text-slate-800 truncate block"
              title={sector}
            >
              {sector || "N/A"}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">
              Funding / Donor
            </span>
            <span
              className="font-semibold text-xs text-slate-800 truncate block"
              title={displayDonor}
            >
              {displayDonor || "N/A"}
            </span>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">
              Assigned Officers
            </span>
            <span
              className={`font-semibold text-xs block ${
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
            <strong className="font-semibold text-slate-900">
              {name || "N/A"}
            </strong>
          </span>
          <div className="flex items-center gap-3.5 text-slate-600 font-medium">
            <span>
              Components:{" "}
              <strong className="font-semibold text-slate-900">
                {componentsCount} Major
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Timeline:{" "}
              <strong className="font-semibold text-slate-900 font-mono">
                {startDate && endDate ? `${startDate} → ${endDate}` : "N/A"}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Currency:{" "}
              <strong className="font-semibold text-slate-900 font-mono">
                {currency}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
