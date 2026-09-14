"use client";

import { UserCheck, Search, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { ProjectOfficer } from "../projectsData";

export interface Step4OfficersReviewProps {
  officersList: ProjectOfficer[];
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
}

export function Step4OfficersReview({
  officersList,
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
}: Step4OfficersReviewProps) {
  const filteredOfficers = officersList.filter(
    (off) =>
      off.name.toLowerCase().includes(officerSearch.toLowerCase()) ||
      (off.roleTag &&
        off.roleTag.toLowerCase().includes(officerSearch.toLowerCase())) ||
      off.email.toLowerCase().includes(officerSearch.toLowerCase()),
  );

  const displayDonor =
    fundingSource === "Other (Specify Custom Donor)"
      ? customFundingSource || "Custom Funding Source"
      : fundingSource;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Officer Selection Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-[#0A3C2F]" />
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

        {/* Officer Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={officerSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search officers by name, role, or email..."
            className="w-full rounded-xl bg-slate-50/80 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Officers Grid Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
          {filteredOfficers.map((off) => {
            const isSelected = selectedOfficerIds.includes(off.id);
            return (
              <div
                key={off.id}
                onClick={() => onToggleOfficer(off.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2 ${
                  isSelected
                    ? "bg-emerald-50/80 border-emerald-400 shadow-2xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {off.name}
                  </p>
                  <p className="text-[11px] font-semibold text-[#0A3C2F] truncate">
                    {off.roleTag}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {off.email}
                  </p>
                </div>

                <div
                  className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Review Card */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-extrabold tracking-tight">
              Project Registration Summary
            </h3>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              selectedOfficerIds.length > 0
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
            }`}
          >
            {selectedOfficerIds.length > 0
              ? "Ready for Submit (Active)"
              : "Save as Draft (Unassigned)"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Code
            </span>
            <span className="font-extrabold text-emerald-300">
              {code || "N/A"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Sector
            </span>
            <span className="font-bold text-white truncate block">
              {sector}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Donor
            </span>
            <span className="font-bold text-white truncate block">
              {displayDonor}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Assigned Officers
            </span>
            <span
              className={`font-extrabold ${
                selectedOfficerIds.length > 0
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {selectedOfficerIds.length > 0
                ? `${selectedOfficerIds.length} Selected`
                : "0 Selected (Draft)"}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Name: <strong className="text-white">{name || "N/A"}</strong>
          </span>
          <span>
            Components:{" "}
            <strong className="text-white">{componentsCount} Major</strong>
          </span>
          <span>
            Currency: <strong className="text-white">{currency}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
