"use client";

import { Calendar } from "lucide-react";

interface DirectorTopFilterBarProps {
  selectedFiscalYear: string;
  onSelectFiscalYear: (year: string) => void;
  availableFiscalYears?: string[];
  selectedSector: string;
  onSelectSector: (sector: string) => void;
  availableSectors: string[];
  selectedProject: string;
  onSelectProject: (projectId: string) => void;
  availableProjects: { id: string; name: string }[];
  totalProjectsCount: number;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  isFiltered: boolean;
  onReset: () => void;
}

export function DirectorTopFilterBar({
  selectedFiscalYear,
  onSelectFiscalYear,
  availableFiscalYears = [],
  selectedSector,
  onSelectSector,
  availableSectors,
  selectedProject,
  onSelectProject,
  availableProjects,
  totalProjectsCount: _totalProjectsCount,
  selectedStatus,
  onSelectStatus,
  isFiltered,
  onReset,
}: DirectorTopFilterBarProps) {
  // Find selected project display name
  const currentProjectName =
    selectedProject === "ALL"
      ? "All Projects"
      : availableProjects.find((p) => p.id === selectedProject)?.name ||
        "Project";

  // Ensure selected year is in options if not All Fiscal Years
  const fiscalYearOptions = Array.from(
    new Set(
      [
        ...availableFiscalYears,
        ...(selectedFiscalYear && selectedFiscalYear !== "All Fiscal Years"
          ? [selectedFiscalYear]
          : []),
      ].filter(Boolean),
    ),
  );

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 flex-nowrap w-full py-0.5 overflow-x-auto no-scrollbar">
      {/* 1. Fiscal Year Pill: Light mint background, green border, calendar icon, no chevron */}
      <div className="relative inline-flex items-center shrink-0">
        <div className="flex items-center gap-2 bg-[#e2ede7] hover:bg-[#d6e7dd] border border-[#2d6a4f] rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-[#1b4332] shadow-2xs transition-colors pointer-events-none">
          <Calendar className="h-3.5 w-3.5 text-[#2d6a4f] shrink-0" />
          <span className="whitespace-nowrap">{selectedFiscalYear}</span>
        </div>
        <select
          value={selectedFiscalYear}
          onChange={(e) => onSelectFiscalYear(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Filter by Fiscal Year"
        >
          {fiscalYearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
          <option value="All Fiscal Years">All Fiscal Years</option>
        </select>
      </div>

      {/* 2. Sector Pill: White rounded-lg pill with dark text and small solid triangle */}
      <div className="relative inline-flex items-center shrink-0">
        <div className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-900 shadow-2xs transition-colors pointer-events-none">
          <span className="whitespace-nowrap max-w-[150px] truncate">
            {selectedSector}
          </span>
          <span className="text-[9px] text-slate-900 leading-none select-none">
            &#9662;
          </span>
        </div>
        <select
          value={selectedSector}
          onChange={(e) => onSelectSector(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Filter by Sector"
        >
          <option value="All Sectors">All Sectors</option>
          {availableSectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Project Pill: White rounded-lg pill with "All Projects ▼" */}
      <div className="relative inline-flex items-center shrink-0">
        <div className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-900 shadow-2xs transition-colors pointer-events-none">
          <span className="whitespace-nowrap max-w-[160px] truncate">
            {currentProjectName}
          </span>
          <span className="text-[9px] text-slate-900 leading-none select-none">
            &#9662;
          </span>
        </div>
        <select
          value={selectedProject}
          onChange={(e) => onSelectProject(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Filter by Project"
        >
          <option value="ALL">All Projects</option>
          {availableProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Status Pill: White rounded-lg pill with "All Statuses ▼" */}
      <div className="relative inline-flex items-center shrink-0">
        <div className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-900 shadow-2xs transition-colors pointer-events-none">
          <span className="whitespace-nowrap max-w-[140px] truncate">
            {selectedStatus === "ALL" ? "All Statuses" : selectedStatus}
          </span>
          <span className="text-[9px] text-slate-900 leading-none select-none">
            &#9662;
          </span>
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => onSelectStatus(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Filter by Status"
        >
          <option value="ALL">All Statuses</option>
          <option value="Awaiting Review">Awaiting Review</option>
          <option value="In Progress">In Progress</option>
          <option value="Delayed">Delayed</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Reset Button */}
      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-emerald-700 font-medium underline underline-offset-2 cursor-pointer transition-colors px-1 shrink-0"
        >
          Reset
        </button>
      )}
    </div>
  );
}
