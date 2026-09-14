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
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  downloadProjectExcelTemplate,
  parseProjectsFromExcel,
  type ParsedProjectsResult,
} from "../../utils/projectExcelUtils";
import { importProjects } from "@/lib/projectsApi";

export function ProjectExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: { created: number; updated: number }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedProjectsResult | null>(
    null,
  );
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "invalid">(
    "all",
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
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
      const result = await parseProjectsFromExcel(selectedFile);
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

  async function handleDownloadTemplate() {
    setIsDownloadingTemplate(true);
    try {
      await downloadProjectExcelTemplate();
    } catch (err) {
      console.error("Template download error:", err);
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  async function handleConfirmImport() {
    if (!file || !parseResult || parseResult.validCount === 0) return;
    setIsUploading(true);
    setParseError(null);

    try {
      const result = await importProjects(file);
      onImportSuccess({
        created: result.created,
        updated: result.updated,
      });
      handleClose();
    } catch (err: any) {
      setParseError(
        err?.message ||
          "Failed to upload and import projects. Please check the backend connection.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setParseResult(null);
    setParseError(null);
    setIsParsing(false);
    setIsUploading(false);
    onClose();
  }

  const displayedRows =
    parseResult?.rows.filter((row) => {
      if (filterMode === "valid") return row.isValid;
      if (filterMode === "invalid") return !row.isValid;
      return true;
    }) || [];

  return (
    <div
      aria-labelledby="project-import-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A3C2F] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="project-import-modal-title"
                className="text-base font-bold text-white tracking-tight"
              >
                Import Projects from Excel
              </h2>
              <p className="text-xs text-emerald-100/80">
                Upload a spreadsheet to import or update MoA projects in bulk as
                Draft.
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            onClick={handleClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Download Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-emerald-950">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-[#0A3C2F]">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0A3C2F]">
                  Need the official Project template?
                </h3>
                <p className="mt-0.5 text-xs text-emerald-900/80">
                  Includes Project Code, Project Name, Funding Source ID, Sector
                  ID, and Status columns.
                </p>
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A3C2F] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#072b22] transition shrink-0 cursor-pointer"
              disabled={isDownloadingTemplate}
              onClick={handleDownloadTemplate}
              type="button"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Download Template (.xlsx)</span>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
              isDragOver
                ? "border-[#0A3C2F] bg-emerald-50/50 scale-[0.99]"
                : "border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileInputChange}
              type="file"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200 text-slate-600 mb-3">
              <UploadCloud className="h-6 w-6 text-[#0A3C2F]" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {file
                ? file.name
                : "Click to select or drag and drop your spreadsheet"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
            </p>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-[#0A3C2F]" />
              <span className="text-sm font-medium">
                Inspecting spreadsheet columns and validating rows...
              </span>
            </div>
          )}

          {/* Error Notice */}
          {parseError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Import Error</p>
                <p className="mt-0.5 whitespace-pre-wrap">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parseResult && !isParsing && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    File:{" "}
                    <span className="font-mono text-slate-600">
                      {parseResult.fileName}
                    </span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-600">
                    Found <strong>{parseResult.totalRows}</strong> row
                    {parseResult.totalRows === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filterMode === "all"
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setFilterMode("all")}
                    type="button"
                  >
                    All ({parseResult.totalRows})
                  </button>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filterMode === "valid"
                        ? "bg-emerald-700 text-white"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                    onClick={() => setFilterMode("valid")}
                    type="button"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Valid ({parseResult.validCount})
                  </button>
                  {parseResult.invalidCount > 0 && (
                    <button
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        filterMode === "invalid"
                          ? "bg-red-700 text-white"
                          : "bg-red-50 text-red-800 hover:bg-red-100"
                      }`}
                      onClick={() => setFilterMode("invalid")}
                      type="button"
                    >
                      <AlertCircle className="h-3 w-3" />
                      Needs Attention ({parseResult.invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-bold text-slate-700 border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">Row</th>
                      <th className="px-3 py-2.5">Project Code</th>
                      <th className="px-3 py-2.5">Project Name</th>
                      <th className="px-3 py-2.5">Funding Source</th>
                      <th className="px-3 py-2.5">Sector</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-center">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-slate-500 italic"
                          colSpan={7}
                        >
                          No project rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={
                            row.isValid
                              ? "hover:bg-slate-50"
                              : "bg-red-50/40 hover:bg-red-50/70"
                          }
                        >
                          <td className="px-3 py-2 text-center text-slate-500 font-mono">
                            {row.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">
                            {row.code || "—"}
                          </td>
                          <td
                            className="px-3 py-2 text-slate-700 max-w-[200px] truncate"
                            title={row.name}
                          >
                            {row.name || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.fundingSourceCode || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.sectorCode || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 rounded">
                              Draft
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800"
                                title={row.validationError}
                              >
                                <AlertCircle className="h-2.5 w-2.5" />
                                {row.validationError || "Invalid"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
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
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A3C2F] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#072b22] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={
              !file ||
              isParsing ||
              isUploading ||
              !parseResult ||
              parseResult.validCount === 0
            }
            onClick={handleConfirmImport}
            type="button"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing Projects...</span>
              </>
            ) : (
              <>
                <span>
                  Import {parseResult?.validCount || 0} Project
                  {parseResult?.validCount === 1 ? "" : "s"} as Draft
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
