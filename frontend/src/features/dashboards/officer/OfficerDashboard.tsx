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
  mapOfficerProjectsList,
  extractLiveDelayedActivities,
  calculateOverviewStatusItems,
  generateDynamicAlerts,
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
      category: alert.category,
      method: alert.method,
      totalDelayDays: alert.delayDays ?? 0,
      stages: alert.stages || [],
      activityHref: alert.href,
    });
  };

  return (
    <div className="space-y-5 pb-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#00843D]">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#10243f]">
            Overview
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome back, {user.displayName}. Here is your assigned procurement
            work at a glance.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] xl:grid-rows-[auto_auto]">
        <OfficerOverviewStatusBarChart
          className="xl:col-start-1 xl:row-start-1"
          items={overviewStatusItems}
          loading={loading}
        />
        <OfficerActiveProjectsTable
          className="xl:col-start-1 xl:row-start-2"
          projects={officerProjectsList}
          loading={loading}
        />
        <OfficerAlertsCenter
          className="xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:h-full"
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
