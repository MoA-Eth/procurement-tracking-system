"use client";

import { useMemo, useState } from "react";
import {
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  Info,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { formatGregorianDate } from "../utils/ethiopianCalendar";
import {
  resolveProcurementMethodOption,
  resolveMethodKey,
  roadmapForMethod,
} from "../data/procurementActivityConfig";

export interface PhaseDelayItem {
  id?: string;
  name: string;
  sequence?: number;
  status?: string;
  notApplicable?: boolean;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  currentTargetStartDate?: string | null;
  currentTargetEndDate?: string | null;
  plannedDurationDays?: number;
  actualDurationDays?: number;
  delayDays?: number;
  remarks?: string;
}

export interface PhaseDelayModalData {
  reference: string;
  title: string;
  category?: string;
  method?: string;
  totalDelayDays: number;
  stages?: any[];
  activityHref?: string;
  planReference?: string;
  projectCode?: string;
}

interface PhaseDelayBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PhaseDelayModalData | null;
}

function extractDateStr(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object" && typeof val.gregorian === "string") {
    return val.gregorian;
  }
  return null;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const formatted = formatGregorianDate(dateStr);
  return formatted || String(dateStr);
}

export function computePhaseMetrics(stage: any, now: number): PhaseDelayItem {
  const name =
    stage.stageType?.label ||
    stage.name ||
    stage.stageName ||
    "Procurement Phase";

  const isNA = Boolean(
    stage.notApplicable ||
    stage.isNotApplicable ||
    (typeof stage.status === "string" &&
      stage.status.toUpperCase() === "NOT APPLICABLE"),
  );

  const plannedStart =
    extractDateStr(stage.plannedStartDate) ||
    extractDateStr(stage.currentTargetStartDate) ||
    null;
  const plannedEnd =
    extractDateStr(stage.plannedEndDate) ||
    extractDateStr(stage.currentTargetEndDate) ||
    extractDateStr(stage.gregorianDate) ||
    null;

  // Compute planned days
  let plannedDuration = 14;
  if (typeof stage.plannedDays === "number" && !isNaN(stage.plannedDays)) {
    plannedDuration = stage.plannedDays;
  } else if (stage.days && !isNaN(parseInt(String(stage.days), 10))) {
    plannedDuration = parseInt(String(stage.days), 10);
  } else if (plannedStart && plannedEnd) {
    const pStartMs = new Date(plannedStart).getTime();
    const pEndMs = new Date(plannedEnd).getTime();
    if (!isNaN(pStartMs) && !isNaN(pEndMs) && pEndMs >= pStartMs) {
      plannedDuration = Math.max(1, Math.round((pEndMs - pStartMs) / 86400000));
    }
  }

  let finalPlannedStart = plannedStart;
  let finalPlannedEnd = plannedEnd;
  if (!isNA && !finalPlannedStart && !finalPlannedEnd) {
    const seq =
      typeof stage.sequence === "number" ? Math.max(0, stage.sequence - 1) : 0;
    const baseAnchor = new Date("2026-05-08T00:00:00Z");
    const dStart = new Date(baseAnchor.getTime() + seq * 14 * 86400000);
    const dEnd = new Date(dStart.getTime() + plannedDuration * 86400000);
    finalPlannedStart = dStart.toISOString().slice(0, 10);
    finalPlannedEnd = dEnd.toISOString().slice(0, 10);
  } else if (!isNA && !finalPlannedStart && finalPlannedEnd) {
    const pEndMs = new Date(finalPlannedEnd).getTime();
    if (!isNaN(pEndMs)) {
      finalPlannedStart = new Date(pEndMs - plannedDuration * 86400000)
        .toISOString()
        .slice(0, 10);
    }
  }

  const targetEnd =
    extractDateStr(stage.currentTargetEndDate) ||
    extractDateStr(stage.plannedEndDate) ||
    extractDateStr(stage.gregorianDate) ||
    finalPlannedEnd;
  const actualStart = extractDateStr(stage.actualStartDate) || null;
  const actualEnd =
    extractDateStr(stage.actualEndDate) ||
    extractDateStr(stage.actualDate) ||
    null;

  // Determine stage execution status
  const rawStatus = (stage.status || "").toUpperCase();
  const isCompleted =
    rawStatus === "COMPLETED" ||
    Boolean(actualEnd && !rawStatus.includes("DELAY"));
  const isInProgress =
    rawStatus === "IN_PROGRESS" ||
    rawStatus === "IN PROGRESS" ||
    Boolean(actualStart && !isCompleted);
  const isNotStarted = !isCompleted && !isInProgress && !isNA;

  let actualDuration = plannedDuration;
  let delayDays = 0;

  if (isNA) {
    delayDays = 0;
    actualDuration = 0;
  } else if (isCompleted) {
    if (actualEnd && targetEnd) {
      const actEndMs = new Date(actualEnd).getTime();
      const targetEndMs = new Date(targetEnd).getTime();
      if (!isNaN(actEndMs) && !isNaN(targetEndMs)) {
        delayDays = Math.max(
          0,
          Math.floor((actEndMs - targetEndMs) / 86400000),
        );
      }
    } else if (typeof stage.delayDays === "number") {
      delayDays = Math.max(0, stage.delayDays);
    }
    if (delayDays > 0) {
      // Completed with delay: total duration reflects baseline plus delay
      actualDuration = plannedDuration + delayDays;
    } else if (actualStart && actualEnd) {
      const actStartMs = new Date(actualStart).getTime();
      const actEndMs = new Date(actualEnd).getTime();
      if (!isNaN(actStartMs) && !isNaN(actEndMs) && actEndMs >= actStartMs) {
        const realDuration = Math.round((actEndMs - actStartMs) / 86400000);
        // Cap at planned duration if completed on time to avoid premature activation inflating duration
        actualDuration = Math.min(plannedDuration, Math.max(1, realDuration));
      } else {
        actualDuration = plannedDuration;
      }
    } else {
      actualDuration = plannedDuration;
    }
  } else if (isInProgress) {
    if (targetEnd) {
      const targetEndMs = new Date(targetEnd).getTime();
      if (!isNaN(targetEndMs) && now > targetEndMs) {
        delayDays = Math.max(1, Math.floor((now - targetEndMs) / 86400000));
      }
    } else if (typeof stage.delayDays === "number") {
      delayDays = Math.max(0, stage.delayDays);
    }

    // In-progress stages:
    // If delayed past milestone target end: current duration is planned duration + delayDays
    // (guaranteeing Planned Days + Process Delay === Current Duration, matching milestone schedule).
    // If on-track (delayDays === 0): current projected duration is plannedDuration.
    if (delayDays > 0) {
      actualDuration = plannedDuration + delayDays;
    } else {
      actualDuration = plannedDuration;
    }
  } else if (isNotStarted) {
    // Stage has not started yet — not accumulating execution delay
    delayDays = 0;
    actualDuration = plannedDuration;
  }

  let status = "Pending";
  if (isNA) {
    status = "Not Applicable";
  } else if (isCompleted) {
    status = delayDays > 0 ? "Completed (Delayed)" : "Completed";
  } else if (delayDays > 0 || rawStatus === "DELAYED") {
    status = "Delayed";
  } else if (isInProgress) {
    status = "In Progress";
  }

  return {
    id: stage.id || stage.sequence || name,
    name,
    sequence: stage.sequence,
    status,
    notApplicable: isNA,
    plannedStartDate: finalPlannedStart,
    plannedEndDate: finalPlannedEnd,
    actualStartDate: actualStart,
    actualEndDate: actualEnd,
    plannedDurationDays: isNA ? undefined : plannedDuration,
    actualDurationDays: actualDuration,
    delayDays,
    remarks: stage.remarks || stage.comment || "",
  };
}

