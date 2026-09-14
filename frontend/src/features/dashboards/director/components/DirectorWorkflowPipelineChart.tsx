"use client";

import Link from "next/link";
import type { PipelineStageVolume } from "../directorData";

interface DirectorWorkflowPipelineChartProps {
  stages: PipelineStageVolume[];
  totalProjectsCount: number;
  bottleneckStage?: string;
  standardDaysPerStage?: number;
}

export function DirectorWorkflowPipelineChart({
  stages,
  totalProjectsCount,
  bottleneckStage = "None detected",
  standardDaysPerStage = 14,
}: DirectorWorkflowPipelineChartProps) {
  // Find maximum count for scaling bar heights
  const maxCount = Math.max(...stages.map((s) => s.count), 10);

  // Short labels for clean alignment
  const getShortLabel = (code: string) => {
    switch (code) {
      case "1. PLAN":
        return "Plan";
      case "2. REVIEW":
        return "Review";
      case "3. COMM":
        return "Comm.";
      case "4. TENDER":
        return "Tender";
      case "5. EVAL":
        return "Eval";
      case "6. AWARD":
        return "Award";
      case "7. CONT":
        return "Cont.";
      case "8. EXEC":
        return "Exec";
      case "9. DONE":
        return "Done";
      default:
        return code;
    }
  };

  // Determine stage status color matching the screenshot
  const getBarColor = (stage: PipelineStageVolume, index: number) => {
    if (stage.count === 0) {
      return {
        bar: "bg-slate-200",
        text: "text-slate-400",
      };
    }
    // Early stages and Done stage are Complete (Dark Green)
    if (index < 3 || index === 8) {
      return {
        bar: "bg-[#0A3C2F]",
        text: "text-[#0A3C2F]",
      };
    }
    // Middle pipeline stages are In Progress (Ochre/Mustard)
    return {
      bar: "bg-[#B7892B]",
      text: "text-[#B7892B]",
    };
  };

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-slate-900 tracking-tight">
              Workflow Pipeline
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {totalProjectsCount} Portfolios
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stage volume across active portfolios
          </p>
        </div>

        {/* Bar Chart Area */}
        <div className="pt-8 pb-4">
          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-44 sm:h-48 px-1">
            {stages.map((stage, idx) => {
              const { bar, text } = getBarColor(stage, idx);
              const heightPercent = Math.max(
                12,
                Math.round((stage.count / maxCount) * 100),
              );

              const stageHref =
                stage.code === "1. PLAN"
                  ? "/workspace/projects"
                  : stage.code === "2. REVIEW"
                    ? "/workspace/plan-for-review"
                    : stage.code === "3. COMM"
                      ? "/workspace/committee-progress"
                      : "/workspace/activity-tracker";

              return (
                <Link
                  key={stage.id}
                  href={stageHref}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer focus:outline-hidden"
                  title={`${stage.title} (${stage.sublabel}): ${stage.count} active`}
                >
                  {/* Stage Count on top of bar */}
                  <span
                    className={`text-xs sm:text-sm font-bold tabular-nums mb-1 transition-transform group-hover:scale-110 ${text}`}
                  >
                    {stage.count}
                  </span>

                  {/* Vertical Bar */}
                  <div className="w-full max-w-[28px] sm:max-w-[34px] flex items-end justify-center h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 group-hover:brightness-95 ${bar}`}
                    />
                  </div>

                  {/* Stage Label Underneath */}
                  <span className="text-[11px] sm:text-xs font-medium text-slate-600 mt-2 truncate max-w-full">
                    {getShortLabel(stage.code)}
                  </span>

                  {/* Hidden full codes for tests/accessibility */}
                  <span className="sr-only">{stage.code}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend and Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Status Legend matching screenshot */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0A3C2F] inline-block" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#B7892B] inline-block" />
            <span>In progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
            <span>Not started</span>
          </div>
        </div>

        {/* System notes / bottleneck info */}
        <div className="text-[11px] text-slate-400">
          <span>
            Bottleneck:{" "}
            <span className="font-semibold text-slate-600">
              {bottleneckStage}
            </span>
          </span>
          <span className="hidden sm:inline">
            {" "}
            • {standardDaysPerStage}d target
          </span>
        </div>
      </div>
    </div>
  );
}
