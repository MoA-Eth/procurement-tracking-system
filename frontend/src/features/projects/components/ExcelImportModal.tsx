"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  downloadActivityExcelTemplate,
  parseActivitiesFromExcel,
  type ParsedActivitiesResult,
  type ParsedActivityRow,
} from "../utils/projectExcelUtils";
import type { ProcurementActivitySummary } from "../data/officerActivityDrafts";

export function ExcelImportModal({
  isOpen,
  onClose,
  onImport,
  planName,
  projectCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedActivities: ProcurementActivitySummary[]) => void;
  planName?: string;
  projectCode?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedActivitiesResult | null>(
    null,
  );
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "invalid">(
    "all",
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFileSelect(selectedFile: File) {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      setParseError(
        "Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.",
      );
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const result = await parseActivitiesFromExcel(selectedFile, planName);
      setParseResult(result);
    } catch (err: any) {
      setParseError(
        err?.message || "Failed to parse the Excel file. Please check format.",
      );
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      void handleFileSelect(e.target.files[0]);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function resetFile() {
    setFile(null);
    setParseResult(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleConfirmImport() {
    if (!parseResult || parseResult.activities.length === 0) return;
    onImport(parseResult.activities);
    onClose();
  }

  const displayedRows =
    parseResult?.rows.filter((r) => {
      if (filterMode === "valid") return r.isValid;
      if (filterMode === "invalid") return !r.isValid;
      return true;
    }) || [];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A3C2F] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Import Procurement Activities from Excel
              </h2>
              <p className="text-xs text-emerald-100/80">
                {planName
                  ? `Importing into plan: ${planName}`
                  : "Import activities into plan"}
                {projectCode ? ` (${projectCode})` : ""}
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!parseResult ? (
            /* File Dropzone & Template section */
            <div className="space-y-5">
              <div
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                  isDragOver
                    ? "border-[#006837] bg-emerald-50/50 scale-[0.99]"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={onFileInputChange}
                  ref={fileInputRef}
                  type="file"
                />

                {isParsing ? (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="h-10 w-10 animate-spin text-[#006837]" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Reading and analyzing Excel file...
                    </p>
                    <p className="text-xs text-slate-500">
                      Parsing sheets, columns, and rows...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200 text-[#006837] mb-3">
                      <UploadCloud className="h-6 w-6 text-[#0A3C2F]" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Click to upload or drag &amp; drop Excel file
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Supports .xlsx, .xls, and .csv files up to 10MB
                    </p>
                  </>
                )}
              </div>

              {parseError && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Error reading file</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Template Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-emerald-950">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-[#0A3C2F]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#0A3C2F]">
                      Need the standard Activity Excel format?
                    </h3>
                    <p className="mt-0.5 text-xs text-emerald-900/80">
                      Download our pre-formatted template with sample columns
                      &amp; rows
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006837] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#00552c] transition shrink-0 cursor-pointer"
                  onClick={() =>
                    downloadActivityExcelTemplate(planName || "PLAN-2018-01")
                  }
                  type="button"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Activity Template (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Preview Section */
            <div className="space-y-4">
              {/* File details & reset */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-5 w-5 text-[#0A3C2F]" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {parseResult.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {parseResult.totalRows} total rows found
                    </p>
                  </div>
                </div>
                <button
                  className="text-xs font-semibold text-[#1261a8] hover:underline cursor-pointer"
                  onClick={resetFile}
                  type="button"
                >
                  Choose another file
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Rows
                  </p>
                  <p className="text-xl font-semibold text-slate-800">
                    {parseResult.totalRows}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                    Ready to Import
                  </p>
                  <p className="text-xl font-semibold text-emerald-800">
                    {parseResult.validCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Warnings / Errors
                  </p>
                  <p className="text-xl font-semibold text-slate-800">
                    {parseResult.invalidCount}
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      filterMode === "all"
                        ? "bg-[#006837] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setFilterMode("all")}
                    type="button"
                  >
                    All Rows ({parseResult.totalRows})
                  </button>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      filterMode === "valid"
                        ? "bg-[#006837] text-white shadow-2xs"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                    }`}
                    onClick={() => setFilterMode("valid")}
                    type="button"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Valid Only ({parseResult.validCount})
                  </button>
                  {parseResult.invalidCount > 0 && (
                    <button
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        filterMode === "invalid"
                          ? "bg-rose-700 text-white shadow-2xs"
                          : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
                      }`}
                      onClick={() => setFilterMode("invalid")}
                      type="button"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Errors Only ({parseResult.invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-10">
                      <th className="px-3 py-2.5 w-12 text-center">#</th>
                      <th className="px-3 py-2.5 w-20 text-center">Status</th>
                      <th className="px-3 py-2.5">Reference</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Method ID</th>
                      <th className="px-3 py-2.5 text-right">
                        Estimated Budget
                      </th>
                      <th className="px-3 py-2.5">Market Approach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {displayedRows.map((row, i) => (
                      <tr
                        className={`hover:bg-slate-50 ${
                          !row.isValid ? "bg-rose-50/40" : ""
                        }`}
                        key={i}
                      >
                        <td className="px-3 py-2 text-center text-slate-500 font-mono">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/80">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 border border-rose-200/80"
                              title={row.validationError}
                            >
                              <AlertCircle className="h-3 w-3 text-rose-600" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                          {row.reference}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 max-w-xs truncate">
                          {row.description}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.category}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.method}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                          {row.estimatedAmount
                            ? `${row.currency || "ETB"} ${row.estimatedAmount.toLocaleString()}`
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[140px]">
                          {row.marketApproach || row.currentStage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            onClick={() => {
              resetFile();
              onClose();
            }}
            type="button"
          >
            Cancel
          </button>

          {parseResult && (
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-[#006837] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#00552c] disabled:opacity-50 transition cursor-pointer"
              disabled={parseResult.validCount === 0}
              onClick={handleConfirmImport}
              type="button"
            >
              Confirm &amp; Import {parseResult.validCount} Activities
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
