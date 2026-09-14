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
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  downloadPlanExcelTemplate,
  parsePlansFromExcel,
  type ParsedPlansResult,
} from "../utils/projectExcelUtils";
import type { ProcurementPlanSummary } from "../data/officerProjects";

export function PlanExcelImportModal({
  isOpen,
  onClose,
  onImport,
  projectName,
  projectCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedPlans: ProcurementPlanSummary[]) => void;
  projectName?: string;
  projectCode?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedPlansResult | null>(null);
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
      const result = await parsePlansFromExcel(selectedFile, projectCode);
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
    if (!parseResult || parseResult.plans.length === 0) return;
    onImport(parseResult.plans);
    onClose();
    resetFile();
  }

  const displayedRows = parseResult
    ? parseResult.rows.filter((r) => {
        if (filterMode === "valid") return r.isValid;
        if (filterMode === "invalid") return !r.isValid;
        return true;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A3C2F] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-xs">
              <FileSpreadsheet className="h-5 w-5 text-[#86efac]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Import Procurement Plans from Excel
              </h2>
              <p className="text-xs text-slate-300">
                {projectName
                  ? `Import plans into project: ${projectName} (${projectCode || ""})`
                  : projectCode
                    ? `Project Code: ${projectCode}`
                    : "Upload Excel or CSV file to bulk import plans"}
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            onClick={() => {
              resetFile();
              onClose();
            }}
            type="button"
          >
            <X className="h-5 w-5" />
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
                    ? "border-[#176c55] bg-[#edf5f1]"
                    : "border-slate-300 bg-slate-50/70 hover:border-[#176c55] hover:bg-[#edf5f1]/50"
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
                    <Loader2 className="h-10 w-10 animate-spin text-[#176c55]" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Reading and analyzing Excel file...
                    </p>
                    <p className="text-xs text-slate-500">
                      Parsing sheets, columns, and rows...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf5f1] text-[#176c55] mb-3 shadow-2xs">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload or drag &amp; drop Excel file
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Supports .xlsx, .xls, and .csv files up to 10MB
                    </p>
                  </>
                )}
              </div>

              {parseError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Error reading file</p>
                    <p className="mt-0.5 text-red-700">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Template Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[#176c55] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Need the standard Plan Excel format?
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Download our pre-formatted template with sample columns
                      &amp; rows
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#125442] bg-[#176c55] px-3 text-xs font-semibold text-white hover:bg-[#125f4c] shadow-2xs transition cursor-pointer"
                  onClick={() => downloadPlanExcelTemplate(projectCode)}
                  type="button"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Plan Template (.xlsx)
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Preview Section */
            <div className="space-y-4">
              {/* File details & reset */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-5 w-5 text-[#176c55]" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Rows
                  </p>
                  <p className="text-xl font-extrabold text-slate-800">
                    {parseResult.totalRows}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Ready to Import
                  </p>
                  <p className="text-xl font-extrabold text-emerald-800">
                    {parseResult.validCount}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Warnings / Errors
                  </p>
                  <p className="text-xl font-extrabold text-amber-800">
                    {parseResult.invalidCount}
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      filterMode === "all"
                        ? "bg-[#176c55] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setFilterMode("all")}
                    type="button"
                  >
                    All Rows ({parseResult.totalRows})
                  </button>
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      filterMode === "valid"
                        ? "bg-[#176c55] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setFilterMode("valid")}
                    type="button"
                  >
                    Valid Only ({parseResult.validCount})
                  </button>
                  {parseResult.invalidCount > 0 && (
                    <button
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        filterMode === "invalid"
                          ? "bg-amber-600 text-white"
                          : "text-amber-700 hover:bg-amber-50"
                      }`}
                      onClick={() => setFilterMode("invalid")}
                      type="button"
                    >
                      Errors Only ({parseResult.invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#0A3C2F] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                      <th className="px-3 py-2.5 w-12 text-center">#</th>
                      <th className="px-3 py-2.5 w-20 text-center">Status</th>
                      <th className="px-3 py-2.5">Plan Title</th>
                      <th className="px-3 py-2.5">Fiscal Year</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Organization</th>
                      <th className="px-3 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {displayedRows.map((row, i) => (
                      <tr
                        className={`hover:bg-slate-50 ${
                          !row.isValid ? "bg-red-50/40" : ""
                        }`}
                        key={i}
                      >
                        <td className="px-3 py-2 text-center text-slate-500 font-mono">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800"
                              title={row.validationError}
                            >
                              <AlertCircle className="h-3 w-3 text-red-600" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800 max-w-xs truncate">
                          {row.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {row.budgetYear}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.category}
                        </td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]">
                          {row.organizationRegion}
                        </td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]">
                          {row.description || "-"}
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
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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
              className="inline-flex items-center gap-2 rounded-lg border border-[#125442] bg-[#176c55] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#125f4c] disabled:opacity-50 transition cursor-pointer"
              disabled={parseResult.validCount === 0}
              onClick={handleConfirmImport}
              type="button"
            >
              Confirm &amp; Import {parseResult.validCount} Plans
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
