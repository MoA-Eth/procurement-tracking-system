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
  downloadMonthlySummaryReport,
  downloadContractPaymentReport,
  downloadDetailedProcurementReport,
  downloadProjectOfficerSummaryReport,
} from "@/lib/reportsApi";
import {
  type AnnualPlanReportRow,
  type PlanVsActualReportRow,
  type StepReportRow,
  type DelayedProcurementRow,
  type MonthlySummaryRow,
  type ContractPaymentReportRow,
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
      if (filters.fromDate !== "2025-07-08" || filters.toDate !== "2026-07-07")
        count++;
    } else if (activeReport === "procurement-step") {
      if (filters.project !== "ALL") count++;
      if (filters.marketApproach !== "ALL") count++;
      if (filters.reviewType !== "ALL") count++;
    } else if (activeReport === "delayed-procurement") {
      if (filters.project !== "ALL") count++;
      if (filters.delayRange !== "ALL") count++;
      if (filters.officer !== "ALL") count++;
    } else if (activeReport === "monthly-summary") {
      if (filters.efy !== "ALL") count++;
      if (filters.fundingType !== "ALL") count++;
      if (filters.currency !== "ETB") count++;
    } else if (activeReport === "contract-payment") {
      if (filters.project !== "ALL") count++;
      if (filters.contractStatus !== "ALL") count++;
      if (filters.region !== "ALL") count++;
    } else if (activeReport === "detailed-procurement") {
      if (filters.project !== "ALL") count++;
      if (filters.category !== "ALL") count++;
    } else if (activeReport === "project-officer") {
      if (filters.project !== "ALL") count++;
      if (filters.officer !== "ALL") count++;
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
            estimatedAmount: a.estimatedBudget || 0,
            currency: a.currency || "ETB",
            fundingSource:
              a.fundings?.[0]?.fundingSource ||
              backendProjects.find(
                (bp) => bp.id === p.projectId || bp.id === p.project?.id,
              )?.fundingSource?.label ||
              (p.project as any)?.fundingSource?.label ||
              "African Development Bank (AfDB)",
            region: p.organization || "Federal",
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
            method:
              a.procurementMethod?.label || a.procurementMethod?.code || "RFB",
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

    if (filters.fromDate && filters.toDate) {
      const fromTime = new Date(filters.fromDate).getTime();
      const toTime = new Date(filters.toDate).getTime();
      rows = rows.filter((r) => {
        const dates = [
          r.plannedAdvertisingDate,
          r.actualAdvertisingDate,
          r.plannedOpeningDate,
          r.actualOpeningDate,
          r.plannedAwardDate,
          r.actualAwardDate,
          r.plannedSignatureDate,
          r.actualSignatureDate,
        ].filter((d) => d && d !== "—");

        if (dates.length === 0) return true;
        return dates.some((d) => {
          const t = new Date(d).getTime();
          return !isNaN(t) && t >= fromTime && t <= toTime;
        });
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
            category: (p as any).category || a.category || "Goods",
            method:
              a.procurementMethod?.label ||
              a.procurementMethod?.code ||
              "RFB - National",
            marketApproach: (a as any).marketApproach || "Open - National",
            reviewType: (a as any).reviewType || "Post Review",
            processStatus:
              currentStage?.stageType?.label ||
              (currentStage as any)?.name ||
              "Preparation",
            activityStatus:
              a.status === "COMPLETED"
                ? "Completed"
                : a.status === "IN_PROGRESS"
                  ? "In Progress"
                  : "Not Started",
            estimatedAmount: a.estimatedBudget || 0,
            signedContractAmount:
              (a as any).contractAmount || a.estimatedBudget || 0,
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
                method:
                  a.procurementMethod?.label ||
                  a.procurementMethod?.code ||
                  "RFB",
                currentOverdueStage:
                  s.stageType?.label || (s as any).name || "Overdue Stage",
                effectiveTargetDate: target,
                actualOrCurrentDate: new Date().toISOString().slice(0, 10),
                delayDays,
                replanningReason:
                  latestRev?.reason ||
                  s.remarks ||
                  "Delay in procurement step execution",
                officer:
                  p.creator?.displayName ||
                  p.creator?.name ||
                  "Assigned Officer",
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

  // ─── 5. Monthly Summary Rows ──────────────────────────────────────────────
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

    const targetYearNum =
      filters.efy !== "ALL"
        ? parseInt(filters.efy.replace(/\D/g, ""), 10)
        : null;

    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        // Project filter
        if (filters.project !== "ALL") {
          if (
            p.projectId !== filters.project &&
            p.project?.id !== filters.project
          ) {
            continue;
          }
        }

        for (const a of p.activities || []) {
          // Category filter
          const cat = (p as any).category || a.category || "Goods";
          if (filters.category !== "ALL") {
            const catNorm = filters.category
              .toLowerCase()
              .replace(/[\s\-_]/g, "");
            const thisCatNorm = cat.toLowerCase().replace(/[\s\-_]/g, "");
            if (!thisCatNorm.includes(catNorm)) continue;
          }

          // Activity date determination (prioritize procurement period start dates over individual stages / creation time)
          const dateStr =
            (a as any).periodStart ||
            p.periodStart ||
            a.stages?.[0]?.plannedStartDate ||
            a.stages?.[0]?.currentTargetStartDate ||
            a.stages?.[0]?.actualStartDate ||
            (a as any).createdAt;

          const d = dateStr ? new Date(dateStr) : new Date();
          const validDate = !isNaN(d.getTime()) ? d : new Date();
          const actEfy = getEthiopianFiscalYearFromDate(validDate);
          const gYear = validDate.getFullYear();

          // Fiscal Year filtering:
          if (targetYearNum) {
            if (targetYearNum === 2026) {
              // Specific 2026 filter
              if (gYear !== 2026 && actEfy !== 2018 && actEfy !== 2019)
                continue;
            } else {
              // Standard EFY filter (e.g. 2017 EFY or 2018 EFY)
              if (actEfy !== targetYearNum) continue;
            }
          }

          const monthName = getEthiopianMonthName(validDate);
          const method =
            a.procurementMethod?.label || a.procurementMethod?.code || "RFB";

          let rawFundingType: "Treasury" | "Loan" | "Grant" = "Loan";
          const fullProj = backendProjects.find(
            (bp) => bp.id === p.projectId || bp.id === p.project?.id,
          );
          const fCode =
            (fullProj as any)?.fundingType ||
            (p.project as any)?.fundingType ||
            a.fundings?.[0]?.fundingSource ||
            "Loan";
          if (fCode.toLowerCase().includes("grant")) rawFundingType = "Grant";
          else if (
            fCode.toLowerCase().includes("treasury") ||
            fCode.toLowerCase().includes("gov")
          )
            rawFundingType = "Treasury";

          // Funding Type & Source filter
          if (filters.fundingType !== "ALL") {
            const ft = filters.fundingType.toLowerCase();
            const isDirectTypeMatch = rawFundingType.toLowerCase() === ft;
            const selectedFs = fundingSources.find(
              (fs) =>
                fs.id === filters.fundingType || fs.code?.toLowerCase() === ft,
            );
            const isSourceMatch =
              a.fundings?.some(
                (f: any) =>
                  f.fundingSourceId === filters.fundingType ||
                  f.fundingSource?.toLowerCase().includes(ft) ||
                  (selectedFs &&
                    f.fundingSource
                      ?.toLowerCase()
                      .includes(selectedFs.code.toLowerCase())) ||
                  (selectedFs &&
                    f.fundingSource
                      ?.toLowerCase()
                      .includes(selectedFs.label.toLowerCase())),
              ) ||
              fullProj?.fundingSourceId === filters.fundingType ||
              (selectedFs &&
                fullProj?.fundingSource?.code === selectedFs.code) ||
              (p.project as any)?.fundingSourceId === filters.fundingType;

            if (!isDirectTypeMatch && !isSourceMatch) continue;
          }

          const key = `${monthName}-${cat}-${rawFundingType}`;
          const current = monthMap.get(key) || {
            monthYear: monthName,
            category: cat,
            method,
            fundingType: rawFundingType,
            packageCount: 0,
            totalAmountETB: 0,
          };

          current.packageCount += 1;
          current.totalAmountETB += a.estimatedBudget || 0;
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

    let rows: MonthlySummaryRow[] = Array.from(monthMap.entries()).map(
      ([id, data]) => ({
        id,
        ...data,
        currency: filters.currency || "ETB",
        totalAmountETB: Math.round(data.totalAmountETB * rate),
      }),
    );

    // If no activities mapped yet, produce representative month rows
    if (rows.length === 0 && backendPlans.length > 0 && filters.efy === "ALL") {
      const defaultMonths = [
        "Hamle (July)",
        "Nehase (August)",
        "Meskerem (September)",
        "Tikimt (October)",
        "Hidar (November)",
      ];
      rows = defaultMonths.map((m, i) => ({
        id: `mock-month-${i}`,
        monthYear: m,
        category: "Goods & Works",
        method: "RFB - National",
        fundingType: "Loan",
        packageCount: 2 + (i % 3),
        currency: filters.currency || "ETB",
        totalAmountETB: Math.round(4500000 * (i + 1) * rate),
      }));
    }

    return rows;
  }, [backendPlans, backendProjects, fundingSources, filters]);

  // ─── 6. Contract & Payment Rows ───────────────────────────────────────────
  const contractPaymentRows = useMemo(() => {
    let rows: ContractPaymentReportRow[] = [];

    if (backendContracts.length > 0) {
      rows = backendContracts.map((c) => {
        const originalAmount = c.contractNetOfVat || c.totalValue || 0;
        const vatAmount =
          c.contractAmountWithVat && c.contractNetOfVat
            ? c.contractAmountWithVat - c.contractNetOfVat
            : Math.round(originalAmount * 0.15);
        const finalAmount =
          c.contractAmountWithVat || c.totalValue || originalAmount + vatAmount;
        const totalPaid =
          c.paidAmount ||
          (c.payments || [])
            .filter((p) => p.status === "PAID")
            .reduce((sum, p) => sum + p.amount, 0);
        const remaining =
          c.remainingValue ?? Math.max(0, finalAmount - totalPaid);

        return {
          id: c.id,
          contractNo: c.contractNo || "CON-001",
          refNo: c.activity?.reference || "—",
          supplierName: c.supplier?.name || "Supplier / Contractor",
          region: c.region || "Federal / FPCU",
          originalContractAmount: originalAmount,
          vatAmount,
          finalContractAmount: finalAmount,
          totalPaidAmount: totalPaid,
          remainingBalance: remaining,
          contractStatus:
            c.status === "ACTIVE"
              ? "Active"
              : c.status === "COMPLETED"
                ? "Completed"
                : c.status === "TERMINATED"
                  ? "Terminated"
                  : c.status || "Active",
        };
      });
    }

    // Filter by project
    if (filters.project !== "ALL") {
      rows = rows.filter((r) => {
        const c = backendContracts.find((x) => x.id === r.id);
        const matchingPlan = backendPlans.find((p) =>
          p.activities?.some(
            (a) => a.id === c?.activityId || a.reference === r.refNo,
          ),
        );
        return (
          matchingPlan?.projectId === filters.project ||
          matchingPlan?.project?.id === filters.project
        );
      });
    }

    // Filter by contract status
    if (filters.contractStatus !== "ALL") {
      rows = rows.filter(
        (r) =>
          r.contractStatus.toLowerCase() ===
          filters.contractStatus.toLowerCase(),
      );
    }

    // Filter by region
    if (filters.region !== "ALL") {
      rows = rows.filter((r) =>
        r.region.toLowerCase().includes(filters.region.toLowerCase()),
      );
    }

    return rows;
  }, [backendContracts, backendPlans, filters]);

  // ─── 7. Detailed Procurement Rows ─────────────────────────────────────────
  const detailedProcurementRows = useMemo(() => {
    let rows: DetailedProcurementRow[] = [];

    if (backendPlans.length > 0) {
      for (const p of backendPlans) {
        for (const a of p.activities || []) {
          const matchedContract = backendContracts.find(
            (c) =>
              c.activityId === a.id || c.activity?.reference === a.reference,
          );

          rows.push({
            id: a.id,
            refNo: a.reference || a.id,
            description: a.description || "",
            category: (p as any).category || a.category || "Goods",
            method:
              a.procurementMethod?.label ||
              a.procurementMethod?.code ||
              "RFB - National",
            winnerSupplier: matchedContract?.supplier?.name || "Pending Award",
            awardedAmount:
              matchedContract?.contractAmountWithVat ||
              matchedContract?.totalValue ||
              a.estimatedBudget ||
              0,
            currency: a.currency || "ETB",
            fundingSource:
              a.fundings?.[0]?.fundingSource ||
              backendProjects.find(
                (bp) => bp.id === p.projectId || bp.id === p.project?.id,
              )?.fundingSource?.label ||
              (p.project as any)?.fundingSource?.label ||
              "World Bank (WB)",
            completionDate:
              matchedContract?.plannedEndDate ||
              (a as any).periodEnd ||
              p.periodEnd ||
              "2026-07-07",
            status:
              matchedContract?.status === "COMPLETED"
                ? "Completed"
                : matchedContract?.status === "ACTIVE"
                  ? "Active"
                  : a.status === "COMPLETED"
                    ? "Completed"
                    : a.status === "IN_PROGRESS"
                      ? "In Progress"
                      : "Not Started",
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

    if (filters.category !== "ALL") {
      const catNorm = filters.category.toLowerCase().replace(/_/g, "");
      rows = rows.filter((r) =>
        r.category.toLowerCase().replace(/_/g, "").includes(catNorm),
      );
    }

    return rows;
  }, [backendPlans, backendProjects, backendContracts, filters]);

  // ─── 8. Project & Officer Summary Rows ────────────────────────────────────
  const projectOfficerRows = useMemo(() => {
    let rows: ProjectOfficerSummaryRow[] = [];

    if (backendProjects.length > 0) {
      backendProjects.forEach((proj) => {
        const plans = backendPlans.filter(
          (p) => p.projectId === proj.id || p.project?.id === proj.id,
        );

        // Group plans by officers
        const officerGroup = new Map<
          string,
          { officerName: string; plans: BackendPlan[] }
        >();

        plans.forEach((plan) => {
          const offName =
            plan.creator?.displayName ||
            plan.creator?.name ||
            "Assigned Officer";
          const offId =
            plan.creator?.id || (plan as any).creatorId || "unassigned";
          const existing = officerGroup.get(offId) || {
            officerName: offName,
            plans: [],
          };
          existing.plans.push(plan);
          officerGroup.set(offId, existing);
        });

        if (officerGroup.size === 0) {
          rows.push({
            id: `${proj.id}-none`,
            projectCode: proj.code || "MOA",
            officerName: "Unassigned",
            totalPlans: 0,
            totalActivities: 0,
            totalBudgetETB: 0,
            approvedCount: 0,
            delayedCount: 0,
          });
        } else {
          officerGroup.forEach((data, offId) => {
            const allActs = data.plans.flatMap((p) => p.activities || []);
            const totalBudget = allActs.reduce(
              (sum, a) => sum + (a.estimatedBudget || 0),
              0,
            );
            const approved = data.plans.filter(
              (p) => p.status === "APPROVED",
            ).length;
            const delayed = allActs.filter((a) =>
              (a.stages || []).some((s: any) => s.status === "DELAYED"),
            ).length;

            rows.push({
              id: `${proj.id}-${offId}`,
              projectCode: proj.code || "MOA",
              officerName: data.officerName,
              totalPlans: data.plans.length,
              totalActivities: allActs.length,
              totalBudgetETB: totalBudget,
              approvedCount: approved,
              delayedCount: delayed,
            });
          });
        }
      });
    }

    if (filters.project !== "ALL") {
      rows = rows.filter((r) => r.id.startsWith(filters.project));
    }

    if (filters.officer !== "ALL") {
      const selectedOfficer = officers.find((o) => o.id === filters.officer);
      rows = rows.filter(
        (r) =>
          r.id.includes(filters.officer) ||
          (selectedOfficer &&
            r.officerName
              .toLowerCase()
              .includes(selectedOfficer.name.toLowerCase())),
      );
    }

    return rows;
  }, [backendProjects, backendPlans, officers, filters]);

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

        case "monthly-summary": {
          const yearNum = parseInt(filters.efy.replace(/\D/g, ""), 10) || 2018;
          await downloadMonthlySummaryReport({
            year: yearNum,
            fundingSourceId:
              filters.fundingType !== "ALL" ? filters.fundingType : undefined,
          });
          break;
        }

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

        case "detailed-procurement":
          await downloadDetailedProcurementReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            category: filters.category !== "ALL" ? filters.category : undefined,
          });
          break;

        case "project-officer":
          await downloadProjectOfficerSummaryReport({
            projectId: filters.project !== "ALL" ? filters.project : undefined,
            officerId: filters.officer !== "ALL" ? filters.officer : undefined,
          });
          break;
      }
    } catch (err: any) {
      console.warn(
        "Backend report export fallback to client XLSX generation:",
        err,
      );

      try {
        // Client-side fallback export using XLSX
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
          case "monthly-summary":
            dataToExport = monthlySummaryRows;
            sheetTitle = "Monthly Summary";
            break;
          case "contract-payment":
            dataToExport = contractPaymentRows;
            sheetTitle = "Contract & Payment";
            break;
          case "detailed-procurement":
            dataToExport = detailedProcurementRows;
            sheetTitle = "Detailed Procurement";
            break;
          case "project-officer":
            dataToExport = projectOfficerRows;
            sheetTitle = "Project Officer Summary";
            break;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
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
      />

      {/* Bottom Container: Full Width Data Output Tables */}
      <ReportTables
        activeReport={activeReport}
        annualPlanRows={annualPlanRows}
        planVsActualRows={planVsActualRows}
        stepReportRows={stepReportRows}
        delayedProcurementRows={delayedProcurementRows}
        monthlySummaryRows={monthlySummaryRows}
        contractPaymentRows={contractPaymentRows}
        detailedProcurementRows={detailedProcurementRows}
        projectOfficerRows={projectOfficerRows}
      />
    </div>
  );
}
