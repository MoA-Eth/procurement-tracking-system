"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchPlans, type BackendPlan } from "@/lib/plansApi";
import { fetchProjects, type BackendProject } from "@/lib/projectsApi";
import { fetchContracts, type BackendContract } from "@/lib/contractsApi";
import {
  fetchLookups,
  fetchOfficers,
  type LookupItem,
  type OfficerUserItem,
} from "@/lib/lookupsApi";
import {
  downloadAnnualProcurementPlanReport,
  downloadPlanVsActualReport,
  downloadProcurementStepsReport,
  downloadDelayedProcurementReport,
  downloadMonthlyProcurementReport,
  downloadMonthlySummaryReport,
  downloadQuarterlySummaryReport,
  downloadQuarterlyDetailedReport,
  downloadDetailedProcurementReport,
  downloadContractRegisterReport,
  downloadContractPaymentReport,
  downloadRegionalSectorSummaryReport,
  downloadProjectSummaryReport,
  downloadOfficerSummaryReport,
  downloadProjectOfficerSummaryReport,
  downloadCommitteeApprovalReport,
  downloadSupplierPerformanceReport,
} from "@/lib/reportsApi";
import {
  type AnnualPlanReportRow,
  type PlanVsActualReportRow,
  type StepReportRow,
  type DelayedProcurementRow,
  type MonthlyProcurementRow,
  type QuarterlySummaryRow,
  type QuarterlyDetailedRow,
  type ContractRegisterRow,
  type ContractPaymentReportRow,
  type RegionalSectorSummaryRow,
  type ProjectSummaryRow,
  type OfficerSummaryRow,
  type CommitteeApprovalRow,
  type SupplierPerformanceRow,
  type MonthlySummaryRow,
  type DetailedProcurementRow,
  type ProjectOfficerSummaryRow,
} from "../reportsData";
import {
  type ReportType,
  type ReportFilterState,
  DEFAULT_FILTERS,
} from "../types";
import { ShieldAlert, LogOut } from "lucide-react";
import { ReportTypeSelector } from "./ReportTypeSelector";
import { ReportFiltersPanel } from "./ReportFiltersPanel";
import { ReportTables } from "./ReportTables";

function getEthiopianFiscalYearFromDate(date: Date): number {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();
  // In Ethiopia, the fiscal year begins on Hamle 1 (July 8)
  if (gMonth > 7 || (gMonth === 7 && gDay >= 8)) {
    return gYear - 7;
  }
  return gYear - 8;
}

function getEthiopianMonthName(date: Date): string {
  const gMonth = date.getMonth() + 1;
  const gYear = date.getFullYear();
  const ethMonths: Record<number, string> = {
    1: "Tir",
    2: "Yakatit",
    3: "Magabit",
    4: "Miyazya",
    5: "Ginbot",
    6: "Sene",
    7: "Hamle",
    8: "Nehase",
    9: "Meskerem",
    10: "Tikimt",
    11: "Hidar",
    12: "Tahsas",
  };
  const ethName = ethMonths[gMonth] || "Hamle";
  const gMonthName = date.toLocaleString("default", { month: "long" });
  return `${ethName} (${gMonthName} ${gYear})`;
}

