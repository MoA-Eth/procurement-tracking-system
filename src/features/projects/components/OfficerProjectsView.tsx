"use client";

import { StatusText } from "../../../components/dashboard/StatusText";
import { CreateProcurementActivityView } from "@/features/projects/components/CreateProcurementActivityView";
import { CreateProcurementPlanView } from "@/features/projects/components/CreateProcurementPlanView";
import { OfficerProcurementActivityDetailView } from "@/features/projects/components/OfficerProcurementActivityDetailView";
import { OfficerProcurementPlanDetailView } from "@/features/projects/components/OfficerProcurementPlanDetailView";
import { OfficerProjectDetailView } from "@/features/projects/components/OfficerProjectDetailView";
import {
  addSavedActivityRecord,
  mapBackendActivityToProcurementActivitySummary,
  OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
  parseSavedActivityRecords,
  type ProcurementActivitySummary,
  type SavedOfficerActivityRecord,
} from "@/features/projects/data/officerActivityDrafts";
import {
  addSavedPlanRecord,
  createDraftPlan,
  mergeSavedPlans,
  OFFICER_PLAN_DRAFTS_STORAGE_KEY,
  parseSavedPlanRecords,
  type ProcurementPlanDraftInput,
  type SavedOfficerPlanRecord,
  upsertSavedPlanRecord,
} from "@/features/projects/data/officerPlanDrafts";
import {
  type OfficerProject,
  type ProcurementPlanSummary,
  type ProjectStatus,
} from "@/features/projects/data/officerProjects";
import {
  createPlan,
  updatePlan,
  submitPlanForReview,
  fetchPlans,
  mapBackendPlanToOfficerPlanSummary,
  type BackendPlan,
} from "@/lib/plansApi";
import {
  createActivity,
  updateActivity,
  fetchActivities,
  resolveProcurementMethodId,
  type BackendActivity,
} from "@/lib/activitiesApi";
import {
  calculateFieldDiffs,
  PLAN_FIELD_LABELS,
  ACTIVITY_FIELD_LABELS,
  recordPlanVersionEvent,
} from "@/features/plans/data/planRevisions";
import {
  fetchProjects,
  isProjectAssignedToOfficer,
  mapBackendProjectToOfficerProject,
} from "@/lib/projectsApi";
import { getCurrentUser } from "@/lib/authApi";
import type { AuthUser } from "@/lib/authTypes";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderLock,
  Search,
  ShieldAlert,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { exportOfficerProjectsToExcel } from "@/features/projects/utils/projectExcelUtils";
