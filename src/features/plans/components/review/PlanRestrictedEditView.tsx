"use client";

import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ProcurementPlan } from "../../plansData";
import type { ProjectItem } from "@/features/projects/management/projectsData";
import { CreatePlanForm } from "../CreatePlanForm";

export interface PlanRestrictedEditViewProps {
  editingPlan: ProcurementPlan;
  project: ProjectItem;
  onBackClick: () => void;
  onSavePlan: (savedPlan: ProcurementPlan) => void;
}

export function PlanRestrictedEditView({
  editingPlan,
  project,
  onBackClick,
  onSavePlan,
}: PlanRestrictedEditViewProps) {
  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <button
          onClick={onBackClick}
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Plan for Review
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold text-[#0A3C2F]">
          Restricted Plan Edits ({editingPlan.planName})
        </span>
      </nav>

      <CreatePlanForm
        project={project}
        initialData={editingPlan}
        userRole="DIRECTOR"
        onBackClick={onBackClick}
        onSavePlan={onSavePlan}
      />
    </div>
  );
}
