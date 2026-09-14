"use client";

import { Layers, Plus, Trash2, FolderPlus } from "lucide-react";
import { DualCalendarInput } from "@/components/common/DualCalendarInput";
import {
  gregorianToEthiopian,
  formatEthiopianDate,
} from "@/features/projects/utils/ethiopianCalendar";

export interface ProjectComponentFormItem {
  id: string;
  name: string;
  subcomponents: string[];
}

export interface Step3ComponentsFormData {
  componentsList: ProjectComponentFormItem[];
  startDate: string;
  endDate: string;
}

interface Step3ComponentsFormProps {
  data: Step3ComponentsFormData;
  onChange: (fields: Partial<Step3ComponentsFormData>) => void;
}

export function Step3ComponentsForm({
  data,
  onChange,
}: Step3ComponentsFormProps) {
  function handleAddComponent() {
    const newComp: ProjectComponentFormItem = {
      id: `comp-${Date.now()}`,
      name: "",
      subcomponents: [""],
    };
    onChange({ componentsList: [...data.componentsList, newComp] });
  }

  function handleRemoveComponent(compId: string) {
    if (data.componentsList.length === 1) return;
    onChange({
      componentsList: data.componentsList.filter((c) => c.id !== compId),
    });
  }

  function handleComponentNameChange(compId: string, name: string) {
    const updated = data.componentsList.map((c) =>
      c.id === compId ? { ...c, name } : c,
    );
    onChange({ componentsList: updated });
  }

  function handleAddSubcomponent(compId: string) {
    const updated = data.componentsList.map((c) =>
      c.id === compId ? { ...c, subcomponents: [...c.subcomponents, ""] } : c,
    );
    onChange({ componentsList: updated });
  }

  function handleSubcomponentChange(
    compId: string,
    subIdx: number,
    val: string,
  ) {
    const updated = data.componentsList.map((c) => {
      if (c.id !== compId) return c;
      const newSubs = [...c.subcomponents];
      newSubs[subIdx] = val;
      return { ...c, subcomponents: newSubs };
    });
    onChange({ componentsList: updated });
  }

  function handleRemoveSubcomponent(compId: string, subIdx: number) {
    const updated = data.componentsList.map((c) => {
      if (c.id !== compId) return c;
      if (c.subcomponents.length === 1) return c;
      return {
        ...c,
        subcomponents: c.subcomponents.filter((_, i) => i !== subIdx),
      };
    });
    onChange({ componentsList: updated });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#0A3C2F]" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Step 3: Project Components & Execution Timeline
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Structure & Dates
        </span>
      </div>

      {/* Repeatable Project Components */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-[#0A3C2F] uppercase tracking-wider">
              Project Components & Sub-components
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Define the major structural components and sub-activities of the
              project.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddComponent}
            className="inline-flex items-center gap-1.5 bg-[#0A3C2F] hover:bg-[#083025] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Major Component</span>
          </button>
        </div>

        <div className="space-y-4">
          {data.componentsList.map((comp, compIdx) => (
            <div
              key={comp.id}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3 relative group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A3C2F] text-white text-[10px] font-bold">
                    {compIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={comp.name}
                    onChange={(e) =>
                      handleComponentNameChange(comp.id, e.target.value)
                    }
                    placeholder={`Component ${compIdx + 1} Name (e.g. Component 1: De-risking Pastoral Finance)`}
                    className="flex-1 rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-[#0A3C2F] outline-none"
                  />
                </div>

                {data.componentsList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveComponent(comp.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Subcomponents */}
              <div className="pl-8 space-y-2 pt-1 border-l-2 border-emerald-200 ml-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    Sub-components:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddSubcomponent(comp.id)}
                    className="text-[11px] font-bold text-[#0A3C2F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>Add Sub-component</span>
                  </button>
                </div>

                {comp.subcomponents.map((sub, subIdx) => (
                  <div key={subIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sub}
                      onChange={(e) =>
                        handleSubcomponentChange(
                          comp.id,
                          subIdx,
                          e.target.value,
                        )
                      }
                      placeholder={`Sub-component ${subIdx + 1} (e.g. Sub-component 1.1: Financial Product Scaling)`}
                      className="flex-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-[#0A3C2F] outline-none"
                    />
                    {comp.subcomponents.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveSubcomponent(comp.id, subIdx)
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline with Interactive Dual Calendar (GC ⇄ EC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
        <DualCalendarInput
          id="project-start-date"
          label="Project Start Date (Optional)"
          gregorianValue={data.startDate}
          ethiopianValue={
            data.startDate && gregorianToEthiopian(data.startDate)
              ? formatEthiopianDate(gregorianToEthiopian(data.startDate)!)
              : ""
          }
          onChange={(greg) => onChange({ startDate: greg })}
        />

        <DualCalendarInput
          id="project-end-date"
          label="Project End Date (Optional)"
          gregorianValue={data.endDate}
          ethiopianValue={
            data.endDate && gregorianToEthiopian(data.endDate)
              ? formatEthiopianDate(gregorianToEthiopian(data.endDate)!)
              : ""
          }
          onChange={(greg) => onChange({ endDate: greg })}
        />
      </div>
    </div>
  );
}
