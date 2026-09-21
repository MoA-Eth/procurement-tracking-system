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
  getCachedPlans,
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
  getCachedProjects,
  isProjectAssignedToOfficer,
  mapBackendProjectToOfficerProject,
} from "@/lib/projectsApi";
import { getCurrentUser } from "@/lib/authApi";
import type { AuthUser } from "@/lib/authTypes";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderLock,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function upsertSummaryActivity(
  list: ProcurementActivitySummary[],
  act: ProcurementActivitySummary,
) {
  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const actDesc = norm(act.description);
  const actRef = norm(act.reference);
  const actId = norm((act as any).id || (act as any).activityId);

  const existingIdx = list.findIndex((ex) => {
    const exDesc = norm(ex.description);
    const exRef = norm(ex.reference);
    const exId = norm((ex as any).id || (ex as any).activityId);

    if (actId && exId && actId === exId) return true;
    if (actRef && exRef && actRef === exRef) return true;

    if (actDesc && exDesc && actDesc === exDesc) {
      const actAmt = Number(act.estimatedAmount) || 0;
      const exAmt = Number(ex.estimatedAmount) || 0;
      if (actAmt === exAmt || Math.abs(actAmt - exAmt) < 1) return true;
      if (norm(act.method) && norm(act.method) === norm(ex.method)) return true;
    }

    return false;
  });

  if (existingIdx === -1) {
    list.push(act);
  } else {
    const existing = list[existingIdx];
    const isIncomingBackend = Boolean(
      (act as any).id &&
      String((act as any).id).includes("-") &&
      String((act as any).id).length > 20,
    );
    const isExistingBackend = Boolean(
      (existing as any).id &&
      String((existing as any).id).includes("-") &&
      String((existing as any).id).length > 20,
    );

    if (isIncomingBackend && !isExistingBackend) {
      list[existingIdx] = act;
    } else if (!isIncomingBackend && isExistingBackend) {
      // Keep backend
    } else {
      list[existingIdx] = { ...existing, ...act };
    }
  }
}

