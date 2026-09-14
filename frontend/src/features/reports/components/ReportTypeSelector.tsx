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
      {/* Top Bar: Title on left + Export to Excel button on right (ABOVE the pills) */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Select Report Type
        </div>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#A3E635]" />
          <span>{isExporting ? "Generating Excel…" : "Export to Excel"}</span>
        </button>
      </div>

      {/* Bottom Row: Horizontally Scrollable Report Type Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {REPORT_LIST.map((item) => {
          const isActive = activeReport === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectReport(item.id)}
              className={`shrink-0 whitespace-nowrap text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isActive
                  ? "bg-slate-100/90 text-[#0A3C2F] font-bold border-slate-300 border-l-4 border-l-[#0A3C2F] shadow-2xs"
                  : "bg-slate-50/70 hover:bg-slate-100 text-slate-600 border-slate-200/60 border-l-4 border-l-transparent"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
