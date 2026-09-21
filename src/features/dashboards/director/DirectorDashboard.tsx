"use client";

import type { AuthUser } from "@/lib/authTypes";
import { useDirectorDashboard } from "./useDirectorDashboard";
import { DirectorTopFilterBar } from "./components/DirectorTopFilterBar";
import { DirectorSummaryCards } from "./components/DirectorSummaryCards";
import { DirectorFinancialSummaryCard } from "./components/DirectorFinancialSummaryCard";
import { DirectorWorkflowPipelineChart } from "./components/DirectorWorkflowPipelineChart";
import { DirectorSpendCompositionChart } from "./components/DirectorSpendCompositionChart";
import { DirectorFinancialPositionChart } from "./components/DirectorFinancialPositionChart";
import { DirectorActionPanels } from "./components/DirectorActionPanels";
import { DirectorOfficerWorkloadPanel } from "./components/DirectorOfficerWorkloadPanel";

export function DirectorDashboard({ user }: { user: AuthUser }) {
  const {
    selectedFiscalYear,
    setSelectedFiscalYear,
    selectedSector,
    setSelectedSector,
    availableSectors,
    selectedProject,
    setSelectedProject,
    availableProjects,
    totalProjectsCount,
    selectedStatus,
    setSelectedStatus,
    isFiltered,
    resetFilters,
    awaitingReviewCount,
    committeePlansCount,
    criticalDelaysCount,
    financialSummary,
    spendPercentages,
    pipelineStages,
    healthMetrics,
    displayedPendingPlans,
    displayedCriticalDelays,
    availableFiscalYears,
    currency,
  } = useDirectorDashboard(user.role);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP FILTER BAR */}
      <DirectorTopFilterBar
        selectedFiscalYear={selectedFiscalYear}
        onSelectFiscalYear={setSelectedFiscalYear}
        availableFiscalYears={availableFiscalYears}
        selectedSector={selectedSector}
        onSelectSector={setSelectedSector}
        availableSectors={availableSectors}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        availableProjects={availableProjects}
        totalProjectsCount={totalProjectsCount}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        isFiltered={isFiltered}
        onReset={resetFilters}
      />

      {/* 2. TOP 4 SUMMARY METRIC CARDS */}
      <DirectorSummaryCards
        totalProjectsCount={totalProjectsCount}
        awaitingReviewCount={awaitingReviewCount}
        committeePlansCount={committeePlansCount}
        criticalDelaysCount={criticalDelaysCount}
        selectedFiscalYear={selectedFiscalYear}
        selectedSector={selectedSector}
        userRole={user.role}
      />

      {/* 3. PROCUREMENT FINANCIAL CAPITAL & CONTRACT SUMMARY */}
      <DirectorFinancialSummaryCard
        financialSummary={financialSummary}
        spendPercentages={spendPercentages}
        selectedFiscalYear={selectedFiscalYear}
        currency={currency}
      />

      {/* 4. MIDDLE SECTION: WORKFLOW PIPELINE & SPEND COMPOSITION */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <DirectorWorkflowPipelineChart
          stages={pipelineStages}
          totalProjectsCount={totalProjectsCount}
          bottleneckStage={healthMetrics.bottleneckStage}
          standardDaysPerStage={healthMetrics.standardDaysPerStage}
        />
        <DirectorSpendCompositionChart
          financialSummary={financialSummary}
          spendPercentages={spendPercentages}
        />
      </section>

      {/* 5. FULL WIDTH: PROCUREMENT FINANCIAL POSITION (PLAN VS ACTUAL) */}
      <DirectorFinancialPositionChart
        financialSummary={financialSummary}
        selectedFiscalYear={selectedFiscalYear}
        nextAuditDate={healthMetrics.nextAuditDate}
      />

      {/* 6. BOTTOM PANELS: PENDING REVIEWS & CRITICAL DELAYS */}
      <DirectorActionPanels
        pendingPlans={displayedPendingPlans}
        criticalDelays={displayedCriticalDelays}
        userRole={user.role}
      />

      {/* 6.1 OFFICER WORKLOAD & DELAYS PER OFFICER (Req 7 & 8) */}
      <DirectorOfficerWorkloadPanel />

      {/* 7. SYSTEM FOOTER BAR */}
      <footer className="pt-2 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
            System Operational
          </span>
          <span>•</span>
          <span>
            Baseline Lock: <strong className="text-slate-700">Active</strong>
          </span>
        </div>
        <div>Ministry of Agriculture • {selectedFiscalYear}</div>
      </footer>
    </div>
  );
}
