"use client";

import { FileSpreadsheet } from "lucide-react";
import { REPORT_LIST, type ReportType } from "../types";

export interface ReportTypeSelectorProps {
  activeReport: ReportType;
  onSelectReport: (report: ReportType) => void;
  onExport: () => void;
  isExporting: boolean;
}

export function ReportTypeSelector({
  activeReport,
  onSelectReport,
  onExport,
  isExporting,
}: ReportTypeSelectorProps) {
  return (
    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
      {/* Top Bar: Title on left + Export to Excel button on right */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Select Report Type
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
        {REPORT_LIST.map((item) => {
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