import { ExcelImportModal } from "@/features/projects/components/ExcelImportModal";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function OfficerProjectsView({
  currentUser,
  fromTracker,
  mode,
  selectedActivityReference,
  selectedPlanReference,
  selectedProjectCode,
}: {
  currentUser?: AuthUser;
  fromTracker?: boolean;
  mode?: "create-activity" | "create-plan" | "edit-activity" | "edit-plan";
  selectedActivityReference?: string;
  selectedPlanReference?: string;
  selectedProjectCode?: string;
}) {
  const router = useRouter();
  const effectiveUser = currentUser || getCurrentUser();
  const [savedPlanRecords, setSavedPlanRecords] = useState<
    SavedOfficerPlanRecord[]
  >([]);
  const [savedActivityRecords, setSavedActivityRecords] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [backendProjects, setBackendProjects] = useState<OfficerProject[]>([]);
  const [backendPlans, setBackendPlans] = useState<BackendPlan[]>([]);
  const [backendActivities, setBackendActivities] = useState<
    SavedOfficerActivityRecord[]
  >([]);

  const loadData = useCallback(async () => {
    try {
      const [projData, planData, actData] = await Promise.allSettled([
        fetchProjects(),
        fetchPlans(),
        fetchActivities(),
      ]);

      let fetchedPlans: BackendPlan[] = [];
      let assignedProjList: OfficerProject[] = [];

      if (projData.status === "fulfilled" && projData.value.length > 0) {
        // Filter projects assigned to this officer
        const filteredProjects = effectiveUser
          ? projData.value.filter((bp) =>
              isProjectAssignedToOfficer(bp, effectiveUser),
            )
          : projData.value;
        assignedProjList = filteredProjects.map(
          mapBackendProjectToOfficerProject,
        );
        setBackendProjects(assignedProjList);
      } else {
        setBackendProjects([]);
      }

      if (planData.status === "fulfilled" && planData.value.length > 0) {
        // Only load plans that belong to the officer's assigned projects
        if (effectiveUser && assignedProjList.length > 0) {
          const assignedIds = new Set(
            assignedProjList.map((p) => p.id).filter(Boolean),
          );
          const assignedCodes = new Set(
            assignedProjList.map((p) => p.code.toLowerCase()),
          );
          fetchedPlans = planData.value.filter(
            (p) =>
              (p.projectId && assignedIds.has(p.projectId)) ||
              (p.project?.id && assignedIds.has(p.project.id)) ||
              (p.project?.code &&
                assignedCodes.has(p.project.code.toLowerCase())),
          );
        } else if (effectiveUser && assignedProjList.length === 0) {
          fetchedPlans = [];
        } else {
          fetchedPlans = planData.value;
        }
        setBackendPlans(fetchedPlans);
      } else {
        setBackendPlans([]);
      }

      if (actData.status === "fulfilled" && actData.value.length > 0) {
        const mappedDbRecords: SavedOfficerActivityRecord[] = actData.value
          .filter((ba: BackendActivity) => {
            if (!effectiveUser || assignedProjList.length === 0) return true;
            const parentPlan = fetchedPlans.find((p) => p.id === ba.planId);
            const projCode =
              parentPlan?.project?.code || ba.plan?.project?.code || "";
            const projId =
              (parentPlan as any)?.projectId ||
              parentPlan?.project?.id ||
              (ba.plan as any)?.projectId ||
              ba.plan?.project?.id ||
              "";
            const assignedIds = new Set(
              assignedProjList.map((p) => p.id).filter(Boolean),
            );
            const assignedCodes = new Set(
              assignedProjList.map((p) => p.code.toLowerCase()),
            );
            return (
              (projCode && assignedCodes.has(projCode.toLowerCase())) ||
              (projId && assignedIds.has(projId))
            );
          })
          .map((ba: BackendActivity) => {
            const summary = mapBackendActivityToProcurementActivitySummary(ba);
            const parentPlan = fetchedPlans.find((p) => p.id === ba.planId);
            const planRef = parentPlan?.title || ba.plan?.title || ba.planId;
            const projCode =
              parentPlan?.project?.code ||
              ba.plan?.project?.code ||
              "PRJ-24-001";
            return {
              activity: summary,
              planReference: planRef,
              projectCode: projCode,
            };
          });
        setBackendActivities(mappedDbRecords);
      }
    } catch (err) {
      console.warn("loadData officer view note:", err);
    }
  }, [effectiveUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const loadSavedRecords = window.setTimeout(() => {
      setSavedPlanRecords(
        parseSavedPlanRecords(
          window.localStorage.getItem(OFFICER_PLAN_DRAFTS_STORAGE_KEY),
        ),
      );
      setSavedActivityRecords(
        parseSavedActivityRecords(
          window.localStorage.getItem(OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY),
        ),
      );
    }, 0);

    return () => window.clearTimeout(loadSavedRecords);
  }, []);

  const effectiveSavedActivityRecords = useMemo(() => {
    const map = new Map<string, SavedOfficerActivityRecord>();
    savedActivityRecords.forEach((rec) => {
      const key =
        `${rec.projectCode}-${rec.planReference}-${rec.activity.reference}`.toLowerCase();
      map.set(key, rec);
    });
    backendActivities.forEach((rec) => {
      const key =
        `${rec.projectCode}-${rec.planReference}-${rec.activity.reference}`.toLowerCase();
      map.set(key, rec);
    });
    return Array.from(map.values());
  }, [backendActivities, savedActivityRecords]);

  const allProjects = useMemo(() => {
    // Merge backend plans into each project
    return backendProjects.map((proj) => {
      const matchingBackendPlans = backendPlans
        .filter(
          (bp) =>
            bp.project?.code === proj.code ||
            bp.projectId === proj.code ||
            (Boolean(proj.id) && bp.projectId === proj.id) ||
            (Boolean(proj.id) && bp.project?.id === proj.id) ||
            (bp.project && bp.project.name === proj.name),
        )
        .map(mapBackendPlanToOfficerPlanSummary);

      if (matchingBackendPlans.length === 0) return proj;

      const existingPlanRefs = new Set(
        matchingBackendPlans.map((p) => p.reference.toLowerCase()),
      );
      const existingPlanNames = new Set(
        matchingBackendPlans.map((p) => p.name.toLowerCase()),
      );
      const remainingBaselinePlans = proj.plans.filter(
        (p) =>
          !existingPlanRefs.has(p.reference.toLowerCase()) &&
          !existingPlanNames.has(p.name.toLowerCase()),
      );

      return {
        ...proj,
        activePlans:
          matchingBackendPlans.length + remainingBaselinePlans.length,
        plans: [...matchingBackendPlans, ...remainingBaselinePlans],
      };
    });
  }, [backendProjects, backendPlans]);

  const projects = useMemo(
    () => mergeSavedPlans(allProjects, savedPlanRecords),
    [allProjects, savedPlanRecords],
  );
  const selectedProject = projects.find(
    (project) =>
      project.code === selectedProjectCode ||
      (selectedProjectCode &&
        (project.code.toLowerCase() ===
          selectedProjectCode.trim().toLowerCase() ||
          project.name.toLowerCase() ===
            selectedProjectCode.trim().toLowerCase() ||
          project.shortName?.toLowerCase() ===
            selectedProjectCode.trim().toLowerCase() ||
          (Boolean(project.id) &&
            project.id?.toLowerCase() ===
              selectedProjectCode.trim().toLowerCase()))),
  );
  const selectedPlan = selectedProject?.plans.find(
    (plan) =>
      plan.reference === selectedPlanReference ||
      (selectedPlanReference &&
        (plan.reference.toLowerCase() ===
          selectedPlanReference.trim().toLowerCase() ||
          plan.name.toLowerCase() ===
            selectedPlanReference.trim().toLowerCase() ||
          (Boolean(plan.id) &&
            plan.id?.toLowerCase() ===
              selectedPlanReference.trim().toLowerCase()))),
  );

  const selectedPlanActivities = useMemo(() => {
    if (!selectedPlan || !selectedProject) return [];

    const matchingBackendPlan = backendPlans.find(
      (bp) =>
        bp.id === selectedPlan.reference ||
        (Boolean(selectedPlan.id) && bp.id === selectedPlan.id) ||
        bp.title.toLowerCase() === selectedPlan.reference.toLowerCase() ||
        bp.title.toLowerCase() === selectedPlan.name.toLowerCase(),
    );

    const directBackendActivities = (matchingBackendPlan?.activities || []).map(
      mapBackendActivityToProcurementActivitySummary,
    );

    const matchingSaved = effectiveSavedActivityRecords
      .filter(
        (record) =>
          (record.projectCode?.toLowerCase() ===
            selectedProject.code?.toLowerCase() ||
            record.projectCode?.toLowerCase() ===
              selectedProject.shortName?.toLowerCase() ||
            (Boolean(selectedProject.id) &&
              record.projectCode?.toLowerCase() ===
                selectedProject.id?.toLowerCase())) &&
          (record.planReference?.toLowerCase() ===
            selectedPlan.reference?.toLowerCase() ||
            record.planReference?.toLowerCase() ===
              selectedPlan.name?.toLowerCase() ||
            (matchingBackendPlan &&
              (record.planReference?.toLowerCase() ===
                matchingBackendPlan.id.toLowerCase() ||
                record.planReference?.toLowerCase() ===
                  matchingBackendPlan.title.toLowerCase()))),
      )
      .map((record) => record.activity);

    const combinedMap = new Map<string, ProcurementActivitySummary>();
    directBackendActivities.forEach((a) =>
      combinedMap.set(a.reference.toLowerCase(), a),
    );
    matchingSaved.forEach((a) => combinedMap.set(a.reference.toLowerCase(), a));

    if (selectedPlan.planActivities && selectedPlan.planActivities.length > 0) {
      selectedPlan.planActivities.forEach((a) => {
        if (!combinedMap.has(a.reference.toLowerCase())) {
          combinedMap.set(a.reference.toLowerCase(), a);
        }
      });
    }

    const activitiesList = Array.from(combinedMap.values()).map((act) => {
      if (
        (selectedPlan.status === "Returned" ||
          selectedPlan.status === "Returned for Revision") &&
        (act.status === "Submitted to Director" ||
          (act as any).status === "Under Review" ||
          !act.status)
      ) {
        return { ...act, status: "Returned" as const };
      }
      return act;
    });

    return activitiesList;
  }, [
    selectedPlan,
    selectedProject,
    backendPlans,
    effectiveSavedActivityRecords,
  ]);
  const selectedActivity =
    selectedProject && selectedPlan && selectedActivityReference
      ? selectedPlanActivities.find(
          (activity) => activity.reference === selectedActivityReference,
        )
      : undefined;

  async function savePlan(
    input: ProcurementPlanDraftInput,
    action: "activity" | "draft",
    revisionReason?: string,
  ) {
    if (!selectedProject) return;

    if (mode === "edit-plan" && selectedPlan) {
      // Calculate field diffs between previous and new values
      const beforeValues = {
        name: selectedPlan.name,
        budgetYear: selectedPlan.budgetYear,
        category: selectedPlan.category,
        organizationRegion: selectedPlan.organizationRegion,
        periodFrom: selectedPlan.planPeriod?.from?.gregorian,
        periodTo: selectedPlan.planPeriod?.to?.gregorian,
        description: selectedPlan.description,
      };

      const afterValues = {
        name: input.planName.trim(),
        budgetYear: `${input.budgetYear} EFY`,
        category: input.category,
        organizationRegion: input.organizationRegion,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        description: input.remarks,
      };

      const diffs = calculateFieldDiffs(
        beforeValues,
        afterValues,
        PLAN_FIELD_LABELS,
      );

      const updatedPlan: ProcurementPlanSummary = {
        ...selectedPlan,
        name: input.planName.trim(),
        budgetYear: `${input.budgetYear} EFY`,
        category: input.category,
        organizationRegion: input.organizationRegion,
        description: input.remarks || selectedPlan.description,
        planPeriod: {
          from: {
            gregorian: input.periodFrom,
            ethiopian: input.periodFromEthiopian,
          },
          to: {
            gregorian: input.periodTo,
            ethiopian: input.periodToEthiopian,
          },
        },
        generalProcurementNoticeDate: input.generalProcurementNoticeDate
          ? {
              gregorian: input.generalProcurementNoticeDate,
              ethiopian: input.generalProcurementNoticeDateEthiopian,
            }
          : selectedPlan.generalProcurementNoticeDate,
      };

      // Record audit version event
      recordPlanVersionEvent({
        planId: selectedPlan.id || selectedPlan.reference,
        planReference: selectedPlan.reference,
        projectCode: selectedProject.code,
        versionNumber: selectedPlan.version || 1,
        action: "PLAN_REVISED",
        actionLabel: `Plan Updated by Officer (v${selectedPlan.version || 1})`,
        changedBy: "Procurement Officer",
        changedByRole: "Procurement Officer",
        changes: diffs.length > 0 ? diffs : undefined,
        reason: revisionReason || "Updated plan parameters",
      });

      // Update backend if valid UUID id exists
      if (selectedPlan.id && selectedPlan.id.includes("-")) {
        try {
          let catEnum: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" =
            "GOODS";
          if (input.category === "Works") catEnum = "WORKS";
          else if (input.category === "Consultancy Services")
            catEnum = "CONSULTANCY";
          else if (input.category === "Non-Consulting Services")
            catEnum = "NON_CONSULTING";

          await updatePlan(selectedPlan.id, {
            title: input.planName.trim(),
            budgetYear: `${input.budgetYear} EFY`,
            procurementCategory: catEnum,
            organization: input.organizationRegion,
            description: input.remarks || undefined,
            periodStart: new Date(
              input.periodFrom || "2025-07-08",
            ).toISOString(),
            periodEnd: new Date(input.periodTo || "2026-07-07").toISOString(),
          });
        } catch (e) {
          console.warn("Backend updatePlan note:", e);
        }
      }

      const nextRecords = upsertSavedPlanRecord(savedPlanRecords, {
        plan: updatedPlan,
        projectCode: selectedProject.code,
      });

      setSavedPlanRecords(nextRecords);
      window.localStorage.setItem(
        OFFICER_PLAN_DRAFTS_STORAGE_KEY,
        JSON.stringify(nextRecords),
      );

      await loadData();

      if (action === "activity") {
        router.push(
          "/workspace/projects?project=" +
            encodeURIComponent(selectedProject.code) +
            "&plan=" +
            encodeURIComponent(selectedPlan.reference) +
            "&mode=create-activity",
        );
        return;
      }

      router.push(
        "/workspace/projects?project=" +
          encodeURIComponent(selectedProject.code) +
          "&plan=" +
          encodeURIComponent(selectedPlan.reference),
      );
      return;
    }

    const existingPlan = selectedProject.plans.find(
      (plan) =>
        plan.status === "Draft" &&
        plan.name === input.planName.trim() &&
        plan.budgetYear === `${input.budgetYear} EFY` &&
        plan.category === input.category,
    );

    let planForNavigation = existingPlan;

    if (!planForNavigation) {
      planForNavigation = createDraftPlan(selectedProject, input);

      let catEnum: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" =
        "GOODS";
      if (input.category === "Works") catEnum = "WORKS";
      else if (input.category === "Consultancy Services")
        catEnum = "CONSULTANCY";
      else if (input.category === "Non-Consulting Services")
        catEnum = "NON_CONSULTING";

      const targetProjectId =
        selectedProject.id && selectedProject.id.length > 20
          ? selectedProject.id
          : backendProjects.find(
              (bp) =>
                bp.code === selectedProject.code ||
                bp.id === selectedProject.id ||
                bp.name === selectedProject.name,
            )?.id ||
            selectedProject.id ||
            selectedProject.code;

      try {
        const created = await createPlan({
          projectId: targetProjectId,
          title: input.planName.trim(),
          budgetYear: `${input.budgetYear} EFY`,
          procurementCategory: catEnum,
          organization: input.organizationRegion,
          description: input.remarks || undefined,
          periodStart: new Date(input.periodFrom || "2025-07-08").toISOString(),
          periodEnd: new Date(input.periodTo || "2026-07-07").toISOString(),
        });
        if (created && created.id) {
          planForNavigation.reference = created.id;
          planForNavigation.id = created.id;
          planForNavigation.createdById = created.createdBy;
          planForNavigation.createdByName =
            created.creator?.displayName ||
            created.creator?.name ||
            effectiveUser?.displayName ||
            "Assigned Officer";
          planForNavigation.createdAt = created.createdAt;
        }
      } catch (err) {
        console.warn("Backend createPlan note:", err);
      }

      const nextRecords = addSavedPlanRecord(savedPlanRecords, {
        plan: planForNavigation,
        projectCode: selectedProject.code,
      });

      setSavedPlanRecords(nextRecords);
      window.localStorage.setItem(
        OFFICER_PLAN_DRAFTS_STORAGE_KEY,
        JSON.stringify(nextRecords),
      );

      await loadData();
    }

    if (action === "activity") {
      router.push(
        "/workspace/projects?project=" +
          encodeURIComponent(selectedProject.code) +
          "&plan=" +
          encodeURIComponent(planForNavigation.reference) +
          "&mode=create-activity",
      );
      return;
    }

    router.push(
      "/workspace/projects?project=" + encodeURIComponent(selectedProject.code),
    );
  }

  async function saveActivity(activity: ProcurementActivitySummary) {
    if (!selectedProject || !selectedPlan) return;

    const planRef = selectedPlan.reference;

    // Check if this was an edit to an existing activity
    const existing = selectedPlanActivities.find(
      (a) => a.reference.toLowerCase() === activity.reference.toLowerCase(),
    );
    if (existing) {
      const existingAny = existing as any;
      const activityAny = activity as any;
      const diffs = calculateFieldDiffs(
        {
          description: existing.description,
          estimatedAmount: `${existing.estimatedAmount?.toLocaleString()} ${selectedPlan.currency || "ETB"}`,
          method: existing.method,
          marketApproach:
            existingAny.marketApproach ||
            existing.details?.form?.marketApproach ||
            "Open - National",
          reviewType:
            existingAny.reviewType ||
            existing.details?.form?.reviewType ||
            "Post Review",
        },
        {
          description: activity.description,
          estimatedAmount: `${activity.estimatedAmount?.toLocaleString()} ${selectedPlan.currency || "ETB"}`,
          method: activity.method,
          marketApproach:
            activityAny.marketApproach ||
            activity.details?.form?.marketApproach ||
            "Open - National",
          reviewType:
            activityAny.reviewType ||
            activity.details?.form?.reviewType ||
            "Post Review",
        },
        ACTIVITY_FIELD_LABELS,
      );

      if (diffs.length > 0) {
        recordPlanVersionEvent({
          planId: selectedPlan.id || selectedPlan.reference,
          planReference: selectedPlan.reference,
          projectCode: selectedProject.code,
          versionNumber: selectedPlan.version || 1,
          action: "ACTIVITY_REVISED",
          actionLabel: `Activity ${activity.reference} Revised (v${selectedPlan.version || 1})`,
          changedBy: "Procurement Officer",
          changedByRole: "Procurement Officer",
          changes: diffs,
          reason: "Updated activity parameters per revision",
        });
      }
    }

    const nextRecords = addSavedActivityRecord(savedActivityRecords, {
      activity,
      planReference: planRef,
      projectCode: selectedProject.code,
    });
    setSavedActivityRecords(nextRecords);
    window.localStorage.setItem(
      OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
      JSON.stringify(nextRecords),
    );

    // Update the saved plan record to also reflect the incremented activity count and embedded activities
    const currentPlanActivities = selectedPlanActivities.filter(
      (a) => a.reference.toLowerCase() !== activity.reference.toLowerCase(),
    );
    const updatedActivities = [...currentPlanActivities, activity];

    const updatedPlan: ProcurementPlanSummary = {
      ...selectedPlan,
      activities: updatedActivities.length,
      planActivities: updatedActivities,
    };

    const nextPlanRecords = upsertSavedPlanRecord(savedPlanRecords, {
      plan: updatedPlan,
      projectCode: selectedProject.code,
    });
    setSavedPlanRecords(nextPlanRecords);
    window.localStorage.setItem(
      OFFICER_PLAN_DRAFTS_STORAGE_KEY,
      JSON.stringify(nextPlanRecords),
    );

    // Async backend activity creation
    const matchingBackendPlan = backendPlans.find(
      (bp) =>
        bp.id === selectedPlan.id ||
        bp.id === selectedPlan.reference ||
        bp.title.toLowerCase().trim() ===
          selectedPlan.name.toLowerCase().trim() ||
        bp.title.toLowerCase().trim() ===
          selectedPlan.reference.toLowerCase().trim(),
    );

    let targetBackendPlanId =
      matchingBackendPlan?.id ||
      (selectedPlan.id &&
      selectedPlan.id.includes("-") &&
      selectedPlan.id.length > 20
        ? selectedPlan.id
        : undefined);

    if (!targetBackendPlanId) {
      const targetProjectId =
        selectedProject.id && selectedProject.id.length > 20
          ? selectedProject.id
          : backendProjects.find(
              (bp) =>
                bp.code === selectedProject.code ||
                bp.id === selectedProject.id ||
                bp.name === selectedProject.name,
            )?.id ||
            selectedProject.id ||
            selectedProject.code;

      try {
        let catEnum: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" =
          "GOODS";
        if (selectedPlan.category === "Works") catEnum = "WORKS";
        else if (selectedPlan.category === "Consultancy Services")
          catEnum = "CONSULTANCY";
        else if (selectedPlan.category === "Non-Consulting Services")
          catEnum = "NON_CONSULTING";

        const created = await createPlan({
          projectId: targetProjectId,
          title: selectedPlan.name.trim(),
          budgetYear: selectedPlan.budgetYear,
          procurementCategory: catEnum,
          organization: selectedPlan.organizationRegion || "Federal / FPCU",
          description: selectedPlan.description || undefined,
          periodStart: selectedPlan.planPeriod?.from?.gregorian || "2025-07-08",
          periodEnd: selectedPlan.planPeriod?.to?.gregorian || "2026-07-07",
        });
        if (created && created.id) {
          targetBackendPlanId = created.id;
        }
      } catch (err) {
        console.warn("Backend createPlan in saveActivity note:", err);
      }
    }

    if (targetBackendPlanId) {
      try {
        const methodLabel = activity.method || "RFB - National";
        const resolvedMethodId = await resolveProcurementMethodId(methodLabel);

        const customStages = (
          activity.details?.roadmap ||
          (activity as any).roadmap ||
          []
        ).map((st: any, sIdx: number) => ({
          name: st.name || st.stageName,
          sequence: sIdx + 1,
          plannedStartDate:
            st.gregorianDate || st.plannedStartDate || undefined,
          gregorianDate: st.gregorianDate || undefined,
          ethiopianDate: st.ethiopianDate || undefined,
          isNotApplicable: Boolean(st.notApplicable || st.isNotApplicable),
          notApplicable: Boolean(st.notApplicable || st.isNotApplicable),
          remarks: st.remarks || undefined,
        }));

        // Check if this activity already exists in the backend
        const existingBackendAct = backendActivities.find(
          (ba) =>
            ba.activity.reference?.toLowerCase() ===
              activity.reference?.toLowerCase() ||
            (Boolean(activity.id) &&
              Boolean(ba.activity.id) &&
              ba.activity.id === activity.id) ||
            (Boolean(activity.activityId) &&
              Boolean(ba.activity.id) &&
              ba.activity.id === activity.activityId),
        );
        const existingBackendId =
          (activity.id && activity.id.includes("-") && activity.id.length > 20
            ? activity.id
            : undefined) ||
          (activity.activityId &&
          activity.activityId.includes("-") &&
          activity.activityId.length > 20
            ? activity.activityId
            : undefined) ||
          (existingBackendAct?.activity?.id &&
          existingBackendAct.activity.id.includes("-")
            ? existingBackendAct.activity.id
            : undefined);

        if (existingBackendId) {
          try {
            await updateActivity(existingBackendId, {
              description: activity.description || "Activity description",
              estimatedBudget: Number(activity.estimatedAmount) || 500000,
              currency: selectedPlan.currency || "ETB",
              procurementMethodId: resolvedMethodId,
              stages: customStages.length > 0 ? customStages : undefined,
              fundings: [
                {
                  fundingSource:
                    selectedProject.fundingSource ||
                    "African Development Bank (AfDB)",
                  loanGrantNumber:
                    selectedProject.financingNumbers?.[0] || undefined,
                  allocationPct: 100,
                },
              ],
            });
          } catch (updateErr) {
            console.warn("Backend updateActivity note:", updateErr);
          }
        } else {
          try {
            await createActivity({
              planId: targetBackendPlanId,
              procurementMethodId: resolvedMethodId,
              description: activity.description || "Activity description",
              estimatedBudget: Number(activity.estimatedAmount) || 500000,
              currency: selectedPlan.currency || "ETB",
              stages: customStages.length > 0 ? customStages : undefined,
              fundings: [
                {
                  fundingSource:
                    selectedProject.fundingSource ||
                    "African Development Bank (AfDB)",
                  loanGrantNumber:
                    selectedProject.financingNumbers?.[0] || undefined,
                  allocationPct: 100,
                },
              ],
            });
          } catch (firstErr) {
            console.warn(
              "First createActivity attempt failed, attempting fallback without custom stages:",
              firstErr,
            );
            await createActivity({
              planId: targetBackendPlanId,
              procurementMethodId: resolvedMethodId,
              description: activity.description || "Activity description",
              estimatedBudget: Number(activity.estimatedAmount) || 500000,
              currency: selectedPlan.currency || "ETB",
              fundings: [
                {
                  fundingSource:
                    selectedProject.fundingSource ||
                    "African Development Bank (AfDB)",
                  loanGrantNumber:
                    selectedProject.financingNumbers?.[0] || undefined,
                  allocationPct: 100,
                },
              ],
            });
          }
        }
      } catch (err) {
        console.warn("Backend saveActivity note:", err);
      }
    }

    await loadData();

    // Navigate back to plan detail
    router.push(
      "/workspace/projects?project=" +
        encodeURIComponent(selectedProject.code) +
        "&plan=" +
        encodeURIComponent(selectedPlan.reference),
    );
  }

  async function submitPlanToDirector() {
    if (!selectedProject || !selectedPlan) return;

    // 1. Resolve matching backend plan UUID
    const matchingBackendPlan = backendPlans.find(
      (bp) =>
        bp.id === selectedPlan.id ||
        bp.id === selectedPlan.reference ||
        bp.title.toLowerCase().trim() ===
          selectedPlan.name.toLowerCase().trim() ||
        bp.title.toLowerCase().trim() ===
          selectedPlan.reference.toLowerCase().trim(),
    );

    let planIdToSubmit =
      matchingBackendPlan?.id ||
      (selectedPlan.id &&
      selectedPlan.id.includes("-") &&
      selectedPlan.id.length > 20
        ? selectedPlan.id
        : undefined);

    if (!planIdToSubmit) {
      const targetProjectId =
        selectedProject.id && selectedProject.id.length > 20
          ? selectedProject.id
          : backendProjects.find(
              (bp) =>
                bp.code === selectedProject.code ||
                bp.id === selectedProject.id ||
                bp.name === selectedProject.name,
            )?.id ||
            selectedProject.id ||
            selectedProject.code;

      try {
        let catEnum: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" =
          "GOODS";
        if (selectedPlan.category === "Works") catEnum = "WORKS";
        else if (selectedPlan.category === "Consultancy Services")
          catEnum = "CONSULTANCY";
        else if (selectedPlan.category === "Non-Consulting Services")
          catEnum = "NON_CONSULTING";

        const created = await createPlan({
          projectId: targetProjectId,
          title: selectedPlan.name.trim(),
          budgetYear: selectedPlan.budgetYear,
          procurementCategory: catEnum,
          organization: selectedPlan.organizationRegion || "Federal / FPCU",
          description: selectedPlan.description || undefined,
          periodStart: selectedPlan.planPeriod?.from?.gregorian || "2025-07-08",
          periodEnd: selectedPlan.planPeriod?.to?.gregorian || "2026-07-07",
        });
        if (created && created.id) {
          planIdToSubmit = created.id;
        }
      } catch (err) {
        console.warn("Backend createPlan in submitPlanToDirector note:", err);
      }
    }

    if (!planIdToSubmit) {
      planIdToSubmit = selectedPlan.id || selectedPlan.reference;
    }

    // 2. Sync all local activities to the backend before submitting
    // This ensures the Director can see activities via the API across any browser
    try {
      const existingBackendActs = await fetchActivities(planIdToSubmit).catch(
        () => [],
      );
      const existingRefs = new Set(
        existingBackendActs.map((a) => (a.reference || "").toLowerCase()),
      );
      const existingDescs = new Set(
        existingBackendActs.map((a) => (a.description || "").toLowerCase()),
      );

      for (const act of selectedPlanActivities) {
        if (
          existingRefs.has((act.reference || "").toLowerCase()) ||
          existingDescs.has((act.description || "").toLowerCase())
        ) {
          continue;
        }

        try {
          const methodLabel = act.method || "RFB - National";
          const resolvedMethodId =
            await resolveProcurementMethodId(methodLabel);

          const customStages = (
            act.details?.roadmap ||
            (act as any).roadmap ||
            []
          ).map((st: any, sIdx: number) => ({
            name: st.name || st.stageName,
            sequence: sIdx + 1,
            plannedStartDate:
              st.gregorianDate || st.plannedStartDate || undefined,
            gregorianDate: st.gregorianDate || undefined,
            ethiopianDate: st.ethiopianDate || undefined,
            isNotApplicable: Boolean(st.notApplicable || st.isNotApplicable),
            notApplicable: Boolean(st.notApplicable || st.isNotApplicable),
            remarks: st.remarks || undefined,
          }));

          try {
            await createActivity({
              planId: planIdToSubmit,
              procurementMethodId: resolvedMethodId,
              description: act.description || "Activity description",
              estimatedBudget: Number(act.estimatedAmount) || 500000,
              currency: selectedPlan.currency || "ETB",
              stages: customStages.length > 0 ? customStages : undefined,
              fundings: [
                {
                  fundingSource:
                    selectedProject.fundingSource ||
                    "African Development Bank (AfDB)",
                  loanGrantNumber:
                    selectedProject.financingNumbers?.[0] || undefined,
                  allocationPct: 100,
                },
              ],
            });
          } catch (firstErr) {
            console.warn(
              "First submit sync createActivity attempt failed, attempting fallback without custom stages:",
              firstErr,
            );
            await createActivity({
              planId: planIdToSubmit,
              procurementMethodId: resolvedMethodId,
              description: act.description || "Activity description",
              estimatedBudget: Number(act.estimatedAmount) || 500000,
              currency: selectedPlan.currency || "ETB",
              fundings: [
                {
                  fundingSource:
                    selectedProject.fundingSource ||
                    "African Development Bank (AfDB)",
                  loanGrantNumber:
                    selectedProject.financingNumbers?.[0] || undefined,
                  allocationPct: 100,
                },
              ],
            });
          }
        } catch (actErr) {
          console.warn("Backend activity sync on submit note:", actErr);
        }
      }
    } catch (syncErr) {
      console.warn("Activity sync before submit note:", syncErr);
    }

    // 3. Submit on backend
    try {
      await submitPlanForReview(planIdToSubmit);
    } catch (err) {
      console.warn("Backend submitPlanForReview note:", err);
    }

    // 3. Update local state
    const updatedPlan: ProcurementPlanSummary = {
      ...selectedPlan,
      status: "Submitted to Director",
      activities: selectedPlanActivities.length || selectedPlan.activities,
      planActivities: selectedPlanActivities,
    };

    const nextRecords = upsertSavedPlanRecord(savedPlanRecords, {
      plan: updatedPlan,
      projectCode: selectedProject.code,
    });

    setSavedPlanRecords(nextRecords);
    window.localStorage.setItem(
      OFFICER_PLAN_DRAFTS_STORAGE_KEY,
      JSON.stringify(nextRecords),
    );

    // Optimistically update backendPlans state
    setBackendPlans((prev) =>
      prev.map((bp) => {
        if (
          bp.id === selectedPlan.reference ||
          bp.id === selectedPlan.id ||
          bp.title === selectedPlan.reference ||
          bp.title === selectedPlan.name
        ) {
          return {
            ...bp,
            status: "SUBMITTED",
          };
        }
        return bp;
      }),
    );

    await loadData();
  }

  function handlePlanUpdated(updatedPlan: ProcurementPlanSummary) {
    if (!selectedProject) return;

    const nextRecords = upsertSavedPlanRecord(savedPlanRecords, {
      plan: updatedPlan,
      projectCode: selectedProject.code,
    });

    setSavedPlanRecords(nextRecords);
    window.localStorage.setItem(
      OFFICER_PLAN_DRAFTS_STORAGE_KEY,
      JSON.stringify(nextRecords),
    );

    void loadData();
  }

  function handleActivityUpdated(updatedActivity: ProcurementActivitySummary) {
    saveActivity(updatedActivity);
  }

  if (selectedProject && (mode === "create-plan" || mode === "edit-plan")) {
    return (
      <CreateProcurementPlanView
        initialPlan={mode === "edit-plan" ? selectedPlan : undefined}
        onSavePlan={savePlan}
        project={selectedProject}
      />
    );
  }

  if (
    selectedProject &&
    selectedPlan &&
    (mode === "create-activity" || mode === "edit-activity")
  ) {
    return (
      <CreateProcurementActivityView
        existingActivityCount={
          selectedPlan.activities + selectedPlanActivities.length
        }
        initialActivity={
          mode === "edit-activity" ? selectedActivity : undefined
        }
        onSaveActivity={saveActivity}
        plan={selectedPlan}
        project={selectedProject}
      />
    );
  }

  if (selectedProject && selectedPlan && selectedActivity) {
    return (
      <OfficerProcurementActivityDetailView
        activity={selectedActivity}
        currentUser={effectiveUser}
        fromTracker={fromTracker}
        onUpdateActivity={handleActivityUpdated}
        plan={selectedPlan}
        project={selectedProject}
      />
    );
  }

  if (selectedProject && selectedPlan) {
    return (
      <OfficerProcurementPlanDetailView
        onSubmitToDirector={submitPlanToDirector}
        onUpdateActivity={handleActivityUpdated}
        onUpdatePlan={handlePlanUpdated}
        plan={selectedPlan}
        project={selectedProject}
        savedActivities={selectedPlanActivities}
      />
    );
  }

  if (selectedProject) {
    return <OfficerProjectDetailView project={selectedProject} />;
  }

  if (selectedProjectCode && !selectedProject) {
    return (
      <div className="space-y-5 pb-6">
        <header>
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <ol className="flex items-center gap-2">
              <li>
                <Link
                  className="hover:text-[#176c55] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                  href="/dashboard/officer"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-300">
                /
              </li>
              <li>
                <Link
                  className="hover:text-[#176c55] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                  href="/workspace/projects"
                >
                  Projects
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-300">
                /
              </li>
              <li aria-current="page" className="font-semibold text-slate-800">
                Access Restricted
              </li>
            </ol>
          </nav>
        </header>

        <section className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShieldAlert aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Project Not Assigned
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            The project{" "}
            <span className="font-mono font-semibold text-slate-800">
              {selectedProjectCode}
            </span>{" "}
            is either not found or has not been assigned to your officer
            account. Only projects specifically assigned to you by the
            Procurement Director can be accessed.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-[#176c55] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#125845] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
              href="/workspace/projects"
            >
              View My Assigned Projects
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <OfficerProjectsList projects={projects} />;
}

function OfficerProjectsList({
  projects,
}: {
  projects: readonly OfficerProject[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fundingSource, setFundingSource] = useState("all");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fundingSources = useMemo(
    () => [...new Set(projects.map((project) => project.fundingSource))],
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          project.name,
          project.code,
          project.fundingSource,
          project.organizationRegion ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesFunding =
        fundingSource === "all" || project.fundingSource === fundingSource;
      const matchesStatus = status === "all" || project.status === status;

      return matchesSearch && matchesFunding && matchesStatus;
    });
  }, [fundingSource, projects, searchQuery, status]);

  const resultCount = filteredProjects.length;
  const entrySummary =
    resultCount === 0
      ? "Showing 0 entries"
      : `Showing 1 to ${resultCount} of ${resultCount} entries`;

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="space-y-5 pb-6">
      <header>
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                className="hover:text-[#176c55] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                href="/dashboard/officer"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li aria-current="page" className="font-semibold text-slate-800">
              Projects
            </li>
          </ol>
        </nav>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#10243f]">
              My Projects
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
              Overview of projects specifically assigned to your account for
              procurement planning and tracking.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              onClick={() => exportOfficerProjectsToExcel([...projects])}
              type="button"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#176c55] shadow-2xs hover:bg-[#edf5f1] transition cursor-pointer"
              onClick={() => setIsImportModalOpen(true)}
              type="button"
            >
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              Import Excel
            </button>
          </div>
        </div>
      </header>

      {projects.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6f4ef] text-[#0A3C2F]">
            <FolderLock aria-hidden="true" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No Projects Assigned
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
            You do not have any projects assigned to your officer account yet. A
            Procurement Director must assign projects to your account before
            they will appear here for procurement planning and tracking.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-[#176c55] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#125845] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
              href="/dashboard/officer"
            >
              Return to Dashboard
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section
            aria-label="Project filters"
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="block md:min-w-0 md:max-w-100 md:flex-1">
                <span className="sr-only">Search projects</span>
                <span
                  className="flex h-11 cursor-text items-center gap-3 rounded-lg border border-slate-300 bg-[#fbfcfd] px-3.5 focus-within:border-[#348267] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#348267]/15"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <Search
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-slate-500"
                  />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search projects..."
                    ref={searchInputRef}
                    spellCheck={false}
                    style={{
                      appearance: "none",
                      background: "transparent",
                      border: 0,
                      boxShadow: "none",
                      margin: 0,
                      minWidth: 0,
                      outline: "none",
                      padding: 0,
                      width: "100%",
                      WebkitAppearance: "none",
                    }}
                    type="search"
                    value={searchQuery}
                  />
                </span>
              </label>

              <label className="relative block md:w-52 md:shrink-0">
                <span className="sr-only">Filter by funding source</span>
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-[#fbfcfd] px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-[#348267] focus:bg-white focus:ring-3 focus:ring-[#348267]/15"
                  onChange={(event) => setFundingSource(event.target.value)}
                  style={{
                    appearance: "none",
                    paddingRight: "3rem",
                    WebkitAppearance: "none",
                  }}
                  value={fundingSource}
                >
                  <option value="all">Funding Source</option>
                  {fundingSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none h-4 w-4 text-slate-500"
                  style={{
                    position: "absolute",
                    right: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </label>

              <label className="relative block md:w-40 md:shrink-0">
                <span className="sr-only">Filter by project status</span>
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-[#fbfcfd] px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-[#348267] focus:bg-white focus:ring-3 focus:ring-[#348267]/15"
                  onChange={(event) =>
                    setStatus(event.target.value as "all" | ProjectStatus)
                  }
                  style={{
                    appearance: "none",
                    paddingRight: "3rem",
                    WebkitAppearance: "none",
                  }}
                  value={status}
                >
                  <option value="all">Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none h-4 w-4 text-slate-500"
                  style={{
                    position: "absolute",
                    right: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </label>
            </div>
          </section>

          <section
            aria-labelledby="projects-table-title"
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs"
          >
            <h2 className="sr-only" id="projects-table-title">
              Assigned projects
            </h2>
            <div
              aria-label="Assigned projects table"
              className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#176c55]"
              role="region"
              tabIndex={0}
            >
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th
                      className="w-[24%] max-w-[280px] px-4 py-3.5"
                      scope="col"
                    >
                      Project name
                    </th>
                    <th className="w-[10%] px-4 py-3.5" scope="col">
                      Code
                    </th>
                    <th className="w-[14%] px-4 py-3.5" scope="col">
                      Funding source
                    </th>
                    <th className="w-[15%] px-4 py-3.5" scope="col">
                      Organization / region
                    </th>
                    <th className="w-[15%] px-4 py-3.5" scope="col">
                      Assignment start
                    </th>
                    <th className="w-[8%] px-4 py-3.5 text-center" scope="col">
                      Active plans
                    </th>
                    <th className="w-[7%] px-4 py-3.5" scope="col">
                      Status
                    </th>
                    <th className="w-[7%] px-4 py-3.5 text-right" scope="col">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <tr key={project.code} className="hover:bg-[#f8fbf9]">
                        <td className="max-w-[280px] px-4 py-3.5 align-middle">
                          <Link
                            title={project.name}
                            className="line-clamp-2 break-words font-semibold leading-snug text-slate-900 underline-offset-4 hover:text-[#176c55] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                            href={`/workspace/projects?project=${encodeURIComponent(
                              project.code,
                            )}`}
                          >
                            {project.name}
                          </Link>
                          <p className="mt-1 font-mono text-[11px] font-medium text-slate-500">
                            {project.code}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-slate-500">
                          {project.code}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {project.fundingSource}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {project.organizationRegion ?? "Not provided"}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {project.assignmentStart?.gregorian ?? "—"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {project.assignmentStart?.ethiopian}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-bold text-slate-800">
                          {project.activePlans}
                        </td>
                        <td className="px-4 py-4">
                          <StatusText
                            className="text-xs"
                            label={project.status}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            aria-label={`Open ${project.name}`}
                            className="text-sm font-semibold text-[#1261a8] underline-offset-4 hover:text-[#07523f] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07523f]"
                            href={`/workspace/projects?project=${encodeURIComponent(
                              project.code,
                            )}`}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-12 text-center text-sm text-slate-500"
                        colSpan={8}
                      >
                        No projects match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-[#fbfcfd] px-4 py-4 text-xs text-slate-500">
              <p aria-live="polite">{entrySummary}</p>
              <div
                aria-label="Project table pagination"
                className="flex gap-1.5"
              >
                <button
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-300"
                  disabled
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-300"
                  disabled
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        </>
      )}

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(imported) => {
          if (typeof window !== "undefined") {
            const raw = window.localStorage.getItem(
              OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
            );
            let existingRecords = parseSavedActivityRecords(raw);

            imported.forEach((act) => {
              const defaultProj = projects[0]?.code || "PRJ-24-001";
              const defaultPlan =
                projects[0]?.plans?.[0]?.reference || "PP-DRIVE-2016-01";
              existingRecords = addSavedActivityRecord(existingRecords, {
                activity: act,
                planReference: defaultPlan,
                projectCode: defaultProj,
              });
            });

            window.localStorage.setItem(
              OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
              JSON.stringify(existingRecords),
            );
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
