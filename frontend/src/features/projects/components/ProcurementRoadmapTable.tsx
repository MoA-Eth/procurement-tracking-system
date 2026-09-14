"use client";

import { CalendarDays, CircleAlert, Info } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DualCalendarField } from "./CreateProcurementPlanView";

export interface ProcurementRoadmapStage {
  allowNotApplicable: boolean;
  days: string;
  ethiopianDate: string;
  gregorianDate: string;
  name: string;
  notApplicable: boolean;
  remarks: string;
}

export function ProcurementRoadmapTable({
  attempted,
  methodLabel,
  onChange,
  stages,
}: {
  attempted: boolean;
  methodLabel: string;
  onChange: (value: ProcurementRoadmapStage[]) => void;
  stages: ProcurementRoadmapStage[];
}) {
  const incompleteCount = stages.filter(
    (stage) => !stage.notApplicable && !stage.gregorianDate,
  ).length;
  const orderErrorCount = countRoadmapOrderErrors(stages);
  const signedContractIndex = stages.findIndex((stage) =>
    stage.name.toLowerCase().includes("signed contract"),
  );
  const planningEnd =
    signedContractIndex >= 0 ? signedContractIndex + 1 : stages.length;
  const planningStages = stages.slice(0, planningEnd);
  const monitoringStages = stages.slice(planningEnd);

  function updateStage(
    index: number,
    changes: Partial<ProcurementRoadmapStage>,
  ) {
    onChange(
      stages.map((stage, stageIndex) =>
        stageIndex === index ? { ...stage, ...changes } : stage,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
            Generated roadmap template
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-[#16243a]">
            {methodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-500">
          <span className="rounded border border-slate-200 bg-[#f7f8fb] px-2 py-1 font-semibold">
            {stages.length} stages
          </span>
          <span
            className={
              "rounded border px-2 py-1 font-semibold " +
              (incompleteCount + orderErrorCount === 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700")
            }
          >
            {incompleteCount + orderErrorCount} issues
          </span>
        </div>
      </div>

      {attempted && (incompleteCount > 0 || orderErrorCount > 0) ? (
        <div
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          Complete every required baseline date and keep milestone dates in
          chronological order. Optional stages may be marked Not Applicable.
        </div>
      ) : null}

      <RoadmapSection
        allStages={stages}
        attempted={attempted}
        onUpdate={updateStage}
        offset={0}
        stages={planningStages}
        title="Procurement Planning Roadmap"
      />

      {monitoringStages.length > 0 ? (
        <RoadmapSection
          allStages={stages}
          attempted={attempted}
          onUpdate={updateStage}
          offset={planningEnd}
          stages={monitoringStages}
          title="Procurement Monitoring"
        />
      ) : null}

      <details className="rounded-lg border border-slate-300 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-[10px] font-bold text-slate-700 marker:hidden">
          Optional stage remarks
          <span className="ml-2 font-normal text-slate-400">
            Add notes only where needed
          </span>
        </summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-2">
          {stages.map((stage, index) => (
            <CompactField key={stage.name} label={stage.name}>
              <textarea
                className="min-h-16 w-full resize-y rounded border border-slate-300 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15"
                onChange={(event) =>
                  updateStage(index, { remarks: event.target.value })
                }
                placeholder="Optional stage note"
                value={stage.remarks}
              />
            </CompactField>
          ))}
        </div>
      </details>

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-[#f7f8fb] px-3 py-2.5 text-[9px] leading-4 text-slate-500">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Original planned dates form the approved baseline. Revised targets,
        revision numbers, actual dates, stage status, delay days, and replanning
        reasons are recorded later during execution without overwriting the
        baseline.
      </div>
    </div>
  );
}

function RoadmapSection({
  allStages,
  attempted,
  offset,
  onUpdate,
  stages,
  title,
}: {
  allStages: ProcurementRoadmapStage[];
  attempted: boolean;
  offset: number;
  onUpdate: (index: number, changes: Partial<ProcurementRoadmapStage>) => void;
  stages: ProcurementRoadmapStage[];
  title: string;
}) {
  return (
    <section className="overflow-visible rounded-xl border border-slate-200/80 bg-white shadow-2xs">
      <h2 className="border-b border-slate-200 bg-[#edf5f1] px-4 py-2.5 text-[11px] font-extrabold text-[#16243a]">
        {title}
      </h2>
      <div className="overflow-visible">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-[#0A3C2F] text-white text-[10px] font-extrabold uppercase tracking-wider">
              <th className="w-[35%] px-3 py-2.5" scope="col">
                Stage
              </th>
              <th className="w-[38%] px-3 py-2.5" scope="col">
                Original Planned Date
                <span className="ml-1 text-[8px] font-normal text-slate-200">
                  (GC / EC)
                </span>
              </th>
              <th className="w-[11%] px-2 py-2.5 text-center" scope="col">
                Duration
              </th>
              <th className="w-[10%] px-2 py-2.5 text-center" scope="col">
                Type
              </th>
              <th className="w-[6%] px-2 py-2.5 text-center" scope="col">
                N/A
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stages.map((stage, localIndex) => {
              const index = offset + localIndex;
              const missing =
                attempted && !stage.notApplicable && !stage.gregorianDate;
              const outOfOrder =
                attempted && roadmapStageIsOutOfOrder(allStages, index);
              const duration = plannedDurationDays(allStages, index);

              return (
                <tr
                  className={
                    missing || outOfOrder ? "bg-red-50/70" : "bg-white"
                  }
                  key={stage.name}
                >
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      {missing || outOfOrder ? (
                        <CircleAlert
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 text-red-600"
                        />
                      ) : null}
                      <span className="text-[9px] font-semibold leading-4 text-slate-800">
                        {stage.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    {stage.notApplicable ? (
                      <span className="text-[9px] text-slate-400">
                        Not Applicable
                      </span>
                    ) : (
                      <RoadmapDateCell
                        error={missing || outOfOrder}
                        ethiopianValue={stage.ethiopianDate}
                        gregorianValue={stage.gregorianDate}
                        id={"roadmap-stage-" + String(index + 1)}
                        onChange={(gregorianDate, ethiopianDate) =>
                          onUpdate(index, {
                            ethiopianDate,
                            gregorianDate,
                          })
                        }
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-[9px] text-slate-500">
                    {duration === null ? "-" : duration + " days"}
                  </td>
                  <td className="px-2 py-2 text-center text-[8px] font-medium text-slate-500">
                    {stage.allowNotApplicable ? "Optional" : "Required"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      aria-label={"Mark " + stage.name + " not applicable"}
                      checked={stage.notApplicable}
                      className="h-3.5 w-3.5 accent-[#176c55] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!stage.allowNotApplicable}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        onUpdate(index, {
                          notApplicable: checked,
                          ...(checked
                            ? { ethiopianDate: "", gregorianDate: "" }
                            : {}),
                        });
                      }}
                      type="checkbox"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoadmapDateCell({
  error,
  ethiopianValue,
  gregorianValue,
  id,
  onChange,
}: {
  error: boolean;
  ethiopianValue: string;
  gregorianValue: string;
  id: string;
  onChange: (gregorianValue: string, ethiopianValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={editing}
        className={
          "flex min-h-8 w-full items-center gap-2 rounded border px-2 py-1 text-left outline-none " +
          (error
            ? "border-red-400 bg-white text-red-700 focus:ring-2 focus:ring-red-100"
            : gregorianValue
              ? "border-transparent bg-transparent text-slate-700 hover:border-slate-300 hover:bg-white"
              : "border-slate-300 bg-white text-slate-400 hover:border-[#176c55]")
        }
        onClick={() => setEditing((current) => !current)}
        type="button"
      >
        {!gregorianValue ? (
          <CalendarDays
            aria-hidden="true"
            className="h-3 w-3 shrink-0 text-slate-500"
          />
        ) : null}
        {gregorianValue ? (
          <span className="min-w-0 text-[9px] font-medium">
            {formatRoadmapGregorianDate(gregorianValue)}
            <span className="ml-2 text-[8px] font-normal text-slate-400">
              ({ethiopianValue})
            </span>
          </span>
        ) : (
          <span className="text-[9px]">Select date...</span>
        )}
      </button>

      {editing ? (
        <div className="relative z-40 mt-2 w-md max-w-[70vw] rounded-md border border-slate-300 bg-white p-3 shadow-xl">
          <DualCalendarField
            errorMessage={error ? "Review this milestone date." : undefined}
            ethiopianValue={ethiopianValue}
            gregorianValue={gregorianValue}
            id={id}
            label="Original Planned Date"
            onChange={(nextGregorian, nextEthiopian) => {
              onChange(nextGregorian, nextEthiopian);
              if (nextGregorian) setEditing(false);
            }}
          />
          <button
            className="mt-2 text-[9px] font-semibold text-slate-500 hover:text-[#176c55]"
            onClick={() => setEditing(false)}
            type="button"
          >
            Close calendar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CompactField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[9px] font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatRoadmapGregorianDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return match[3] + "-" + months[Number(match[2]) - 1] + "-" + match[1];
}

function plannedDurationDays(stages: ProcurementRoadmapStage[], index: number) {
  const stage = stages[index];
  if (!stage || stage.notApplicable || !stage.gregorianDate) return null;

  const previous = previousDatedStage(stages, index);
  if (!previous) return 0;

  const currentTime = Date.parse(stage.gregorianDate + "T00:00:00Z");
  const previousTime = Date.parse(previous.gregorianDate + "T00:00:00Z");
  return Math.round((currentTime - previousTime) / 86_400_000);
}

function roadmapStageIsOutOfOrder(
  stages: ProcurementRoadmapStage[],
  index: number,
) {
  const stage = stages[index];
  if (!stage || stage.notApplicable || !stage.gregorianDate) return false;

  const previous = previousDatedStage(stages, index);
  return Boolean(previous && stage.gregorianDate < previous.gregorianDate);
}

function previousDatedStage(stages: ProcurementRoadmapStage[], index: number) {
  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const stage = stages[previousIndex];
    if (!stage.notApplicable && stage.gregorianDate) return stage;
  }
  return null;
}

export function countRoadmapOrderErrors(stages: ProcurementRoadmapStage[]) {
  return stages.reduce(
    (count, _stage, index) =>
      count + Number(roadmapStageIsOutOfOrder(stages, index)),
    0,
  );
}
