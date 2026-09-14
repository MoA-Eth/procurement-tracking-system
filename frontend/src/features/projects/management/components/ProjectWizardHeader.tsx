"use client";

import Link from "next/link";
import { Home, ChevronRight, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WizardStep {
  id: number;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface ProjectWizardHeaderProps {
  isEditing: boolean;
  code?: string;
  currentStep: number;
  steps: WizardStep[];
  onStepClick: (stepId: number) => void;
  onBackClick: () => void;
}

export function ProjectWizardHeader({
  isEditing,
  code,
  currentStep,
  steps,
  onStepClick,
  onBackClick,
}: ProjectWizardHeaderProps) {
  return (
    <div className="space-y-5">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link
          href="/workspace"
          className="hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          type="button"
          onClick={onBackClick}
          className="hover:text-slate-900 transition-colors cursor-pointer"
        >
          Projects Directory
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-extrabold text-[#0A3C2F]">
          {isEditing
            ? `Edit Sector Project (${code})`
            : "Register New Sector Project"}
        </span>
      </nav>

      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[11px] font-extrabold text-[#0A3C2F] uppercase tracking-wider block mb-1">
            Director Governance Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <span>
              {isEditing
                ? `Edit Project: ${code}`
                : "Register New Sector Project"}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-300/80">
              4-Step Setup Wizard
            </span>
          </h1>
        </div>

        <button
          type="button"
          onClick={onBackClick}
          className="self-start sm:self-auto text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
        >
          ← Cancel & Back to Directory
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isClickable =
              isEditing || isCompleted || step.id <= currentStep;
            const isLast = idx === steps.length - 1;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex-1 flex items-center">
                <div
                  onClick={() => {
                    if (isClickable) {
                      onStepClick(step.id);
                    }
                  }}
                  className={`flex items-center gap-2 sm:gap-2.5 transition-all select-none ${
                    isClickable
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-60"
                  } ${isActive ? "scale-102" : "opacity-85 hover:opacity-100"}`}
                >
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-all duration-200 shrink-0 text-xs ${
                      isActive
                        ? "bg-[#0A3C2F] text-white ring-4 ring-emerald-600/20 shadow-2xs"
                        : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4.5 w-4.5 stroke-[3]" />
                    ) : (
                      <StepIcon className="h-4.5 w-4.5" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-extrabold leading-tight ${
                        isActive
                          ? "text-[#0A3C2F]"
                          : isCompleted
                            ? "text-emerald-900 font-bold"
                            : "text-slate-500"
                      }`}
                    >
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden">{step.shortLabel}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Step 0{step.id}
                    </span>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex-1 mx-2 sm:mx-4">
                    <div
                      className={`h-0.5 w-full transition-colors duration-300 rounded-full ${
                        isCompleted || currentStep > step.id
                          ? "bg-emerald-600"
                          : "bg-slate-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
