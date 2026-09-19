"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FolderKanban,
  KeyRound,
  Layers,
  Loader2,
  Receipt,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  populatePresentationData,
  PRESENTATION_DIRECTOR,
  PRESENTATION_OFFICER,
  type PopulateProgress,
} from "@/lib/presentationDataPopulator";
import { authenticate } from "@/lib/authApi";

export function PresentationDataModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [cleanPrevious, setCleanPrevious] = useState(true);
  const [progress, setProgress] = useState<PopulateProgress>({
    message: "Ready to populate presentation data",
    percent: 0,
  });
  const [result, setResult] = useState<{
    success: boolean;
    summary: string;
  } | null>(null);

  // Expose global window helper for easy console invocation
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__populatePresentationData = async (opts?: any) => {
        console.log("Starting presentation data population...");
        const res = await populatePresentationData(
          { cleanPreviousProjects: true, ...opts },
          (p) => {
            console.log(`[${p.percent}%] ${p.message}`);
          },
        );
        console.log("Population finished:", res);
        return res;
      };
    }
  }, []);

  const handleStart = async () => {
    setIsRunning(true);
    setResult(null);
    setProgress({ message: "Starting...", percent: 5 });

    try {
      const res = await populatePresentationData(
        { cleanPreviousProjects: cleanPrevious },
        (p) => {
          setProgress(p);
        },
      );
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        summary: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSwitchRole = async (role: "DIRECTOR" | "OFFICER") => {
    setIsSwitching(true);
    try {
      if (role === "DIRECTOR") {
        await authenticate(
          PRESENTATION_DIRECTOR.email,
          PRESENTATION_DIRECTOR.password,
        );
        window.location.href = "/workspace/projects";
      } else {
        await authenticate(
          PRESENTATION_OFFICER.email,
          PRESENTATION_DIRECTOR.password,
        );
        window.location.href = "/dashboard/officer";
      }
    } catch (err: any) {
      alert(
        "Notice switching role: " + (err?.message || "Please login manually"),
      );
    } finally {
      setIsSwitching(false);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer ring-1 ring-white/20 active:scale-98"
        title="Populate Deployed Backend with Presentation Data"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span className="hidden sm:inline">Load Demo Data</span>
        <span className="sm:hidden">Demo Data</span>
      </button>

      {/* Floating Trigger Button on bottom-right of the screen */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold shadow-xl hover:shadow-2xl transition-all cursor-pointer border-2 border-emerald-400/50 hover:scale-105 active:scale-95 animate-bounce duration-1000"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>⚡ Populate Demo Data</span>
        </button>
      </div>

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-[#072F25] to-[#125241] p-5 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10 text-[#A3E635] border border-white/10">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Presentation Data Populator
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#A3E635]/20 text-[#A3E635] font-extrabold border border-[#A3E635]/30">
                        Render DB
                      </span>
                    </h3>
                    <p className="text-xs text-[#A1D9C5] mt-0.5">
                      Fills your deployed backend with realistic data for
                      tomorrow&apos;s presentation.
                    </p>
                  </div>
                </div>
                {!isRunning && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Summary of What Gets Inserted */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                  <FolderKanban className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      4 Flagship Projects
                    </span>
                    <span className="text-[11px] text-slate-600">
                      DRIVE, BREFONS, CALM & RLLP
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100 flex items-start gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      5 Annual Plans
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Approved, Submitted & Drafts
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Diverse Activities
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Milestone stages & delay alerts
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-2.5">
                  <Receipt className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Contracts & Payments
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Suppliers & paid transactions
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles & Key Assignments */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Key Roles for Presentation Demo
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200">
                    <span className="font-bold text-amber-950 block flex items-center gap-1">
                      <span>👔</span> Director (Owner)
                    </span>
                    <span className="text-amber-900 font-mono text-[11px] block mt-0.5 font-bold truncate">
                      {PRESENTATION_DIRECTOR.email}
                    </span>
                    <span className="text-[10px] text-amber-800 block mt-0.5">
                      Owns projects, approves & forwards to committee
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200">
                    <span className="font-bold text-emerald-950 block flex items-center gap-1">
                      <span>📋</span> Assigned Officer
                    </span>
                    <span className="text-emerald-900 font-mono text-[11px] block mt-0.5 font-bold truncate">
                      {PRESENTATION_OFFICER.email}
                    </span>
                    <span className="text-[10px] text-emerald-800 block mt-0.5">
                      Assigned to all 4 flagship projects
                    </span>
                  </div>
                </div>

                {/* 1-Click Session Switcher */}
                <div className="pt-1.5 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-slate-500" />
                      Quick Account Switcher (For Tomorrow&apos;s Demo)
                    </span>
                    {isSwitching && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />{" "}
                        Switching...
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isRunning || isSwitching}
                      onClick={() => handleSwitchRole("DIRECTOR")}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-100/70 hover:bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Log into session as Director"
                    >
                      <span>👔 Log In as Director</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRunning || isSwitching}
                      onClick={() => handleSwitchRole("OFFICER")}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Log into session as Officer"
                    >
                      <span>📋 Log In as Officer</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cleanup Option Checkbox */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  id="cleanPreviousCheckbox"
                  checked={cleanPrevious}
                  disabled={isRunning}
                  onChange={(e) => setCleanPrevious(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="cleanPreviousCheckbox"
                  className="cursor-pointer font-medium text-slate-700 select-none flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    Delete previous unowned projects &amp; recreate clean
                    flagship data
                  </span>
                </label>
              </div>

              {/* Progress Bar & Status */}
              {(isRunning || result) && (
                <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1.5 truncate max-w-[80%]">
                      {isRunning && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      )}
                      {progress.message}
                    </span>
                    <span className="text-emerald-700 font-mono font-bold">
                      {progress.percent}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Result Notification */}
              {result && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                    result.success
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border border-rose-200 text-rose-900"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">
                      {result.success ? "Success!" : "Notice"}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      {result.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                {!result?.success ? (
                  <>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={handleStart}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Populating Backend...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Insert Presentation Data Now</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleReload}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-lime-300" />
                    <span>Reload Dashboard to View Data</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