export function calculateRealActivityDelay(stages?: any[]): number {
  if (!Array.isArray(stages) || stages.length === 0) return 0;
  const now = Date.now();
  let maxDelay = 0;
  for (const st of stages) {
    const metrics = computePhaseMetrics(st, now);
    if ((metrics.delayDays || 0) > maxDelay) {
      maxDelay = metrics.delayDays || 0;
    }
  }
  return maxDelay;
}

export function PhaseDelayBreakdownModal({
  isOpen,
  onClose,
  data,
}: PhaseDelayBreakdownModalProps) {
  const [now] = useState(() => Date.now());
  const [filterView, setFilterView] = useState<"active" | "all">("active");

  const resolvedCategory = useMemo(() => {
    if (data?.category && data.category.trim()) return data.category;
    const ref = (data?.reference || "").toUpperCase();
    if (
      ref.includes("-GO-") ||
      ref.includes("/GO/") ||
      ref.includes("_GO_") ||
      ref.includes("/G-")
    )
      return "Goods";
    if (
      ref.includes("-CW-") ||
      ref.includes("-W-") ||
      ref.includes("/CW/") ||
      ref.includes("/W/") ||
      ref.includes("/W-")
    )
      return "Works";
    if (
      ref.includes("-CS-") ||
      ref.includes("-C-") ||
      ref.includes("/CS/") ||
      ref.includes("/C/") ||
      ref.includes("/C-") ||
      ref.includes("QCBS")
    )
      return "Consultancy Services";
    if (ref.includes("-NC-") || ref.includes("/NC/") || ref.includes("_NC_"))
      return "Non-Consulting Services";
    return undefined;
  }, [data?.category, data?.reference]);

  const resolvedMethod = useMemo(() => {
    const raw = data?.method || "";
    if (raw) {
      const opt = resolveProcurementMethodOption(raw);
      if (opt?.label) return opt.label;
      return raw;
    }
    const ref = (data?.reference || "").toUpperCase();
    if (ref.includes("-RFB") || ref.includes("/RFB"))
      return "Request for Bids (RFB)";
    if (ref.includes("-RFQ") || ref.includes("/RFQ"))
      return "Request for Quotations (RFQ)";
    if (ref.includes("-QCBS") || ref.includes("/QCBS"))
      return "Quality- and Cost-Based Selection (QCBS)";
    if (ref.includes("-DIR") || ref.includes("/DIR")) return "Direct Selection";
    if (ref.includes("-LCS") || ref.includes("/LCS"))
      return "Least-Cost Selection (LCS)";
    if (ref.includes("-FBS") || ref.includes("/FBS"))
      return "Fixed-Budget Selection (FBS)";
    if (ref.includes("-CQS") || ref.includes("/CQS"))
      return "Consultant's Qualifications (CQS)";
    if (
      ref.includes("-INDV") ||
      ref.includes("/INDV") ||
      ref.includes("-ICS") ||
      ref.includes("/ICS")
    )
      return "Individual Consultant Selection";
    return undefined;
  }, [data?.method, data?.reference]);

  const phaseItems: PhaseDelayItem[] = useMemo(() => {
    if (!data) return [];
    let stages = data.stages;

    // Explicit empty array should maintain empty state (e.g. for testing)
    if (Array.isArray(stages) && stages.length === 0) {
      return [];
    }

    // If stages not provided, create template roadmap based on method
    if (!stages) {
      const mKey = resolveMethodKey(resolvedMethod || data.method || "");
      const tpl = roadmapForMethod(mKey);
      if (tpl && tpl.length > 0) {
        stages = tpl.map((t, idx) => ({
          name: t.name,
          sequence: idx + 1,
          plannedDays: 14,
          days: "14",
          notApplicable: Boolean(t.allowNotApplicable),
          status: t.allowNotApplicable ? "Not Applicable" : "Not Started",
        }));
      } else {
        return [];
      }
    }

    // Merge tracking records from local storage if present
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(
          "moa-pts:officer-activity-tracking:v2",
        );
        if (raw) {
          const records = JSON.parse(raw);
          const refKey = (data.reference || "").toLowerCase().trim();
          const tr = records.find(
            (r: any) =>
              (r.activityReference || "").toLowerCase().trim() === refKey,
          );
          if (tr && Array.isArray(tr.stages) && tr.stages.length > 0) {
            stages = stages.map((st: any) => {
              const trStage = tr.stages.find(
                (ts: any) =>
                  (ts.stageName || "").toLowerCase().trim() ===
                  (st.stageType?.label || st.name || st.stageName || "")
                    .toLowerCase()
                    .trim(),
              );
              if (trStage) {
                return {
                  ...st,
                  status:
                    trStage.status === "Completed"
                      ? "COMPLETED"
                      : trStage.status === "In Progress"
                        ? "IN_PROGRESS"
                        : st.status,
                  actualEndDate:
                    trStage.actualDate?.gregorian || st.actualEndDate,
                  remarks: trStage.remarks || st.remarks,
                  revisions: trStage.revisions || st.revisions,
                };
              }
              return st;
            });
          }
        }
      } catch {
        // ignore
      }
    }

    let applicableSeq = 0;
    return stages.map((st, idx) => {
      const isNA = Boolean(
        st.notApplicable ||
        st.isNotApplicable ||
        (typeof st.status === "string" &&
          st.status.toUpperCase() === "NOT APPLICABLE"),
      );
      const seqIndex = isNA ? idx : applicableSeq++;
      return computePhaseMetrics(
        {
          ...st,
          sequence:
            typeof st.sequence === "number" ? st.sequence : seqIndex + 1,
        },
        now,
      );
    });
  }, [data, now, resolvedMethod]);

  if (!isOpen || !data) return null;

  const maxStageDelay = phaseItems.reduce(
    (max, item) => Math.max(max, item.delayDays || 0),
    0,
  );
  const displayTotalDelay =
    (data.totalDelayDays ?? 0) > 0
      ? data.totalDelayDays
      : maxStageDelay > 0
        ? maxStageDelay
        : 0;

  // Identify primary bottleneck stage (only from stages with active delay)
  const delayedPhases = phaseItems.filter((item) => (item.delayDays || 0) > 0);
  const bottleneckStage =
    delayedPhases.length > 0
      ? [...delayedPhases].sort(
          (a, b) => (b.delayDays || 0) - (a.delayDays || 0),
        )[0]
      : null;

  const completedCount = phaseItems.filter(
    (p) =>
      p.status === "Completed" ||
      p.status === "Completed (Delayed)" ||
      p.status?.startsWith("Completed"),
  ).length;
  const totalApplicableCount = phaseItems.filter(
    (p) => !p.notApplicable,
  ).length;
  const progressPercent =
    totalApplicableCount > 0
      ? Math.round((completedCount / totalApplicableCount) * 100)
      : 0;

  const hasNotApplicable = phaseItems.some((p) => p.notApplicable);
  const displayedPhases =
    filterView === "active" && hasNotApplicable && totalApplicableCount > 0
      ? phaseItems.filter((p) => !p.notApplicable)
      : phaseItems;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#0A3C2F] text-white flex items-start justify-between gap-4 shrink-0 border-b border-[#0d4f3e]">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {displayTotalDelay > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500 text-white shadow-xs inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  {displayTotalDelay} Days Delayed
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-xs inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  On Track
                </span>
              )}
              {resolvedCategory && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-white/15 text-white border border-white/20">
                  {resolvedCategory}
                </span>
              )}
              {resolvedMethod && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-white/15 text-white border border-white/20">
                  {resolvedMethod}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
              Process Delay Breakdown by Phase
            </h2>
            <div className="flex items-center gap-2 text-xs text-emerald-100 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-200 font-normal">Activity:</span>
                <span className="font-mono text-[11px] font-semibold text-white bg-white/15 px-2 py-0.5 rounded border border-white/20">
                  {data.reference}
                </span>
              </span>
              {data.title && data.title !== data.reference && (
                <>
                  <span className="text-emerald-300/50" aria-hidden="true">
                    •
                  </span>
                  <span className="font-medium text-emerald-50 line-clamp-1">
                    {data.title}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close delay breakdown modal"
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Delay Insights Callout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Total Delay */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all shadow-xs ${
                displayTotalDelay > 0
                  ? "bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 border-rose-200/80"
                  : "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200/80"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center ring-1 ${
                  displayTotalDelay > 0
                    ? "bg-rose-100/90 text-rose-700 ring-rose-200/70"
                    : "bg-emerald-100/90 text-emerald-700 ring-emerald-200/70"
                }`}
              >
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.08em] ${
                    displayTotalDelay > 0 ? "text-rose-800" : "text-emerald-800"
                  }`}
                >
                  Total Delay
                </p>
                <p
                  className={`text-2xl font-extrabold tracking-tight mt-0.5 font-sans ${
                    displayTotalDelay > 0 ? "text-rose-950" : "text-emerald-950"
                  }`}
                >
                  {displayTotalDelay} Days
                </p>
                <p
                  className={`text-[11px] mt-0.5 font-medium ${
                    displayTotalDelay > 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {displayTotalDelay > 0
                    ? "Cumulative deviation from baseline"
                    : "Process execution on schedule"}
                </p>
              </div>
            </div>

            {/* Primary Bottleneck */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all shadow-xs ${
                bottleneckStage
                  ? "bg-gradient-to-br from-rose-50/70 via-white to-rose-50/20 border-rose-200/80"
                  : "bg-gradient-to-br from-slate-50/80 via-white to-slate-50/30 border-slate-200/80"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center ring-1 ${
                  bottleneckStage
                    ? "bg-rose-100/90 text-rose-700 ring-rose-200/70"
                    : "bg-slate-100 text-slate-600 ring-slate-200/70"
                }`}
              >
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.08em] ${
                    bottleneckStage ? "text-rose-800" : "text-slate-600"
                  }`}
                >
                  Primary Bottleneck
                </p>
                <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                  {bottleneckStage?.name || "None — On Schedule"}
                </p>
                <p
                  className={`text-[11px] mt-0.5 font-medium ${
                    bottleneckStage ? "text-rose-700" : "text-slate-500"
                  }`}
                >
                  {bottleneckStage
                    ? `Contributed +${bottleneckStage.delayDays || 0} days delay`
                    : "All phases within target dates"}
                </p>
              </div>
            </div>

            {/* Process Progress */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50/80 via-white to-emerald-50/30 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-slate-100 text-[#0A3C2F] ring-1 ring-slate-200/70 shrink-0 flex items-center justify-center">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
                  Process Progress
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
                    {completedCount} / {totalApplicableCount}
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    Phases
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1.5">
                  <div
                    className="bg-[#0A3C2F] h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Roadmap stages completed
                </p>
              </div>
            </div>
          </div>

          {/* Phase-by-Phase Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A3C2F]" />
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  Phase-by-Phase Process Schedule &amp; Delay
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hasNotApplicable && totalApplicableCount > 0 && (
                  <div className="inline-flex items-center rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setFilterView("active")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filterView === "active"
                          ? "bg-white text-[#0A3C2F] shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Active Phases ({totalApplicableCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView("all")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filterView === "all"
                          ? "bg-white text-[#0A3C2F] shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All Stages ({phaseItems.length})
                    </button>
                  </div>
                )}
                <span className="text-[11px] text-slate-500 font-semibold bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                  {displayedPhases.length}{" "}
                  {filterView === "active" && hasNotApplicable
                    ? "active phases"
                    : "sequential processes"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 text-[10px] font-bold uppercase tracking-[0.06em] border-b border-slate-200/80">
                    <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                    <th className="py-2.5 px-4 font-bold">
                      Process / Phase Name
                    </th>
                    <th
                      className="py-2.5 px-3 font-bold text-center w-24"
                      title="Baseline schedule duration in days"
                    >
                      Planned Days
                    </th>
                    <th
                      className="py-2.5 px-3 font-bold text-center w-28"
                      title="Completed duration or current running duration (Planned Days + Process Delay)"
                    >
                      Actual / Current
                    </th>
                    <th
                      className="py-2.5 px-3 font-bold text-center w-32"
                      title="Milestone slippage past approved target completion deadline"
                    >
                      Process Delay
                    </th>
                    <th className="py-2.5 px-3.5 font-bold text-center w-28">
                      Stage Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedPhases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <FileSpreadsheet className="w-7 h-7 text-slate-400" />
                          <p className="font-semibold text-slate-700 text-xs">
                            No Roadmap Phases Recorded
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-sm">
                            Roadmap process stages have not been configured for
                            this activity yet.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedPhases.map((phase, idx) => {
                      const isDelayed = (phase.delayDays || 0) > 0;
                      const isCompleted =
                        phase.status === "Completed" ||
                        phase.status === "Completed (Delayed)";
                      const isNA = phase.notApplicable;

                      return (
                        <tr
                          key={phase.id || idx}
                          className={`transition-colors duration-150 group ${
                            isDelayed
                              ? "bg-rose-50/30 hover:bg-rose-50/60"
                              : isCompleted
                                ? "bg-white hover:bg-slate-50/70"
                                : "bg-slate-50/20 hover:bg-slate-50/60"
                          }`}
                        >
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-mono font-semibold text-slate-500">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0f172a] text-xs leading-snug group-hover:text-[#0A3C2F] transition-colors">
                              {phase.name}
                            </div>
                            {(phase.plannedStartDate ||
                              phase.plannedEndDate) && (
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>
                                    Target: {formatDate(phase.plannedStartDate)}{" "}
                                    → {formatDate(phase.plannedEndDate)}
                                  </span>
                                </span>
                                {phase.actualEndDate ? (
                                  <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200/60">
                                    (Actual: {formatDate(phase.actualEndDate)})
                                  </span>
                                ) : phase.status === "In Progress" &&
                                  !isDelayed ? (
                                  <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200/60">
                                    (In progress — On schedule)
                                  </span>
                                ) : isDelayed ? (
                                  <span className="font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-200/60">
                                    (Overdue: +{phase.delayDays}d past deadline)
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {phase.remarks && (
                              <p className="text-[10px] text-amber-700 italic mt-0.5">
                                Note: {phase.remarks}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-xs font-medium text-slate-700 tabular-nums">
                            {isNA
                              ? "—"
                              : `${phase.plannedDurationDays ?? "—"} d`}
                          </td>

                          <td
                            className={`py-3 px-3 text-center font-mono text-xs tabular-nums ${
                              isDelayed
                                ? "font-bold text-rose-950"
                                : "font-semibold text-slate-800"
                            }`}
                          >
                            {isNA
                              ? "—"
                              : `${phase.actualDurationDays ?? "—"} d`}
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isNA ? (
                              <span className="text-[11px] text-slate-400 font-medium">
                                N/A
                              </span>
                            ) : isDelayed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                +{phase.delayDays} Days
                              </span>
                            ) : isCompleted ||
                              (phase.status === "In Progress" && !isDelayed) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                On Track
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono font-medium">
                                0 Days
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isNA
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isDelayed
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : phase.status === "In Progress"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {phase.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Timeline delays are evaluated against the approved baseline target
              dates.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
            >
              Close
            </button>

            {data.activityHref && (
              <Link
                href={data.activityHref}
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#0A3C2F] hover:bg-[#072d23] text-white text-xs font-semibold shadow-xs hover:shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>Open Activity</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
