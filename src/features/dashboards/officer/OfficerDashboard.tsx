"use client";

import { useState } from "react";
import type { AuthUser } from "@/lib/authTypes";
import { useOfficerDashboard } from "./useOfficerDashboard";
import { OfficerOverviewStatusBarChart } from "./components/OfficerOverviewStatusBarChart";
import { OfficerActiveProjectsTable } from "./components/OfficerActiveProjectsTable";
import { OfficerAlertsCenter } from "./components/OfficerAlertsCenter";
import type { OfficerAlert } from "./officerData";
import {
  PhaseDelayBreakdownModal,
  type PhaseDelayModalData,
} from "@/features/projects/components/PhaseDelayBreakdownModal";

// Re-export pure calculations and formatters for backward compatibility & tests
export {
  formatTimeAgo,
  formatDirectorNote,
  formatPlanReference,
  formatReturnedPlanDetail,
  formatDelayedActivityAlert,
} from "./officerCalculations";

export function OfficerDashboard({ user }: { user: AuthUser }) {
  const { loading, officerProjectsList, overviewStatusItems, dynamicAlerts } =
    useOfficerDashboard(user);
  const [delayModalData, setDelayModalData] =
    useState<PhaseDelayModalData | null>(null);

  const handleSelectDelay = (alert: OfficerAlert) => {
    setDelayModalData({
      reference: alert.referenceLine,
      title:
        alert.activityDescription || alert.detailLine || alert.referenceLine,
      totalDelayDays: alert.delayDays || 1,
      stages: alert.stages || [],
      activityHref: alert.href,
    });
  };

  return (
    <div className="space-y-5 pb-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#3f6f60]">Dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#10243f]">
            Overview
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome back, {user.displayName}. Here is your assigned procurement
            work at a glance.
          </p>
        </div>
      </header>

      <div className="grid items-start xl:items-stretch gap-5 xl:grid-cols-[minmax(0,2.08fr)_minmax(19rem,1fr)]">
        <div className="space-y-5">
          <OfficerOverviewStatusBarChart
            items={overviewStatusItems}
            loading={loading}
          />
          <OfficerActiveProjectsTable
            projects={officerProjectsList}
            loading={loading}
          />
        </div>

        <OfficerAlertsCenter
          alerts={dynamicAlerts}
          loading={loading}
          onSelectDelay={handleSelectDelay}
        />
      </div>

      <PhaseDelayBreakdownModal
        isOpen={Boolean(delayModalData)}
        onClose={() => setDelayModalData(null)}
        data={delayModalData}
      />
    </div>
  );
}