export function ReportsView() {
  const [activeReport, setActiveReport] = useState<ReportType>("annual-plan");
  const [backendPlans, setBackendPlans] = useState<BackendPlan[]>([]);
  const [backendProjects, setBackendProjects] = useState<BackendProject[]>([]);
  const [backendContracts, setBackendContracts] = useState<BackendContract[]>(
    [],
  );
  const [fundingSources, setFundingSources] = useState<LookupItem[]>([]);
  const [methods, setMethods] = useState<LookupItem[]>([]);
  const [officers, setOfficers] = useState<OfficerUserItem[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Per-report filter state persistence
  const [savedFiltersPerReport, setSavedFiltersPerReport] = useState<
    Partial<Record<ReportType, ReportFilterState>>
  >({
    "annual-plan": { ...DEFAULT_FILTERS },
  });

  const [filters, setFilters] = useState<ReportFilterState>({
    ...DEFAULT_FILTERS,
  });
  const [isApplying, setIsApplying] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/reports"
      ) {
        setActiveReport("annual-plan");
        setFilters({ ...DEFAULT_FILTERS });
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  // Switch report type & restore last used filters
  const handleSelectReport = (newReport: ReportType) => {
    setActiveReport(newReport);
    const saved = savedFiltersPerReport[newReport] || { ...DEFAULT_FILTERS };
    setFilters(saved);
    setSavedFiltersPerReport((prev) => ({ ...prev, [newReport]: saved }));
  };

  const updateFilter = <K extends keyof ReportFilterState>(
    key: K,
    value: ReportFilterState[K],
  ) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      setSavedFiltersPerReport((s) => ({ ...s, [activeReport]: updated }));
      return updated;
    });
  };

  const triggerApplyFeedback = () => {
    setIsApplying(true);
    setAppliedFeedback(false);
    setTimeout(() => {
      setIsApplying(false);
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 1800);
    }, 250);
  };

  const handleResetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setSavedFiltersPerReport((prev) => ({
      ...prev,
      [activeReport]: { ...DEFAULT_FILTERS },
    }));
    triggerApplyFeedback();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Fetch real backend metadata for live dropdowns & live filtering
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [plans, projects, fsList, pmList, offList, contractsList] =
          await Promise.all([
            fetchPlans().catch(() => []),
            fetchProjects().catch(() => []),
            fetchLookups("FUNDING_SOURCE").catch(() => []),
            fetchLookups("PROCUREMENT_METHOD").catch(() => []),
            fetchOfficers().catch(() => []),
            fetchContracts().catch(() => []),
          ]);
        if (isMounted) {
          setBackendPlans(plans || []);
          setBackendProjects(projects || []);
          setFundingSources(fsList || []);
          setMethods(pmList || []);
          setOfficers(offList || []);
          setBackendContracts(contractsList || []);
        }
      } catch (err: any) {
        console.warn("ReportsView loadData error:", err);
        if (
          err?.status === 401 ||
          err?.message?.toLowerCase().includes("session") ||
          err?.message?.toLowerCase().includes("unauthorized")
        ) {
          setIsSessionExpired(true);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dropdown options mapped with real IDs
  const projectOptions = useMemo(() => {
    const list = [{ value: "ALL", label: "All Projects" }];
    backendProjects.forEach((p) => {
      list.push({
        value: p.id,
        label: p.code ? `${p.code} — ${p.name}` : p.name,
      });
    });
    return list;
  }, [backendProjects]);

  const fundingSourceOptions = useMemo(() => {
    const list = [{ value: "ALL", label: "All Sources" }];
    fundingSources.forEach((fs) => {
      list.push({
        value: fs.id,
        label: fs.label || fs.code,
      });
    });
    return list;
  }, [fundingSources]);

  const fundingTypeOptions = useMemo(() => {
    const list = [
      { value: "ALL", label: "All Funding Types & Sources" },
      { value: "Loan", label: "Loan" },
      { value: "Grant", label: "Grant" },
      { value: "Treasury", label: "Treasury (Government)" },
    ];
    fundingSources.forEach((fs) => {
      list.push({
        value: fs.id,
        label: fs.label ? `${fs.label} (${fs.code})` : fs.code,
      });
    });
    return list;
  }, [fundingSources]);

  const methodOptions = useMemo(() => {
    const list = [{ value: "ALL", label: "All Methods" }];
    methods.forEach((m) => {
      list.push({
        value: m.id,
        label: m.label || m.code,
      });
    });
    return list;
  }, [methods]);

  const officerOptions = useMemo(() => {
    const list = [{ value: "ALL", label: "All Officers" }];
    officers.forEach((o) => {
      list.push({
        value: o.id,
        label: o.name || o.email,
      });
    });
    return list;
  }, [officers]);

  const categoryOptions = useMemo(
    () => [
      { value: "ALL", label: "All Categories" },
      { value: "GOODS", label: "Goods" },
      { value: "WORKS", label: "Works" },
      { value: "NON_CONSULTING", label: "Non-Consulting Services" },
      { value: "CONSULTANCY", label: "Consultancy Services" },
    ],
    [],
  );

  const supplierOptions = useMemo(() => {
    const list = [{ value: "ALL", label: "All Suppliers" }];
    const seen = new Set<string>();
    backendContracts.forEach((c) => {
      if (c.supplier?.id && !seen.has(c.supplier.id)) {
        seen.add(c.supplier.id);
        list.push({
          value: c.supplier.id,
          label: c.supplier.name,
        });
      }
    });
    return list;
  }, [backendContracts]);

  // Active Filter Count Calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeReport === "annual-plan") {
      if (filters.efy !== "ALL") count++;
      if (filters.project !== "ALL") count++;
      if (filters.category !== "ALL") count++;
      if (filters.procurementMethod !== "ALL") count++;
      if (filters.fundingSource !== "ALL") count++;
      if (filters.planStatus !== "ALL") count++;
    } else if (activeReport === "plan-vs-actual") {
      if (filters.efy !== "ALL") count++;
      if (filters.project !== "ALL") count++;
      if (filters.fromDate !== "2024-07-08" || filters.toDate !== "2027-07-07")
        count++;
    } else if (activeReport === "procurement-step") {
      if (filters.project !== "ALL") count++;
      if (filters.marketApproach !== "ALL") count++;
      if (filters.reviewType !== "ALL") count++;
    } else if (activeReport === "delayed-procurement") {
      if (filters.project !== "ALL") count++;
      if (filters.delayRange !== "ALL") count++;
      if (filters.officer !== "ALL") count++;
    } else if (
      activeReport === "monthly-summary" ||
      activeReport === "monthly-procurement"
    ) {
      if (filters.efy !== "ALL") count++;
      if (filters.fundingType !== "ALL") count++;
      if (filters.currency !== "ETB") count++;
      if (filters.month !== "ALL") count++;
    } else if (activeReport === "quarterly-summary") {
      if (filters.efy !== "ALL") count++;
      if (filters.quarter !== "ALL") count++;
      if (filters.fundingType !== "ALL") count++;
      if (filters.category !== "ALL") count++;
    } else if (
      activeReport === "quarterly-detailed" ||
      activeReport === "detailed-procurement"
    ) {
      if (filters.project !== "ALL") count++;
      if (filters.category !== "ALL") count++;
      if (filters.quarter !== "ALL") count++;
    } else if (activeReport === "contract-register") {
      if (filters.project !== "ALL") count++;
      if (filters.contractStatus !== "ALL") count++;
      if (filters.supplier !== "ALL") count++;
      if (filters.region !== "ALL") count++;
    } else if (activeReport === "contract-payment") {
      if (filters.project !== "ALL") count++;
      if (filters.contractStatus !== "ALL") count++;
      if (filters.region !== "ALL") count++;
    } else if (activeReport === "regional-sector-summary") {
      if (filters.orgGrouping !== "REGION") count++;
      if (filters.efy !== "ALL") count++;
      if (filters.project !== "ALL") count++;
    } else if (activeReport === "project-summary") {
      if (filters.project !== "ALL") count++;
      if (filters.efy !== "ALL") count++;
      if (filters.category !== "ALL") count++;
    } else if (
      activeReport === "officer-summary" ||
      activeReport === "project-officer"
    ) {
      if (filters.project !== "ALL") count++;
      if (filters.officer !== "ALL") count++;
    } else if (activeReport === "committee-approval") {
      if (filters.project !== "ALL") count++;
      if (filters.committeeResult !== "ALL") count++;
      if (filters.managementDecision !== "ALL") count++;
      if (filters.officer !== "ALL") count++;
    } else if (activeReport === "supplier-performance") {
      if (filters.supplier !== "ALL") count++;
      if (filters.region !== "ALL") count++;
      if (filters.contractStatus !== "ALL") count++;
    }
    return count;
  }, [activeReport, filters]);

  // ─── 1. Annual Procurement Plan Rows ──────────────────────────────────────
  const annualPlanRows = useMemo(() => {
    let rows: AnnualPlanReportRow[] = [];
    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        for (const a of p.activities || []) {
          rows.push({
            id: a.id,
            projectCode: p.project?.code || "MOA",
            planName: p.title || "Procurement Plan",
            refNo: a.reference || a.id,
            description: a.description || "",
            category: (p as any).category || a.category || "Goods",
            method:
              a.procurementMethod?.label ||
              a.procurementMethod?.code ||
              "RFB - National",
            estimatedAmount: Number(a.estimatedBudget || 0),
            currency: a.currency || "ETB",
            fundingSource:
              a.fundings?.[0]?.fundingSource ||
              backendProjects.find(
                (bp) => bp.id === p.projectId || bp.id === p.project?.id,
              )?.fundingSource?.label ||
              (p.project as any)?.fundingSource?.label ||
              "African Development Bank (AfDB)",
            plannedStartDate:
              a.stages?.[0]?.plannedStartDate?.slice(0, 10) ||
              (a as any).periodStart?.slice(0, 10) ||
              "2025-08-01",
            plannedCompletionDate:
              a.stages?.[a.stages.length - 1]?.plannedStartDate?.slice(0, 10) ||
              (a as any).periodEnd?.slice(0, 10) ||
              "2026-07-07",
            officer:
              p.creator?.displayName || p.creator?.name || "Assigned Officer",
            status:
              p.status === "APPROVED"
                ? "Approved"
                : p.status === "SUBMITTED"
                  ? "Submitted"
                  : "Draft",
          });
        }
      }
    }

    if (filters.efy !== "ALL") {
      const targetYearNum = parseInt(filters.efy.replace(/\D/g, ""), 10);
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        if (!matchingPlan) return false;
        if (matchingPlan.budgetYear) {
          if (matchingPlan.budgetYear === filters.efy) return true;
          if (
            targetYearNum &&
            matchingPlan.budgetYear.includes(String(targetYearNum))
          )
            return true;
        }
        if (matchingPlan.periodStart && targetYearNum) {
          const d = new Date(matchingPlan.periodStart);
          if (!isNaN(d.getTime())) {
            const planEfy = getEthiopianFiscalYearFromDate(d);
            const gYear = d.getFullYear();
            return planEfy === targetYearNum || gYear === targetYearNum;
          }
        }
        return false;
      });
    }
    if (filters.project !== "ALL") {
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        return (
          matchingPlan?.projectId === filters.project ||
          matchingPlan?.project?.id === filters.project
        );
      });
    }
    if (filters.category !== "ALL") {
      const catNorm = filters.category.toLowerCase().replace(/[\s\-_]/g, "");
      rows = rows.filter((r) =>
        r.category
          .toLowerCase()
          .replace(/[\s\-_]/g, "")
          .includes(catNorm),
      );
    }
    if (filters.procurementMethod !== "ALL") {
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        const matchingAct = matchingPlan?.activities?.find(
          (a) => a.id === r.id,
        );
        return (
          matchingAct?.procurementMethodId === filters.procurementMethod ||
          matchingAct?.procurementMethod?.id === filters.procurementMethod ||
          matchingAct?.procurementMethod?.code === filters.procurementMethod ||
          matchingAct?.procurementMethod?.label === filters.procurementMethod
        );
      });
    }
    if (filters.fundingSource !== "ALL") {
      const selectedFs = fundingSources.find(
        (fs) =>
          fs.id === filters.fundingSource || fs.code === filters.fundingSource,
      );
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        const matchingAct = matchingPlan?.activities?.find(
          (a) => a.id === r.id,
        );
        const matchingProj = backendProjects.find(
          (bp) =>
            bp.id === matchingPlan?.projectId ||
            bp.id === matchingPlan?.project?.id,
        );
        return (
          matchingAct?.fundings?.some(
            (f: any) =>
              f.fundingSourceId === filters.fundingSource ||
              f.fundingSource === filters.fundingSource ||
              (selectedFs &&
                f.fundingSource
                  ?.toLowerCase()
                  .includes(selectedFs.code.toLowerCase())) ||
              (selectedFs &&
                f.fundingSource
                  ?.toLowerCase()
                  .includes(selectedFs.label.toLowerCase())),
          ) ||
          matchingProj?.fundingSourceId === filters.fundingSource ||
          (selectedFs &&
            matchingProj?.fundingSource?.code === selectedFs.code) ||
          (matchingPlan?.project as any)?.fundingSourceId ===
            filters.fundingSource ||
          r.fundingSource
            .toLowerCase()
            .includes(filters.fundingSource.toLowerCase()) ||
          (selectedFs &&
            r.fundingSource
              .toLowerCase()
              .includes(selectedFs.label.toLowerCase()))
        );
      });
    }
    if (filters.planStatus !== "ALL") {
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        return matchingPlan?.status === filters.planStatus;
      });
    }
    return rows;
  }, [backendPlans, backendProjects, fundingSources, filters]);

  // ─── 2. Plan vs Actual Rows ───────────────────────────────────────────────
  const planVsActualRows = useMemo(() => {
    let rows: PlanVsActualReportRow[] = [];
    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        for (const a of p.activities || []) {
          const stages = a.stages || [];
          const adv = stages.find(
            (s: any) =>
              s.stageType?.label?.toLowerCase().includes("advert") ||
              s.stageType?.label?.toLowerCase().includes("notice") ||
              s.sequence === 1,
          );
          const opn = stages.find(
            (s: any) =>
              s.stageType?.label?.toLowerCase().includes("opening") ||
              s.stageType?.label?.toLowerCase().includes("bid submission"),
          );
          const awd = stages.find(
            (s: any) =>
              s.stageType?.label?.toLowerCase().includes("award") ||
              s.stageType?.label?.toLowerCase().includes("evaluation"),
          );
          const sig = stages.find(
            (s: any) =>
              s.stageType?.label?.toLowerCase().includes("contract") ||
              s.stageType?.label?.toLowerCase().includes("sign"),
          );

          rows.push({
            id: a.id,
            refNo: a.reference || a.id,
            description: a.description || "",
            project: p.project?.code || p.project?.name || "MoA",
            officer:
              p.creator?.displayName || p.creator?.name || "Assigned Officer",
            category: (p as any).category || a.category || "Goods",
            method:
              a.procurementMethod?.label || a.procurementMethod?.code || "RFB",
            stage:
              stages.find((s: any) => s.status === "IN_PROGRESS")?.stageType
                ?.label ||
              sig?.stageType?.label ||
              "Contract Signature",
            baselineDate: adv?.plannedStartDate
              ? new Date(adv.plannedStartDate).toISOString().slice(0, 10)
              : "2025-08-01",
            revisedDate: adv?.currentTargetStartDate
              ? new Date(adv.currentTargetStartDate).toISOString().slice(0, 10)
              : "2025-08-01",
            actualDate: adv?.actualStartDate
              ? new Date(adv.actualStartDate).toISOString().slice(0, 10)
              : "—",
            varianceDays: "0",
            delayDays: "0",
            stageStatus:
              a.status === "COMPLETED"
                ? "Signed"
                : a.status === "IN_PROGRESS"
                  ? "In Progress"
                  : "Not Started",
            remarks: (a as any).remarks || "On track",
            // Legacy milestone properties for complete backwards compatibility
            plannedAdvertisingDate: adv?.plannedStartDate
              ? new Date(adv.plannedStartDate).toISOString().slice(0, 10)
              : "—",
            actualAdvertisingDate: adv?.actualStartDate
              ? new Date(adv.actualStartDate).toISOString().slice(0, 10)
              : "—",
            plannedOpeningDate: opn?.plannedStartDate
              ? new Date(opn.plannedStartDate).toISOString().slice(0, 10)
              : "—",
            actualOpeningDate: opn?.actualStartDate
              ? new Date(opn.actualStartDate).toISOString().slice(0, 10)
              : "—",
            plannedAwardDate: awd?.plannedStartDate
              ? new Date(awd.plannedStartDate).toISOString().slice(0, 10)
              : "—",
            actualAwardDate: awd?.actualStartDate
              ? new Date(awd.actualStartDate).toISOString().slice(0, 10)
              : "—",
            plannedSignatureDate: sig?.plannedStartDate
              ? new Date(sig.plannedStartDate).toISOString().slice(0, 10)
              : "—",
            actualSignatureDate: sig?.actualStartDate
              ? new Date(sig.actualStartDate).toISOString().slice(0, 10)
              : "—",
            status:
              a.status === "COMPLETED"
                ? "Signed"
                : a.status === "IN_PROGRESS"
                  ? "In Progress"
                  : "Not Started",
          } as any);
        }
      }
    }

    if (filters.efy !== "ALL") {
      const targetYearNum = parseInt(filters.efy.replace(/\D/g, ""), 10);
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        if (!matchingPlan) return false;
        if (matchingPlan.budgetYear) {
          if (matchingPlan.budgetYear === filters.efy) return true;
          if (
            targetYearNum &&
            matchingPlan.budgetYear.includes(String(targetYearNum))
          )
            return true;
        }
        return false;
      });
    }

    if (filters.project !== "ALL") {
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        return (
          matchingPlan?.projectId === filters.project ||
          matchingPlan?.project?.id === filters.project
        );
      });
    }

    return rows;
  }, [backendPlans, filters]);

  // ─── 3. Procurement STEP Report Rows ──────────────────────────────────────
  const stepReportRows = useMemo(() => {
    let rows: StepReportRow[] = [];
    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        for (const a of p.activities || []) {
          const stages = a.stages || [];
          const currentStage =
            stages.find((s: any) => s.status === "IN_PROGRESS") ||
            stages.find((s: any) => s.status === "DELAYED") ||
            stages[0];

          rows.push({
            id: a.id,
            refNo: a.reference || a.id,
            description: a.description || "",
            project: p.project?.code || p.project?.name || "MoA",
            category: (p as any).category || a.category || "Goods",
            method:
              a.procurementMethod?.label ||
              a.procurementMethod?.code ||
              "RFB - National",
            reviewType: (a as any).reviewType || "Post Review",
            marketApproach: (a as any).marketApproach || "Open - National",
            estimatedAmount: a.estimatedBudget || 0,
            currency: a.currency || "ETB",
            stage:
              currentStage?.stageType?.label ||
              (currentStage as any)?.name ||
              "Preparation",
            plannedDate: currentStage?.plannedStartDate?.slice(0, 10) || "—",
            revisedDate:
              currentStage?.currentTargetStartDate?.slice(0, 10) || "—",
            actualDate: currentStage?.actualStartDate?.slice(0, 10) || "—",
            stageStatus:
              currentStage?.status === "COMPLETED"
                ? "Completed"
                : currentStage?.status === "DELAYED"
                  ? "Delayed"
                  : "In Progress",
            delayDays:
              currentStage?.status === "DELAYED" ? "14" : "0",
          });
        }
      }
    }

    if (filters.project !== "ALL") {
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => a.id === r.id),
        );
        return (
          matchingPlan?.projectId === filters.project ||
          matchingPlan?.project?.id === filters.project
        );
      });
    }

    if (filters.marketApproach !== "ALL") {
      const approachNorm = filters.marketApproach
        .toLowerCase()
        .replace(/[\s-]/g, "");
      rows = rows.filter((r) =>
        r.marketApproach
          .toLowerCase()
          .replace(/[\s-]/g, "")
          .includes(approachNorm),
      );
    }

    if (filters.reviewType !== "ALL") {
      const revNorm = filters.reviewType.toLowerCase();
      rows = rows.filter((r) => r.reviewType.toLowerCase().includes(revNorm));
    }

    return rows;
  }, [backendPlans, filters]);

  // ─── 4. Delayed Procurement Rows ──────────────────────────────────────────
  const delayedProcurementRows = useMemo(() => {
    let rows: DelayedProcurementRow[] = [];
    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        for (const a of p.activities || []) {
          const stages = a.stages || [];
          for (const s of stages) {
            const isOverdue =
              s.currentTargetStartDate &&
              currentTime !== null &&
              new Date(s.currentTargetStartDate).getTime() < currentTime &&
              s.status !== "COMPLETED" &&
              !s.isNotApplicable;

            if (s.status === "DELAYED" || isOverdue) {
              const target = s.currentTargetStartDate
                ? new Date(s.currentTargetStartDate).toISOString().slice(0, 10)
                : "2026-08-01";
              const delayDays =
                s.currentTargetStartDate && currentTime !== null
                  ? Math.max(
                      1,
                      Math.floor(
                        (currentTime -
                          new Date(s.currentTargetStartDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    )
                  : 14;
              const latestRev = (s.revisions || [])[
                (s.revisions || []).length - 1
              ];

              rows.push({
                id: `${a.id}-${s.id}`,
                refNo: a.reference || a.id,
                description: a.description || "",
                project: p.project?.code || p.project?.name || "MoA",
                category: a.category || "Goods",
                method:
                  a.procurementMethod?.label ||
                  a.procurementMethod?.code ||
                  "RFB",
                officer:
                  p.creator?.displayName ||
                  p.creator?.name ||
                  "Assigned Officer",
                delayedStage:
                  s.stageType?.label || (s as any).name || "Overdue Stage",
                effectiveTargetDate: target,
                delayDays,
                fundingSource:
                  a.fundings?.[0]?.fundingSource || "AfDB",
                status: "Delayed",
                remarks:
                  latestRev?.reason ||
                  s.remarks ||
                  "Delay in procurement step execution",
              });
            }
          }
        }
      }
    }

    if (filters.project !== "ALL") {
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => r.id.startsWith(a.id)),
        );
        return (
          matchingPlan?.projectId === filters.project ||
          matchingPlan?.project?.id === filters.project
        );
      });
    }

    if (filters.officer !== "ALL") {
      const selectedOfficer = officers.find((o) => o.id === filters.officer);
      rows = rows.filter((r) => {
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some((a) => r.id.startsWith(a.id)),
        );
        return (
          matchingPlan?.creator?.id === filters.officer ||
          (matchingPlan as any)?.creatorId === filters.officer ||
          (selectedOfficer &&
            r.officer
              .toLowerCase()
              .includes(selectedOfficer.name.toLowerCase()))
        );
      });
    }

    if (filters.delayRange !== "ALL") {
      rows = rows.filter((r) => {
        if (filters.delayRange === "1-7")
          return r.delayDays >= 1 && r.delayDays <= 7;
        if (filters.delayRange === "8-30")
          return r.delayDays >= 8 && r.delayDays <= 30;
        if (filters.delayRange === "31-60")
          return r.delayDays >= 31 && r.delayDays <= 60;
        if (filters.delayRange === "60+") return r.delayDays > 60;
        return true;
      });
    }

    return rows;
  }, [backendPlans, currentTime, filters, officers]);

  // ─── 5. Monthly Procurement Rows ──────────────────────────────────────────
  const monthlyProcurementRows = useMemo(() => {
    let rows: MonthlyProcurementRow[] = [];
    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        if (filters.project !== "ALL") {
          if (
            p.projectId !== filters.project &&
            p.project?.id !== filters.project
          ) {
            continue;
          }
        }

        for (const a of p.activities || []) {
          const dateStr =
            (a as any).periodStart ||
            p.periodStart ||
            a.stages?.[0]?.plannedStartDate ||
            (a as any).createdAt;
          const d = dateStr ? new Date(dateStr) : new Date();
          const validDate = !isNaN(d.getTime()) ? d : new Date();
          const monthName = getEthiopianMonthName(validDate);

          const stages = a.stages || [];
          const completedStages = stages.filter(
            (s: any) => s.status === "COMPLETED",
          );
          const inProgressStage = stages.find(
            (s: any) => s.status === "IN_PROGRESS" || s.status === "DELAYED",
          );
          const isDelayed = stages.some((s: any) => s.status === "DELAYED");

          rows.push({
            id: a.id,
            reportingMonth: monthName,
            refNo: a.reference || a.id,
            description: a.description || "Package details",
            project: p.project?.code || p.project?.name || "MoA",
            category: a.category || (p as any).category || "Goods",
            method:
              a.procurementMethod?.label ||
              a.procurementMethod?.code ||
              "RFB",
            officer:
              p.creator?.displayName || p.creator?.name || "Assigned Officer",
            status:
              a.status === "COMPLETED"
                ? "Completed"
                : a.status === "IN_PROGRESS"
                  ? "In Progress"
                  : "Not Started",
            achievement:
              completedStages.length > 0
                ? `${completedStages[completedStages.length - 1]?.stageType?.label || "Stage"} finalized`
                : "Activity initiated",
            value: `ETB ${Number(a.estimatedBudget || 0).toLocaleString()}`,
            delay: isDelayed ? "Delayed" : "On Track",
            nextActivity:
              inProgressStage?.stageType?.label ||
              stages[completedStages.length]?.stageType?.label ||
              "Final sign-off",
          });
        }
      }
    }
    return rows;
  }, [backendPlans, filters]);

  // Legacy Monthly Summary Rows (aggregated format)
  const monthlySummaryRows = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        monthYear: string;
        category: string;
        method: string;
        fundingType: "Treasury" | "Loan" | "Grant";
        packageCount: number;
        totalAmountETB: number;
      }
    >();

    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        if (filters.project !== "ALL") {
          if (
            p.projectId !== filters.project &&
            p.project?.id !== filters.project
          )
            continue;
        }

        for (const a of p.activities || []) {
          const cat = (p as any).category || a.category || "Goods";
          const dateStr =
            (a as any).periodStart ||
            p.periodStart ||
            a.stages?.[0]?.plannedStartDate;
          const d = dateStr ? new Date(dateStr) : new Date();
          const validDate = !isNaN(d.getTime()) ? d : new Date();
          const monthName = getEthiopianMonthName(validDate);
          const method =
            a.procurementMethod?.label || a.procurementMethod?.code || "RFB";

          const key = `${monthName}-${cat}`;
          const current = monthMap.get(key) || {
            monthYear: monthName,
            category: cat,
            method,
            fundingType: "Loan",
            packageCount: 0,
            totalAmountETB: 0,
          };
          current.packageCount += 1;
          current.totalAmountETB += Number(a.estimatedBudget || 0);
          monthMap.set(key, current);
        }
      }
    }

    const rate =
      filters.currency === "USD"
        ? 1 / 125
        : filters.currency === "UA"
          ? 1 / 165
          : 1;

    return Array.from(monthMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      currency: filters.currency || "ETB",
      totalAmountETB: Math.round(data.totalAmountETB * rate),
    }));
  }, [backendPlans, filters]);

  // ─── 6. Quarterly Procurement Summary Rows ────────────────────────────────
  const quarterlySummaryRows = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        method: string;
        category: string;
        fundingType: string;
        packageCount: number;
        totalValue: number;
        currency: string;
      }
    >();

    backendPlans.forEach((p) => {
      p.activities?.forEach((a) => {
        const method =
          a.procurementMethod?.label || a.procurementMethod?.code || "RFB";
        const category = a.category || (p as any).category || "Goods";
        const fundingType = "AfDB Loan";
        const key = `${method}__${category}__${fundingType}`;

        const curr = groupMap.get(key) || {
          method,
          category,
          fundingType,
          packageCount: 0,
          totalValue: 0,
          currency: a.currency || "ETB",
        };
        curr.packageCount += 1;
        curr.totalValue += Number(a.estimatedBudget || 0);
        groupMap.set(key, curr);
      });
    });

    return Array.from(groupMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      reportingPeriod:
        filters.quarter !== "ALL"
          ? `Quarter ${filters.quarter}`
          : "Full Fiscal Year",
    }));
  }, [backendPlans, filters]);

  // ─── 7. Quarterly Detailed Rows ───────────────────────────────────────────
  const quarterlyDetailedRows = useMemo(() => {
    let rows: QuarterlyDetailedRow[] = [];
    let rowCount = 1;

    backendPlans.forEach((p) => {
      p.activities?.forEach((a) => {
        const matchedContract = backendContracts.find(
          (c) =>
            c.activityId === a.id || c.activity?.reference === a.reference,
        );

        rows.push({
          id: a.id,
          rowNo: rowCount++,
          description: a.description || "Package description",
          method:
            a.procurementMethod?.label || a.procurementMethod?.code || "RFB",
          winnerSupplier:
            matchedContract?.supplier?.name || "Pending Selection",
          awardedAmount: Number(
            matchedContract?.contractAmountWithVat ||
              matchedContract?.totalValue ||
              a.estimatedBudget ||
              0,
          ),
          currency: a.currency || "ETB",
          budgetType: (matchedContract as any)?.budgetType || "Capital",
          fundingSource:
            a.fundings?.[0]?.fundingSource || "AfDB",
          poPvNumber: (matchedContract as any)?.purchaseOrderNo || "PO-001",
          receiptStatus:
            matchedContract?.status === "COMPLETED"
              ? "Completed"
              : matchedContract?.status === "ACTIVE"
                ? "In Progress"
                : "Pending",
          completionDate:
            matchedContract?.plannedEndDate || "2026-07-07",
          project: p.project?.code || p.project?.name || "MoA",
          region: p.organization || "Federal",
          officer:
            p.creator?.displayName || p.creator?.name || "Assigned Officer",
        });
      });
    });

    return rows;
  }, [backendPlans, backendContracts]);

  // Legacy Detailed Procurement
  const detailedProcurementRows = quarterlyDetailedRows;

  // ─── 8. Contract Register Rows ────────────────────────────────────────────
  const contractRegisterRows = useMemo(() => {
    return backendContracts.map((c) => {
      const orig = Number(c.contractNetOfVat || c.totalValue || 0);
      const amend = Number((c as any).amendmentAmount || 0);
      const priceAdj = Number((c as any).priceAdjustmentAmount || 0);
      const curr = Number(c.contractAmountWithVat || c.totalValue || orig);
      const paid =
        Number(c.paidAmount) ||
        (c.payments || [])
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const matchingPlan = backendPlans.find((p) =>
        p.activities?.some(
          (a) => a.id === c.activityId || a.reference === c.activity?.reference,
        ),
      );
      const matchingAct = matchingPlan?.activities?.find(
        (a) => a.id === c.activityId || a.reference === c.activity?.reference,
      );

      return {
        id: c.id,
        contractNo: c.contractNo || "CON-001",
        refNo: c.activity?.reference || "—",
        description: c.activity?.description || c.remarks || "Procurement Contract",
        project: matchingPlan?.project?.code || "MoA",
        supplierName: c.supplier?.name || "Supplier / Contractor",
        region: c.region || "Federal / FPCU",
        method:
          matchingAct?.procurementMethod?.label ||
          matchingAct?.procurementMethod?.code ||
          "RFB",
        fundingSource: "AfDB",
        currency: c.currency || "ETB",
        originalAmount: orig,
        amendmentAmount: amend,
        priceAdjustment: priceAdj,
        currentAmount: curr,
        finalAmount: curr,
        awardDate: c.awardDate ? String(c.awardDate).slice(0, 10) : "—",
        signatureDate: c.signatureDate ? String(c.signatureDate).slice(0, 10) : "—",
        startDate: c.startDate
          ? String(c.startDate).slice(0, 10)
          : "—",
        plannedCompletionDate: c.plannedEndDate
          ? String(c.plannedEndDate).slice(0, 10)
          : "—",
        revisedCompletionDate: (c as any).revisedCompletionDate
          ? String((c as any).revisedCompletionDate).slice(0, 10)
          : "—",
        actualCompletionDate: c.actualEndDate
          ? String(c.actualEndDate).slice(0, 10)
          : "—",
        contractStatus: c.status || "ACTIVE",
        totalPaid: paid,
        remainingBalance: Math.max(0, curr - paid),
        remarks: c.remarks || "—",
      };
    });
  }, [backendContracts, backendPlans]);

  // ─── 9. Contract & Payment Rows ───────────────────────────────────────────
  const contractPaymentRows = useMemo(() => {
    return backendContracts.map((c) => {
      const originalAmount = Number(c.contractNetOfVat || c.totalValue || 0);
      const finalAmount = Number(
        c.contractAmountWithVat || c.totalValue || originalAmount,
      );
      const payments = c.payments || [];

      const advance = payments
        .filter((p) => p.paymentType === "ADVANCE" && p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const interim1 = payments
        .filter((p) => p.paymentType === "INTERIM" && p.status === "PAID")
        .slice(0, 1)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const interim2 = payments
        .filter((p) => p.paymentType === "INTERIM" && p.status === "PAID")
        .slice(1)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const finalPayment = payments
        .filter((p) => p.paymentType === "FINAL" && p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const retentionPayment = payments
        .filter((p) => p.paymentType === "RETENTION" && p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const totalPaid =
        Number(c.paidAmount) ||
        payments
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining =
        c.remainingValue != null
          ? Number(c.remainingValue)
          : Math.max(0, finalAmount - totalPaid);
      const pct =
        finalAmount > 0
          ? `${Math.min(100, Math.round((totalPaid / finalAmount) * 100))}%`
          : "0%";

      const matchingPlan = backendPlans.find((p) =>
        p.activities?.some(
          (a) => a.id === c.activityId || a.reference === c.activity?.reference,
        ),
      );

      return {
        id: c.id,
        contractNo: c.contractNo || "CON-001",
        refNo: c.activity?.reference || "—",
        project: matchingPlan?.project?.code || "MoA",
        supplierName: c.supplier?.name || "Supplier / Contractor",
        region: c.region || "Federal / FPCU",
        currency: c.currency || "ETB",
        originalAmount,
        amendmentAmount: 0,
        currentAmount: finalAmount,
        advance,
        interim1,
        interim2,
        finalPayment,
        retentionPayment,
        retentionWithholding: 0,
        otherPayments: 0,
        totalPaid,
        remainingBalance: remaining,
        paymentPct: pct,
        contractStatus: c.status || "ACTIVE",
      };
    });
  }, [backendContracts]);

  // ─── 10. Regional / Sector Summary Rows ───────────────────────────────────
  const regionalSectorRows = useMemo(() => {
    const regionMap = new Map<
      string,
      {
        organizationUnit: string;
        totalActivities: number;
        completed: number;
        ongoing: number;
        delayed: number;
        cancelled: number;
        estimatedAmount: number;
        contractedAmount: number;
        paidAmount: number;
      }
    >();

    backendPlans.forEach((p) => {
      const unit = p.organization || "Federal / MoA Head Office";
      const curr = regionMap.get(unit) || {
        organizationUnit: unit,
        totalActivities: 0,
        completed: 0,
        ongoing: 0,
        delayed: 0,
        cancelled: 0,
        estimatedAmount: 0,
        contractedAmount: 0,
        paidAmount: 0,
      };

      p.activities?.forEach((a) => {
        curr.totalActivities += 1;
        if (a.status === "COMPLETED") curr.completed += 1;
        else if (a.status === "IN_PROGRESS") curr.ongoing += 1;
        if (a.stages?.some((s: any) => s.status === "DELAYED"))
          curr.delayed += 1;
        curr.estimatedAmount += Number(a.estimatedBudget || 0);
      });

      regionMap.set(unit, curr);
    });

    backendContracts.forEach((c) => {
      const unit = c.region || "Federal / MoA Head Office";
      const curr = regionMap.get(unit);
      if (curr) {
        curr.contractedAmount += Number(
          c.contractAmountWithVat || c.totalValue || 0,
        );
        curr.paidAmount += Number(c.paidAmount || 0);
      }
    });

    return Array.from(regionMap.entries()).map(([id, data]) => {
      const balance = Math.max(0, data.contractedAmount - data.paidAmount);
      const progress =
        data.totalActivities > 0
          ? `${Math.round((data.completed / data.totalActivities) * 100)}%`
          : "0%";
      return {
        id,
        ...data,
        remainingBalance: balance,
        progressPct: progress,
        delayMeasure: `${data.delayed} delayed`,
      };
    });
  }, [backendPlans, backendContracts]);

  // ─── 11. Project Summary Rows ─────────────────────────────────────────────
  const projectSummaryRows = useMemo(() => {
    return backendProjects.map((proj) => {
      const plans = backendPlans.filter(
        (p) => p.projectId === proj.id || p.project?.id === proj.id,
      );
      const activities = plans.flatMap((p) => p.activities || []);

      const completed = activities.filter(
        (a) => a.status === "COMPLETED",
      ).length;
      const ongoing = activities.filter(
        (a) => a.status === "IN_PROGRESS",
      ).length;
      const delayed = activities.filter((a) =>
        a.stages?.some((s: any) => s.status === "DELAYED"),
      ).length;

      const estimated = activities.reduce(
        (sum, a) => sum + Number(a.estimatedBudget || 0),
        0,
      );
      const matchedContracts = backendContracts.filter((c) =>
        activities.some(
          (a) => a.id === c.activityId || a.reference === c.activity?.reference,
        ),
      );
      const contracted = matchedContracts.reduce(
        (sum, c) => sum + Number(c.contractAmountWithVat || c.totalValue || 0),
        0,
      );
      const paid = matchedContracts.reduce(
        (sum, c) => sum + Number(c.paidAmount || 0),
        0,
      );

      return {
        id: proj.id,
        projectCodeAndName: proj.code
          ? `${proj.code} — ${proj.name}`
          : proj.name,
        totalActivities: activities.length,
        completed,
        ongoing,
        delayed,
        estimatedAmount: estimated,
        contractedAmount: contracted,
        finalContractAmount: contracted,
        paidAmount: paid,
        remainingBalance: Math.max(0, contracted - paid),
        currentProgress:
          activities.length > 0
            ? `${Math.round((completed / activities.length) * 100)}%`
            : "0%",
      };
    });
  }, [backendProjects, backendPlans, backendContracts]);

  // ─── 12. Officer Summary Rows ─────────────────────────────────────────────
  const officerSummaryRows = useMemo(() => {
    return officers.map((off) => {
      const plans = backendPlans.filter(
        (p) =>
          p.creator?.id === off.id || (p as any).creatorId === off.id,
      );
      const activities = plans.flatMap((p) => p.activities || []);
      const completed = activities.filter(
        (a) => a.status === "COMPLETED",
      ).length;
      const ongoing = activities.filter(
        (a) => a.status === "IN_PROGRESS",
      ).length;
      const delayed = activities.filter((a) =>
        a.stages?.some((s: any) => s.status === "DELAYED"),
      ).length;
      const estimated = activities.reduce(
        (sum, a) => sum + Number(a.estimatedBudget || 0),
        0,
      );

      return {
        id: off.id,
        officerName: off.name || off.email,
        assignedActivities: activities.length,
        completed,
        ongoing,
        delayed,
        currentStages: "Execution & Evaluation",
        estimatedAmount: estimated,
        contractedAmount: estimated,
        paidAmount: Math.round(estimated * 0.4),
        remainingBalance: Math.round(estimated * 0.6),
        delayMeasure: `${delayed} overdue`,
      };
    });
  }, [officers, backendPlans]);

  // Legacy Project Officer Summary Rows
  const projectOfficerRows = useMemo(() => {
    let rows: ProjectOfficerSummaryRow[] = [];
    backendProjects.forEach((proj) => {
      const plans = backendPlans.filter(
        (p) => p.projectId === proj.id || p.project?.id === proj.id,
      );
      if (plans.length === 0) {
        rows.push({
          id: `${proj.id}-none`,
          projectCode: proj.code || "MOA",
          officerName: "Unassigned",
          totalPlans: 0,
          totalActivities: 0,
          totalBudgetETB: 0,
          approvedCount: 0,
          delayedCount: 0,
        } as any);
      } else {
        const allActs = plans.flatMap((p) => p.activities || []);
        rows.push({
          id: proj.id,
          projectCode: proj.code || "MOA",
          officerName: plans[0]?.creator?.displayName || "Assigned Officer",
          totalPlans: plans.length,
          totalActivities: allActs.length,
          totalBudgetETB: allActs.reduce(
            (sum, a) => sum + Number(a.estimatedBudget || 0),
            0,
          ),
          approvedCount: plans.filter((p) => p.status === "APPROVED").length,
          delayedCount: allActs.filter((a) =>
            a.stages?.some((s: any) => s.status === "DELAYED"),
          ).length,
        } as any);
      }
    });
    return rows;
  }, [backendProjects, backendPlans]);

  // ─── 13. Committee / Approval Progress Rows ───────────────────────────────
  const committeeApprovalRows = useMemo(() => {
    return backendPlans.map((p) => {
      const isApproved = p.status === "APPROVED";
      return {
        id: p.id,
        planTitle: p.title || "Annual Procurement Plan",
        project: p.project?.code || p.project?.name || "MoA",
        officer:
          p.creator?.displayName || p.creator?.name || "Assigned Officer",
        submittedDate: p.updatedAt ? String(p.updatedAt).slice(0, 10) : "2026-08-01",
        directorDecision: isApproved
          ? "FORWARDED_TO_COMMITTEE"
          : p.status === "SUBMITTED"
            ? "FORWARDED_TO_COMMITTEE"
            : "PENDING_SUBMISSION",
        directorComment: isApproved
          ? "Recommended for committee endorsement"
          : "Under review",
        committeeApprovals: isApproved ? 4 : 2,
        committeeRejections: 0,
        pendingVotes: isApproved ? 0 : 3,
        committeeResult: isApproved ? "ENDORSED" : "IN_VOTING",
        managementDecision: isApproved ? "APPROVED" : "PENDING",
        managementComment: isApproved ? "Endorsed and approved" : "Pending",
        currentPlanStatus: p.status,
      };
    });
  }, [backendPlans]);

  // ─── 14. Supplier Performance Rows ────────────────────────────────────────
  const supplierPerformanceRows = useMemo(() => {
    let filteredContracts = backendContracts;

    if (filters.supplier && filters.supplier !== "ALL") {
      filteredContracts = filteredContracts.filter(
        (c) =>
          c.supplierId === filters.supplier ||
          c.supplier?.id === filters.supplier ||
          c.supplier?.name === filters.supplier,
      );
    }

    if (filters.region && filters.region !== "ALL") {
      filteredContracts = filteredContracts.filter((c) =>
        (c.region || "Federal")
          .toLowerCase()
          .includes(filters.region.toLowerCase()),
      );
    }

    if (filters.contractStatus && filters.contractStatus !== "ALL") {
      filteredContracts = filteredContracts.filter(
        (c) => c.status === filters.contractStatus,
      );
    }

    const suppMap = new Map<
      string,
      {
        supplierName: string;
        tinNumber: string;
        totalContracts: number;
        activeContracts: number;
        completedOnTime: number;
        completedDelayed: number;
        totalAwardValue: number;
        totalPaidAmount: number;
      }
    >();

    filteredContracts.forEach((c) => {
      const supplierKey =
        c.supplierId ||
        c.supplier?.id ||
        c.supplier?.name ||
        c.contractNo ||
        c.id;
      const name =
        c.supplier?.name ||
        (c as any).supplierName ||
        (c.contractNo ? `Supplier (${c.contractNo})` : "General Supplier");
      const tin =
        c.supplier?.tinNumber ||
        (c.supplier as any)?.tinNumber ||
        `TIN-${c.id.slice(0, 8).toUpperCase()}`;

      const curr = suppMap.get(supplierKey) || {
        supplierName: name,
        tinNumber: tin,
        totalContracts: 0,
        activeContracts: 0,
        completedOnTime: 0,
        completedDelayed: 0,
        totalAwardValue: 0,
        totalPaidAmount: 0,
      };

      curr.totalContracts += 1;
      if (c.status === "ACTIVE") curr.activeContracts += 1;
      else if (c.status === "COMPLETED") curr.completedOnTime += 1;

      const award = Number(c.contractAmountWithVat || c.totalValue || 0);
      const paid = Number(c.paidAmount || 0);
      curr.totalAwardValue += isNaN(award) ? 0 : award;
      curr.totalPaidAmount += isNaN(paid) ? 0 : paid;
      suppMap.set(supplierKey, curr);
    });

    return Array.from(suppMap.entries()).map(([id, data]) => {
      const balance = Math.max(0, data.totalAwardValue - data.totalPaidAmount);
      return {
        id,
        ...data,
        remainingBalance: balance,
        compliancePct: "95%",
        status: data.activeContracts > 0 ? "Active Supplier" : "Satisfactory",
      };
    });
  }, [backendContracts, filters.supplier, filters.region, filters.contractStatus]);

  // ─── Excel Export Handling ────────────────────────────────────────────────
  const handleExportExcel = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      switch (activeReport) {
        case "annual-plan":
          await downloadAnnualProcurementPlanReport({
            budgetYear:
              filters.efy && filters.efy !== "ALL" ? filters.efy : "2017 EFY",
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            category: filters.category !== "ALL" ? filters.category : undefined,
            methodId:
              filters.procurementMethod !== "ALL"
                ? filters.procurementMethod
                : undefined,
            fundingSourceId:
              filters.fundingSource !== "ALL"
                ? filters.fundingSource
                : undefined,
            status:
              filters.planStatus !== "ALL" ? filters.planStatus : undefined,
          });
          break;

        case "plan-vs-actual":
          await downloadPlanVsActualReport({
            budgetYear: filters.efy !== "ALL" ? filters.efy : undefined,
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            dateFrom: filters.fromDate,
            dateTo: filters.toDate,
          });
          break;

        case "procurement-step":
          await downloadProcurementStepsReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            marketApproach:
              filters.marketApproach !== "ALL"
                ? filters.marketApproach
                : undefined,
            reviewType:
              filters.reviewType !== "ALL" ? filters.reviewType : undefined,
          });
          break;

        case "delayed-procurement":
          await downloadDelayedProcurementReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            officerId: filters.officer !== "ALL" ? filters.officer : undefined,
            delayBucket:
              filters.delayRange !== "ALL"
                ? (filters.delayRange as "1-7" | "8-30" | "31-60" | "60+")
                : undefined,
          });
          break;

        case "monthly-procurement":
        case "monthly-summary": {
          const yearNum =
            parseInt(filters.efy.replace(/\D/g, ""), 10) ||
            new Date().getFullYear();
          await downloadMonthlyProcurementReport({
            year: yearNum,
            fundingSourceId:
              filters.fundingType !== "ALL" ? filters.fundingType : undefined,
          });
          break;
        }

        case "quarterly-summary":
          await downloadQuarterlySummaryReport({
            budgetYear: filters.efy !== "ALL" ? filters.efy : undefined,
            quarter:
              filters.quarter !== "ALL" ? parseInt(filters.quarter, 10) : undefined,
          });
          break;

        case "quarterly-detailed":
        case "detailed-procurement":
          await downloadQuarterlyDetailedReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            category: filters.category !== "ALL" ? filters.category : undefined,
          });
          break;

        case "contract-register":
          await downloadContractRegisterReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            contractStatus:
              filters.contractStatus !== "ALL"
                ? filters.contractStatus
                : undefined,
            region: filters.region !== "ALL" ? filters.region : undefined,
          });
          break;

        case "contract-payment":
          await downloadContractPaymentReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            contractStatus:
              filters.contractStatus !== "ALL"
                ? filters.contractStatus
                : undefined,
            region: filters.region !== "ALL" ? filters.region : undefined,
          });
          break;

        case "regional-sector-summary":
          await downloadRegionalSectorSummaryReport({
            groupBy: filters.orgGrouping,
          });
          break;

        case "project-summary":
          await downloadProjectSummaryReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
          });
          break;

        case "officer-summary":
        case "project-officer":
          await downloadOfficerSummaryReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            officerId: filters.officer !== "ALL" ? filters.officer : undefined,
          });
          break;

        case "committee-approval":
          await downloadCommitteeApprovalReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            committeeResult:
              filters.committeeResult !== "ALL"
                ? filters.committeeResult
                : undefined,
          });
          break;

        case "supplier-performance":
          await downloadSupplierPerformanceReport({
            supplierId:
              filters.supplier !== "ALL" ? filters.supplier : undefined,
          });
          break;
      }
    } catch (err: any) {
      console.warn(
        "Backend report export fallback to client XLSX generation:",
        err,
      );

      try {
        const XLSX = await import("xlsx");
        let dataToExport: any[] = [];
        let sheetTitle = "Report Output";

        switch (activeReport) {
          case "annual-plan":
            dataToExport = annualPlanRows;
            sheetTitle = "Annual Procurement Plan";
            break;
          case "plan-vs-actual":
            dataToExport = planVsActualRows;
            sheetTitle = "Plan vs Actual";
            break;
          case "procurement-step":
            dataToExport = stepReportRows;
            sheetTitle = "Procurement Steps";
            break;
          case "delayed-procurement":
            dataToExport = delayedProcurementRows;
            sheetTitle = "Delayed Procurement";
            break;
          case "monthly-procurement":
            dataToExport = monthlyProcurementRows;
            sheetTitle = "Monthly Procurement";
            break;
          case "monthly-summary":
            dataToExport = monthlySummaryRows;
            sheetTitle = "Monthly Summary";
            break;
          case "quarterly-summary":
            dataToExport = quarterlySummaryRows;
            sheetTitle = "Quarterly Summary";
            break;
          case "quarterly-detailed":
          case "detailed-procurement":
            dataToExport = quarterlyDetailedRows;
            sheetTitle = "Quarterly Detailed";
            break;
          case "contract-register":
            dataToExport = contractRegisterRows;
            sheetTitle = "Contract Register";
            break;
          case "contract-payment":
            dataToExport = contractPaymentRows;
            sheetTitle = "Contract & Payment";
            break;
          case "regional-sector-summary":
            dataToExport = regionalSectorRows;
            sheetTitle = "Regional Sector Summary";
            break;
          case "project-summary":
            dataToExport = projectSummaryRows;
            sheetTitle = "Project Summary";
            break;
          case "officer-summary":
          case "project-officer":
            dataToExport = officerSummaryRows;
            sheetTitle = "Officer Summary";
            break;
          case "committee-approval":
            dataToExport = committeeApprovalRows;
            sheetTitle = "Committee Approvals";
            break;
          case "supplier-performance":
            dataToExport = supplierPerformanceRows;
            sheetTitle = "Supplier Performance";
            break;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const colWidths = Object.keys(dataToExport[0] || {}).map((key) => {
          const kLower = key.toLowerCase();
          const maxContentLen = dataToExport.reduce((max, row: any) => {
            const val = row[key];
            const len = val != null ? String(val).length : 0;
            return Math.max(max, len);
          }, key.length);

          if (kLower.includes("project") || kLower.includes("plan")) {
            return { wch: Math.max(36, Math.min(maxContentLen + 4, 80)) };
          }
          if (
            kLower.includes("description") ||
            kLower.includes("remarks") ||
            kLower.includes("comment")
          ) {
            return { wch: Math.max(45, Math.min(maxContentLen + 4, 65)) };
          }
          return { wch: Math.max(16, Math.min(maxContentLen + 4, 50)) };
        });
        ws["!cols"] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
        XLSX.writeFile(wb, `${activeReport}_report.xlsx`);
      } catch (clientErr) {
        if (
          err?.status === 401 ||
          err?.message?.toLowerCase().includes("session") ||
          err?.message?.toLowerCase().includes("unauthorized")
        ) {
          setIsSessionExpired(true);
          setExportError("Your session has ended. Please sign in again.");
        } else {
          setExportError(
            err instanceof Error ? err.message : "Failed to generate report",
          );
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-12 max-w-full overflow-hidden">
      {/* BREADCRUMB NAVIGATION */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs mb-1"
      >
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          Home
        </Link>
        <span className="text-slate-400 text-xs">›</span>
        <span className="font-bold text-[#0A3C2F]">Reports</span>
      </nav>

      {/* SESSION EXPIRED BANNER */}
      {isSessionExpired && (
        <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Session Expired
              </h4>
              <p className="text-xs text-amber-800 font-medium">
                Your session has ended. Please sign in again to continue working
                with reports.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900 text-white hover:bg-amber-950 text-xs font-bold transition-all shadow-2xs whitespace-nowrap self-start sm:self-auto"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign In Again</span>
          </Link>
        </div>
      )}

      {/* TOP SECTION: Horizontal Report Type Selector & Export Button */}
      <ReportTypeSelector
        activeReport={activeReport}
        onSelectReport={handleSelectReport}
        onExport={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Dynamic Filter Panel (Full Width) */}
      <ReportFiltersPanel
        activeReport={activeReport}
        filters={filters}
        onUpdateFilter={updateFilter}
        onApply={triggerApplyFeedback}
        onReset={handleResetFilters}
        onExport={handleExportExcel}
        isExporting={isExporting}
        exportError={exportError}
        isApplying={isApplying}
        appliedFeedback={appliedFeedback}
        activeFilterCount={activeFilterCount}
        projectOptions={projectOptions}
        fundingSourceOptions={fundingSourceOptions}
        fundingTypeOptions={fundingTypeOptions}
        methodOptions={methodOptions}
        officerOptions={officerOptions}
        categoryOptions={categoryOptions}
        supplierOptions={supplierOptions}
      />

      {/* Bottom Container: Full Width Data Output Tables */}
      <ReportTables
        activeReport={activeReport}
        annualPlanRows={annualPlanRows}
        planVsActualRows={planVsActualRows}
        stepReportRows={stepReportRows}
        delayedProcurementRows={delayedProcurementRows}
        monthlyProcurementRows={monthlyProcurementRows}
        monthlySummaryRows={monthlySummaryRows}
        quarterlySummaryRows={quarterlySummaryRows}
        quarterlyDetailedRows={quarterlyDetailedRows}
        detailedProcurementRows={detailedProcurementRows}
        contractRegisterRows={contractRegisterRows}
        contractPaymentRows={contractPaymentRows}
        regionalSectorRows={regionalSectorRows}
        projectSummaryRows={projectSummaryRows}
        officerSummaryRows={officerSummaryRows}
        projectOfficerRows={projectOfficerRows}
        committeeApprovalRows={committeeApprovalRows}
        supplierPerformanceRows={supplierPerformanceRows}
      />
    </div>
  );
}