function safeIsoDate(val?: string, fallback: string = "2025-07-08"): string {
  if (!val) return new Date(fallback).toISOString();
  const d = new Date(val);
  if (isNaN(d.getTime())) return new Date(fallback).toISOString();
  return d.toISOString();
}

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
  const [backendProjects, setBackendProjects] = useState<OfficerProject[]>(() => {
    const cachedProjs = getCachedProjects();
    if (cachedProjs && cachedProjs.length > 0) {
      const filteredProjects = effectiveUser
        ? cachedProjs.filter((bp) =>
            isProjectAssignedToOfficer(bp, effectiveUser),
          )
        : cachedProjs;
      const effectiveProjectList =
        filteredProjects.length > 0 ? filteredProjects : cachedProjs;
      const uniqueProjectMap = new Map<string, (typeof effectiveProjectList)[0]>();
      for (const p of effectiveProjectList) {
        const key = (p.id || p.code || "").toLowerCase().trim();
        if (key && !uniqueProjectMap.has(key)) {
          uniqueProjectMap.set(key, p);
        }
      }
      return Array.from(uniqueProjectMap.values()).map(
        mapBackendProjectToOfficerProject,
      );
    }
    return [];
  });
  const [backendPlans, setBackendPlans] = useState<BackendPlan[]>(
    () => getCachedPlans() || [],
  );
  const [backendActivities, setBackendActivities] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(() => !getCachedProjects());

  const loadData = useCallback(async () => {
    try {
      if (backendProjects.length === 0) {
        setIsLoadingData(true);
      }
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
        const effectiveProjectList =
          filteredProjects.length > 0 ? filteredProjects : projData.value;
        const uniqueProjectMap = new Map<string, (typeof effectiveProjectList)[0]>();
        for (const p of effectiveProjectList) {
          const key = (p.id || p.code || "").toLowerCase().trim();
          if (key && !uniqueProjectMap.has(key)) {
            uniqueProjectMap.set(key, p);
          }
        }
        assignedProjList = Array.from(uniqueProjectMap.values()).map(
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
    } finally {
      setIsLoadingData(false);
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
    const list: SavedOfficerActivityRecord[] = [];
    const norm = (s?: string) => (s || "").trim().toLowerCase();

    const findIndex = (rec: SavedOfficerActivityRecord) => {
      const rPlan = norm(rec.planReference);
      const rDesc = norm(rec.activity.description);
      const rRef = norm(rec.activity.reference);
      const rId = norm(
        (rec.activity as any).id || (rec.activity as any).activityId,
      );
      const rAmt = Number(rec.activity.estimatedAmount) || 0;

      return list.findIndex((ex) => {
        const ePlan = norm(ex.planReference);
        if (rPlan && ePlan && rPlan !== ePlan) return false;

        const eId = norm(
          (ex.activity as any).id || (ex.activity as any).activityId,
        );
        const eRef = norm(ex.activity.reference);
        const eDesc = norm(ex.activity.description);
        const eAmt = Number(ex.activity.estimatedAmount) || 0;

        if (rId && eId && rId === eId) return true;
        if (rRef && eRef && rRef === eRef) return true;
        if (rDesc && eDesc && rDesc === eDesc) {
          if (rAmt === eAmt || Math.abs(rAmt - eAmt) < 1) return true;
          if (
            norm(rec.activity.method) &&
            norm(rec.activity.method) === norm(ex.activity.method)
          )
            return true;
        }
        return false;
      });
    };

    backendActivities.forEach((rec) => {
      const idx = findIndex(rec);
      if (idx === -1) {
        list.push(rec);
      } else {
        list[idx] = rec;
      }
    });

    savedActivityRecords.forEach((rec) => {
      const idx = findIndex(rec);
      if (idx === -1) {
        list.push(rec);
      }
    });

    return list;
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

    const combined: ProcurementActivitySummary[] = [];
    directBackendActivities.forEach((a) => upsertSummaryActivity(combined, a));
    matchingSaved.forEach((a) => upsertSummaryActivity(combined, a));

    if (selectedPlan.planActivities && selectedPlan.planActivities.length > 0) {
      selectedPlan.planActivities.forEach((a) =>
        upsertSummaryActivity(combined, a),
      );
    }

    const activitiesList = combined.map((act) => {
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

  const isPlanInBackend = useMemo(() => {
    if (!selectedPlan) return false;
    return backendPlans.some(
      (bp) =>
        bp.id === selectedPlan.id ||
        bp.id === selectedPlan.reference ||
        bp.title.toLowerCase().trim() ===
          selectedPlan.name.toLowerCase().trim() ||
        bp.title.toLowerCase().trim() ===
          selectedPlan.reference.toLowerCase().trim(),
    );
  }, [backendPlans, selectedPlan]);

  const selectedActivity = useMemo(() => {
    if (!selectedProject || !selectedPlan || !selectedActivityReference)
      return undefined;

    const ref = selectedActivityReference.trim();
    let decoded = ref;
    try {
      decoded = decodeURIComponent(ref).trim().toLowerCase();
    } catch {
      decoded = ref.toLowerCase();
    }
    const rawLower = ref.toLowerCase();

    // 1. Check in selectedPlanActivities
    const inPlan = selectedPlanActivities.find((a) => {
      const aRef = a.reference.toLowerCase();
      const aId = (a as any).id ? String((a as any).id).toLowerCase() : "";
      return (
        aRef === decoded ||
        aRef === rawLower ||
        (aId && (aId === decoded || aId === rawLower))
      );
    });
    if (inPlan) return inPlan;

    // 2. Check in effectiveSavedActivityRecords
    const inSaved = effectiveSavedActivityRecords.find((rec) => {
      const aRef = rec.activity.reference.toLowerCase();
      const aId = (rec.activity as any).id
        ? String((rec.activity as any).id).toLowerCase()
        : "";
      const matchesRef =
        aRef === decoded ||
        aRef === rawLower ||
        (aId && (aId === decoded || aId === rawLower));
      const matchesParent =
        rec.projectCode?.toLowerCase() === selectedProject.code.toLowerCase() ||
        rec.planReference?.toLowerCase() ===
          selectedPlan.reference.toLowerCase() ||
        rec.planReference?.toLowerCase() === selectedPlan.name.toLowerCase();
      return matchesRef && matchesParent;
    });
    if (inSaved) return inSaved.activity;

    // 3. Fallback check in selectedPlan.planActivities
    if (selectedPlan.planActivities && selectedPlan.planActivities.length > 0) {
      const inPlanActs = selectedPlan.planActivities.find((a) => {
        const aRef = a.reference.toLowerCase();
        const aId = (a as any).id ? String((a as any).id).toLowerCase() : "";
        return (
          aRef === decoded ||
          aRef === rawLower ||
          (aId && (aId === decoded || aId === rawLower))
        );
      });
      if (inPlanActs) return inPlanActs;
    }

    return undefined;
  }, [
    selectedProject,
    selectedPlan,
    selectedActivityReference,
    selectedPlanActivities,
    effectiveSavedActivityRecords,
  ]);

  async function savePlan(
    input: ProcurementPlanDraftInput,
    action: "activity" | "draft",
    revisionReason?: string,
  ) {
    if (!selectedProject) return;

    let catEnum: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" = "GOODS";
    if (input.category === "Works") catEnum = "WORKS";
    else if (input.category === "Consultancy Services") catEnum = "CONSULTANCY";
    else if (input.category === "Non-Consulting Services") catEnum = "NON_CONSULTING";

    const periodStart = safeIsoDate(input.periodFrom, "2025-07-08");
    const periodEnd = safeIsoDate(input.periodTo, "2026-07-07");

    // Resolve target project database UUID
    let targetProjectId =
      selectedProject.id &&
      selectedProject.id.includes("-") &&
      selectedProject.id.length > 20
        ? selectedProject.id
        : backendProjects.find(
            (bp) =>
              bp.code.toLowerCase() === selectedProject.code.toLowerCase() ||
              bp.id === selectedProject.id ||
              bp.name.toLowerCase() === selectedProject.name.toLowerCase(),
          )?.id;

    if (!targetProjectId) {
      try {
        const freshProjects = await fetchProjects();
        const match = freshProjects.find(
          (bp: any) =>
            bp.code?.toLowerCase() === selectedProject.code.toLowerCase() ||
            bp.id === selectedProject.id ||
            bp.name?.toLowerCase() === selectedProject.name.toLowerCase(),
        );
        if (match?.id) {
          targetProjectId = match.id;
        }
      } catch (fetchErr) {
        console.warn("Could not fetch projects to verify:", fetchErr);
      }
    }

    if (!targetProjectId || targetProjectId.length < 20) {
      throw new Error(
        `Cannot save plan in database: Project "${selectedProject.name}" (${selectedProject.code}) is not registered in the database. Please ensure this project is registered in the database first.`,
      );
    }

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

      // Update backend if valid UUID id exists, or create if missing
      if (selectedPlan.id && selectedPlan.id.includes("-") && selectedPlan.id.length > 20) {
        try {
          const updated = await updatePlan(selectedPlan.id, {
            title: input.planName.trim(),
            budgetYear: `${input.budgetYear} EFY`,
            procurementCategory: catEnum,
            organization: input.organizationRegion || selectedProject.organizationRegion,
            description: input.remarks || undefined,
            periodStart,
            periodEnd,
          });
          if (updated && updated.id) {
            updatedPlan.id = updated.id;
            updatedPlan.reference = updated.id;
          }
        } catch (e: any) {
          console.warn("Backend updatePlan note:", e);
        }
      } else {
        const created = await createPlan({
          projectId: targetProjectId,
          title: input.planName.trim(),
          budgetYear: `${input.budgetYear} EFY`,
          procurementCategory: catEnum,
          organization: input.organizationRegion || selectedProject.organizationRegion || "Federal / FPCU",
          description: input.remarks || undefined,
          periodStart,
          periodEnd,
        });
        if (created && created.id) {
          updatedPlan.id = created.id;
          updatedPlan.reference = created.id;
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
            encodeURIComponent(updatedPlan.reference) +
            "&mode=create-activity",
        );
        return;
      }

      router.push(
        "/workspace/projects?project=" +
          encodeURIComponent(selectedProject.code) +
          "&plan=" +
          encodeURIComponent(updatedPlan.reference),
      );
      return;
    }

    // MODE: CREATE NEW PLAN
    const existingPlan = selectedProject.plans.find(
      (plan) =>
        plan.name.trim().toLowerCase() === input.planName.trim().toLowerCase() &&
        plan.budgetYear === `${input.budgetYear} EFY` &&
        plan.category === input.category,
    );

    // Check if the plan is already registered on the backend database
    const backendMatch = backendPlans.find(
      (bp) =>
        bp.id === existingPlan?.id ||
        bp.id === existingPlan?.reference ||
        (bp.title.toLowerCase().trim() === input.planName.trim().toLowerCase() &&
          (bp.projectId === targetProjectId ||
            bp.project?.id === targetProjectId ||
            bp.project?.code?.toLowerCase() === selectedProject.code.toLowerCase())),
    );

    let dbPlan: BackendPlan;

    if (backendMatch && backendMatch.id) {
      try {
        dbPlan = await updatePlan(backendMatch.id, {
          title: input.planName.trim(),
          budgetYear: `${input.budgetYear} EFY`,
          procurementCategory: catEnum,
          organization: input.organizationRegion || selectedProject.organizationRegion || "Federal / FPCU",
          description: input.remarks || undefined,
          periodStart,
          periodEnd,
        });
      } catch {
        dbPlan = backendMatch;
      }
    } else {
      // Create new plan in backend database
      dbPlan = await createPlan({
        projectId: targetProjectId,
        title: input.planName.trim(),
        budgetYear: `${input.budgetYear} EFY`,
        procurementCategory: catEnum,
        organization: input.organizationRegion || selectedProject.organizationRegion || "Federal / FPCU",
        description: input.remarks || undefined,
        periodStart,
        periodEnd,
      });

      if (!dbPlan || !dbPlan.id) {
        throw new Error("Server failed to create the plan in the database. Please try again.");
      }
    }

    const planForNavigation: ProcurementPlanSummary = {
      ...(existingPlan || createDraftPlan(selectedProject, input)),
      id: dbPlan.id,
      reference: dbPlan.id,
      name: dbPlan.title || input.planName.trim(),
      budgetYear: `${input.budgetYear} EFY`,
      category: input.category,
      organizationRegion: input.organizationRegion || selectedProject.organizationRegion,
      createdById: dbPlan.createdBy,
      createdByName:
        dbPlan.creator?.displayName ||
        dbPlan.creator?.name ||
        effectiveUser?.displayName ||
        "Assigned Officer",
      createdAt: dbPlan.createdAt,
    };

    const nextRecords = upsertSavedPlanRecord(savedPlanRecords, {
      plan: planForNavigation,
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
          encodeURIComponent(planForNavigation.reference) +
          "&mode=create-activity",
      );
      return;
    }

    router.push(
      "/workspace/projects?project=" +
        encodeURIComponent(selectedProject.code) +
        "&plan=" +
        encodeURIComponent(planForNavigation.reference),
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
          activityReference: activity.reference,
          activityDescription: activity.description,
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
      let targetProjectId =
        selectedProject.id &&
        selectedProject.id.includes("-") &&
        selectedProject.id.length > 20
          ? selectedProject.id
          : backendProjects.find(
              (bp) =>
                bp.code.toLowerCase() === selectedProject.code.toLowerCase() ||
                bp.id === selectedProject.id ||
                bp.name.toLowerCase() === selectedProject.name.toLowerCase(),
            )?.id;

      if (!targetProjectId) {
        try {
          const freshProjects = await fetchProjects();
          const match = freshProjects.find(
            (bp: any) =>
              bp.code?.toLowerCase() === selectedProject.code.toLowerCase() ||
              bp.id === selectedProject.id ||
              bp.name?.toLowerCase() === selectedProject.name.toLowerCase(),
          );
          if (match?.id) targetProjectId = match.id;
        } catch {}
      }

      if (targetProjectId) {
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
            periodStart: safeIsoDate(
              selectedPlan.planPeriod?.from?.gregorian,
              "2025-07-08",
            ),
            periodEnd: safeIsoDate(
              selectedPlan.planPeriod?.to?.gregorian,
              "2026-07-07",
            ),
          });
          if (created && created.id) {
            targetBackendPlanId = created.id;
            selectedPlan.id = created.id;
            selectedPlan.reference = created.id;
          }
        } catch (err) {
          console.warn("Backend createPlan in saveActivity note:", err);
        }
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
          let createdBackendAct: any = null;
          try {
            createdBackendAct = await createActivity({
              planId: targetBackendPlanId,
              reference: activity.reference,
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
            try {
              createdBackendAct = await createActivity({
                planId: targetBackendPlanId,
                reference: activity.reference,
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
            } catch (secondErr) {
              console.warn("Second createActivity attempt failed:", secondErr);
            }
          }

          if (createdBackendAct && createdBackendAct.id) {
            const backendId = createdBackendAct.id;
            const backendRef =
              createdBackendAct.reference || activity.reference;

            // Sync savedActivityRecords
            const updatedSavedActs = savedActivityRecords.map((r) => {
              if (
                r.activity.reference?.toLowerCase() ===
                  activity.reference?.toLowerCase() ||
                r.activity.description?.trim().toLowerCase() ===
                  activity.description?.trim().toLowerCase()
              ) {
                return {
                  ...r,
                  activity: {
                    ...r.activity,
                    id: backendId,
                    activityId: backendId,
                    reference: backendRef,
                  },
                };
              }
              return r;
            });
            setSavedActivityRecords(updatedSavedActs);
            window.localStorage.setItem(
              OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
              JSON.stringify(updatedSavedActs),
            );

            // Sync savedPlanRecords
            const updatedSavedPlans = savedPlanRecords.map((item) => {
              if (
                item.plan.reference?.toLowerCase() ===
                  selectedPlan.reference?.toLowerCase() ||
                item.plan.name?.toLowerCase() ===
                  selectedPlan.name?.toLowerCase()
              ) {
                const updatedPlanActs = (item.plan.planActivities || []).map(
                  (a) => {
                    if (
                      a.reference?.toLowerCase() ===
                        activity.reference?.toLowerCase() ||
                      a.description?.trim().toLowerCase() ===
                        activity.description?.trim().toLowerCase()
                    ) {
                      return {
                        ...a,
                        id: backendId,
                        activityId: backendId,
                        reference: backendRef,
                      };
                    }
                    return a;
                  },
                );
                return {
                  ...item,
                  plan: {
                    ...item.plan,
                    planActivities: updatedPlanActs,
                  },
                };
              }
              return item;
            });
            setSavedPlanRecords(updatedSavedPlans);
            window.localStorage.setItem(
              OFFICER_PLAN_DRAFTS_STORAGE_KEY,
              JSON.stringify(updatedSavedPlans),
            );
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

  async function submitPlanToDirector(planReference?: string, reason?: string) {
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
      let targetProjectId =
        selectedProject.id &&
        selectedProject.id.includes("-") &&
        selectedProject.id.length > 20
          ? selectedProject.id
          : backendProjects.find(
              (bp) =>
                bp.code.toLowerCase() === selectedProject.code.toLowerCase() ||
                bp.id === selectedProject.id ||
                bp.name.toLowerCase() === selectedProject.name.toLowerCase(),
            )?.id;

      if (!targetProjectId) {
        try {
          const freshProjects = await fetchProjects();
          const match = freshProjects.find(
            (bp: any) =>
              bp.code?.toLowerCase() === selectedProject.code.toLowerCase() ||
              bp.id === selectedProject.id ||
              bp.name?.toLowerCase() === selectedProject.name.toLowerCase(),
          );
          if (match?.id) {
            targetProjectId = match.id;
          }
        } catch (fetchErr) {
          console.warn("Could not fetch projects to verify:", fetchErr);
        }
      }

      if (!targetProjectId || targetProjectId.length < 20) {
        throw new Error(
          `Project "${selectedProject.name}" (${selectedProject.code}) is not registered in the database. A plan cannot be submitted without a registered database project.`,
        );
      }

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

      if (!created || !created.id) {
        throw new Error(
          "Failed to create plan in database: Server returned an invalid response.",
        );
      }

      planIdToSubmit = created.id;
    }

    // 2. Sync all local activities to the backend before submitting
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
      }
    } catch (syncErr) {
      console.warn("Activity sync before submit note:", syncErr);
    }

    // 3. Submit on backend — use PATCH status:SUBMITTED as primary because the
    //    dedicated /submit endpoint rejects DRAFT plans with a voting-round error.
    let submitResult: any = null;
    try {
      submitResult = await updatePlan(planIdToSubmit, { status: "SUBMITTED" });
    } catch (patchErr: any) {
      console.warn("updatePlan SUBMITTED notice, falling back to /submit:", patchErr);
    }
    if (!submitResult || !submitResult.id) {
      // Fallback to the dedicated submit endpoint
      submitResult = await submitPlanForReview(planIdToSubmit);
    }
    if (!submitResult) {
      throw new Error("Server failed to confirm plan submission to Director.");
    }

    // 4. Update local state and persistence ONLY upon verified backend submission
    const updatedPlan: ProcurementPlanSummary = {
      ...selectedPlan,
      id: planIdToSubmit,
      reference: selectedPlan.reference || planIdToSubmit,
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
          bp.id === planIdToSubmit ||
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

  async function handleBulkImportPlans(
    importedPlans: ProcurementPlanSummary[],
  ) {
    if (!selectedProject || importedPlans.length === 0) return;

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

    let updatedSavedRecords = savedPlanRecords;

    for (const plan of importedPlans) {
      let catEnum: "GOODS" | "WORKS" | "CONSULTANCY" | "NON_CONSULTING" =
        "GOODS";
      if (plan.category === "Works") catEnum = "WORKS";
      else if (plan.category === "Consultancy Services")
        catEnum = "CONSULTANCY";
      else if (plan.category === "Non-Consulting Services")
        catEnum = "NON_CONSULTING";

      const periodStart = plan.planPeriod?.from?.gregorian || "2025-07-08";
      const periodEnd = plan.planPeriod?.to?.gregorian || "2026-07-07";

      try {
        const created = await createPlan({
          projectId: targetProjectId,
          title: plan.name.trim(),
          budgetYear: plan.budgetYear,
          procurementCategory: catEnum,
          organization:
            plan.organizationRegion ||
            selectedProject.organizationRegion ||
            "Federal / FPCU",
          description: plan.description || undefined,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
        });
        if (created && created.id) {
          plan.reference = created.id;
          plan.id = created.id;
          plan.createdById = created.createdBy;
          plan.createdByName =
            created.creator?.displayName ||
            created.creator?.name ||
            effectiveUser?.displayName ||
            "Assigned Officer";
          plan.createdAt = created.createdAt;
        }
      } catch (err) {
        console.warn("Backend createPlan in handleBulkImportPlans note:", err);
      }

      updatedSavedRecords = addSavedPlanRecord(updatedSavedRecords, {
        plan,
        projectCode: selectedProject.code,
      });
    }

    setSavedPlanRecords(updatedSavedRecords);
    window.localStorage.setItem(
      OFFICER_PLAN_DRAFTS_STORAGE_KEY,
      JSON.stringify(updatedSavedRecords),
    );

    await loadData();
  }

  async function handleBulkImportActivities(
    importedActivities: ProcurementActivitySummary[],
  ) {
    if (!selectedProject || !selectedPlan || importedActivities.length === 0)
      return;

    const planRef = selectedPlan.reference;
    let updatedActivityRecords = savedActivityRecords;

    // Resolve or create backend plan
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
        console.warn(
          "Backend createPlan in handleBulkImportActivities note:",
          err,
        );
      }
    }

    for (const activity of importedActivities) {
      updatedActivityRecords = addSavedActivityRecord(updatedActivityRecords, {
        activity,
        planReference: planRef,
        projectCode: selectedProject.code,
      });

      if (targetBackendPlanId) {
        try {
          const methodLabel = activity.method || "RFB - National";
          const resolvedMethodId =
            await resolveProcurementMethodId(methodLabel);

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
                allocationPct: 100,
              },
            ],
          });
        } catch (err) {
          console.warn(
            "Backend createActivity in handleBulkImportActivities note:",
            err,
          );
        }
      }
    }

    setSavedActivityRecords(updatedActivityRecords);
    window.localStorage.setItem(
      OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
      JSON.stringify(updatedActivityRecords),
    );

    // Also update savedPlanRecords with updated activity count and activities
    const currentPlanActivities = selectedPlanActivities.filter(
      (a) =>
        !importedActivities.some(
          (ia) => ia.reference.toLowerCase() === a.reference.toLowerCase(),
        ),
    );
    const combinedActivities = [
      ...currentPlanActivities,
      ...importedActivities,
    ];

    const updatedPlan: ProcurementPlanSummary = {
      ...selectedPlan,
      activities: combinedActivities.length,
      planActivities: combinedActivities,
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

    await loadData();
  }

  if (selectedProject && (mode === "create-plan" || mode === "edit-plan")) {
    return (
      <CreateProcurementPlanView
        key={
          mode === "edit-plan"
            ? selectedPlan?.reference || "edit-plan"
            : "create-plan"
        }
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
    if (
      mode === "edit-activity" &&
      selectedActivityReference &&
      !selectedActivity &&
      isLoadingData
    ) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#176c55] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-700">
            Loading activity details...
          </p>
          <p className="text-[11px] text-slate-400">
            Retrieving saved configuration and roadmap entries
          </p>
        </div>
      );
    }

    return (
      <CreateProcurementActivityView
        key={
          mode === "edit-activity"
            ? selectedActivity?.reference ||
              selectedActivityReference ||
              "edit-activity"
            : "create-activity"
        }
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
        onBulkImportActivities={handleBulkImportActivities}
        onSubmitToDirector={submitPlanToDirector}
        onUpdateActivity={handleActivityUpdated}
        onUpdatePlan={handlePlanUpdated}
        plan={selectedPlan}
        project={selectedProject}
        savedActivities={selectedPlanActivities}
        isSyncedToDatabase={isPlanInBackend}
      />
    );
  }

  if (selectedProject) {
    return (
      <OfficerProjectDetailView
        onImportPlans={handleBulkImportPlans}
        project={selectedProject}
      />
    );
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
                    filteredProjects.map((project, index) => (
                      <tr
                        key={project.id || `${project.code}-${index}`}
                        className="hover:bg-[#f8fbf9]"
                      >
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
                  ) : isLoadingData ? (
                    <tr>
                      <td
                        className="px-4 py-12 text-center text-sm text-slate-500"
                        colSpan={8}
                      >
                        <div className="inline-flex items-center justify-center gap-2.5">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          <span>Loading assigned projects...</span>
                        </div>
                      </td>
                    </tr>
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
    </div>
  );
}
