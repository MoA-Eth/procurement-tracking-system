"use client";

import { useState } from "react";
import { FileSpreadsheet, Layers } from "lucide-react";
import { REPORT_LIST, type ReportType, type ReportCategory } from "../types";

export interface ReportTypeSelectorProps {
  activeReport: ReportType;
  onSelectReport: (report: ReportType) => void;
  onExport: () => void;
  isExporting: boolean;
}

const CATEGORY_TABS: { id: ReportCategory | "all"; label: string }[] = [
  { id: "all", label: "All Reports (14)" },
  { id: "planning", label: "Planning & Roadmaps (5)" },
  { id: "periodic", label: "Periodic (3)" },
  { id: "contracts", label: "Contracts & Finance (3)" },
  { id: "organization", label: "Organizational (3)" },
];

export function ReportTypeSelector({
  activeReport,
  onSelectReport,
  onExport,
  isExporting,
}: ReportTypeSelectorProps) {
  const [selectedCat, setSelectedCat] = useState<ReportCategory | "all">("all");

  const filteredReports =
    selectedCat === "all"
      ? REPORT_LIST
      : REPORT_LIST.filter((r) => r.category === selectedCat);

  return (
    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
      {/* Top Bar: Title + Category filters on left, Export button on right */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Category:</span>
          </div>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCat(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCat === tab.id
                  ? "bg-[#0A3C2F] text-white shadow-2xs"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#A3E635]" />
          <span>{isExporting ? "Generating Excel…" : "Export to Excel"}</span>
        </button>
      </div>

      {/* Horizontally Scrollable Report Type Pills with P0/P1 Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {filteredReports.map((item) => {
          const isActive =
            activeReport === item.id ||
            (activeReport === "monthly-summary" && item.id === "monthly-procurement") ||
            (activeReport === "detailed-procurement" && item.id === "quarterly-detailed") ||
            (activeReport === "project-officer" && item.id === "officer-summary");

          return (
            <button
              key={item.id}
              onClick={() => onSelectReport(item.id)}
              title={item.description}
              className={`shrink-0 whitespace-nowrap text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-2 ${
                isActive
                  ? "bg-emerald-50 text-[#0A3C2F] font-bold border-emerald-300 border-l-4 border-l-[#0A3C2F] shadow-2xs"
                  : "bg-slate-50/70 hover:bg-slate-100 text-slate-600 border-slate-200/60 border-l-4 border-l-transparent"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                  item.priority === "P0"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {item.priority}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
