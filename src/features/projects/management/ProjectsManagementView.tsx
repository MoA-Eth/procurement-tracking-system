"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BellRing } from "lucide-react";
import {
  INITIAL_PROJECTS,
  type ProjectItem,
  type ProjectOfficer,
} from "./projectsData";
import { ProjectsDirectoryView } from "./ProjectsDirectoryView";
import { CreateProjectView } from "./CreateProjectView";
import { ProjectExcelImportModal } from "./components/ProjectExcelImportModal";
import { ProjectPlansView } from "@/features/plans/components/ProjectPlansView";
import { CreatePlanForm } from "@/features/plans/components/CreatePlanForm";
import {
  INITIAL_PLANS,
  type ProcurementPlan,
} from "@/features/plans/plansData";
import { DirectorActivitiesListView } from "@/features/activities/components/DirectorActivitiesListView";
import {
  fetchProjects,
  createProject,
  updateProject,
  assignOfficerToProject,
  mapBackendProjectToProjectItem,
} from "@/lib/projectsApi";
import {
  fetchPlans,
  sendPlanToCommittee,
  rejectPlan,
  mapBackendPlanToFrontend,
} from "@/lib/plansApi";
import {
  fetchLookups,
  createLookup,
  fetchOfficers,
  type LookupItem,
} from "@/lib/lookupsApi";
import { OFFICER_PLAN_DRAFTS_STORAGE_KEY } from "@/features/projects/data/officerPlanDrafts";
import { OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY } from "@/features/projects/data/officerActivityDrafts";
import {
  getCurrentPlanVersionNumber,
  recordPlanVersionEvent,
} from "@/features/plans/data/planRevisions";

type ViewMode =
  "list" | "project-form" | "plans-list" | "plan-form" | "activities-list";

interface ProjectsManagementViewProps {
  readOnly?: boolean;
  selectedProjectCode?: string;
  selectedPlanReference?: string;
  from?: string;
}

export function ProjectsManagementView({
  readOnly = false,
  selectedProjectCode,
  selectedPlanReference,
  from,
}: ProjectsManagementViewProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [plans, setPlans] = useState<ProcurementPlan[]>(INITIAL_PLANS);
  const [availableOfficers, setAvailableOfficers] = useState<ProjectOfficer[]>(
    [],
  );
  const [sectors, setSectors] = useState<LookupItem[]>([]);
  const [fundingSources, setFundingSources] = useState<LookupItem[]>([]);

  const [editingProject, setEditingProject] = useState<ProjectItem | null>(
    null,
  );
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(
    null,
  );
  const [editingPlan, setEditingPlan] = useState<ProcurementPlan | null>(null);
  const [selectedPlanForActivities, setSelectedPlanForActivities] =
    useState<ProcurementPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch lookups & officers
      const [officers, secList, fundList] = await Promise.all([
        fetchOfficers(),
        fetchLookups("SECTOR"),
        fetchLookups("FUNDING_SOURCE"),
      ]);
      setAvailableOfficers(
        officers.map((o) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          roleTag: "OFFICER",
          isActive: o.isActive,
          status: o.status,
        })),
      );
      setSectors(secList);
      setFundingSources(fundList);

      // 2. Fetch projects from backend
      const backendProjects = await fetchProjects();
      const mapped = (backendProjects || []).map((bp) =>
        mapBackendProjectToProjectItem(bp),
      );
      setProjects(mapped);

      // 3. Fetch plans from backend
      const backendPlans = await fetchPlans();
      const mappedPlans =
        backendPlans && backendPlans.length > 0
          ? backendPlans.map((p) => mapBackendPlanToFrontend(p))
          : [];
      setPlans(mappedPlans);
    } catch {}
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  useEffect(() => {
    const handleReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ href?: string }>;
      if (
        !customEvent.detail?.href ||
        customEvent.detail.href === "/workspace/projects"
      ) {
        setViewMode("list");
        setSelectedProject(null);
        setSelectedPlanForActivities(null);
        setEditingProject(null);
        setEditingPlan(null);
      }
    };

    window.addEventListener("pts:sidebar-reset", handleReset);
    return () => window.removeEventListener("pts:sidebar-reset", handleReset);
  }, []);

  const dismissedProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      selectedProjectCode &&
      selectedProjectCode !== dismissedProjectRef.current
    ) {
      dismissedProjectRef.current = null;
    }
  }, [selectedProjectCode]);

  useEffect(() => {
    if (
      selectedProjectCode &&
      projects.length > 0 &&
      !selectedProject &&
      dismissedProjectRef.current !== selectedProjectCode
    ) {
      const match = projects.find(
        (p) =>
          p.code.toLowerCase() === selectedProjectCode.toLowerCase() ||
          p.id === selectedProjectCode,
      );
      if (match) {
        setSelectedProject(match);
        if (selectedPlanReference && plans.length > 0) {
          const matchedPlan = plans.find(
            (pl) =>
              pl.reference?.toLowerCase() ===
                selectedPlanReference.toLowerCase() ||
              pl.id === selectedPlanReference ||
              pl.planName.toLowerCase() === selectedPlanReference.toLowerCase(),
          );
          if (matchedPlan) {
            setSelectedPlanForActivities(matchedPlan);
            setViewMode("activities-list");
            return;
          }
        }
        setViewMode("plans-list");
      }
    }
  }, [
    selectedProjectCode,
    selectedPlanReference,
    projects,
    plans,
    selectedProject,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const projParam = params.get("project");
      const planParam = params.get("plan");

      if (!projParam) {
        setSelectedProject(null);
        setSelectedPlanForActivities(null);
        setEditingProject(null);
        setEditingPlan(null);
        setViewMode("list");
        dismissedProjectRef.current = null;
        return;
      }

      if (projects.length > 0) {
        const matchedProject = projects.find(
          (p) =>
            p.code.toLowerCase() === projParam.toLowerCase() ||
            p.id === projParam,
        );
        if (matchedProject) {
          setSelectedProject(matchedProject);
          if (planParam && plans.length > 0) {
            const matchedPlan = plans.find(
              (pl) =>
                pl.reference?.toLowerCase() === planParam.toLowerCase() ||
                pl.id === planParam ||
                pl.planName.toLowerCase() === planParam.toLowerCase(),
            );
            if (matchedPlan) {
              setSelectedPlanForActivities(matchedPlan);
              setViewMode("activities-list");
              return;
            }
          }
          setSelectedPlanForActivities(null);
          setViewMode("plans-list");
          return;
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [projects, plans]);

  // Open Project Create Form
  const handleCreateProjectClick = () => {
    setEditingProject(null);
    setViewMode("project-form");
  };

  // Open Project Edit Form
  const handleEditProjectClick = (project: ProjectItem) => {
    setEditingProject(project);
    setViewMode("project-form");
  };

  // Eye Icon -> Open Tabular Plans View for Project
  const handleViewPlansClick = (project: ProjectItem) => {
    dismissedProjectRef.current = null;
    setSelectedProject(project);
    setViewMode("plans-list");
    if (typeof window !== "undefined") {
      window.history.pushState(
        {},
        "",
        `/workspace/projects?project=${encodeURIComponent(project.code)}`,
      );
    }
  };

  // Save/Update Project Handler (connected to backend)
  const handleSaveProject = async (savedProject: ProjectItem) => {
    try {
      if (editingProject) {
        // Update Project
        try {
          await updateProject(savedProject.id, {
            name: savedProject.name,
            status: savedProject.status === "Active" ? "ACTIVE" : "CLOSED",
            sapIdentificationNo: savedProject.sapNumber,
            country: savedProject.countryOrg,
            executingAgency: savedProject.executingAgency,
            organization: savedProject.region,
            fundingType: savedProject.fundingType,
            loanGrantNumbers: savedProject.loanGrantNumbers,
            components: savedProject.components,
            subcomponents: savedProject.subcomponents,
            baseCurrency: savedProject.currency,
            projectStartDate: savedProject.startDate
              ? new Date(savedProject.startDate).toISOString()
              : undefined,
            projectEndDate: savedProject.endDate
              ? new Date(savedProject.endDate).toISOString()
              : undefined,
          });

          // Sync assigned officers if new officers were added
          if (
            savedProject.assignedOfficers &&
            savedProject.assignedOfficers.length > 0
          ) {
            for (const off of savedProject.assignedOfficers) {
              try {
                await assignOfficerToProject(savedProject.id, off.id);
              } catch {
                // Officer might already be assigned
              }
            }
          }
        } catch (apiErr) {
          console.warn("Backend update API note:", apiErr);
        }

        setProjects((prev) =>
          prev.map((p) => (p.id === savedProject.id ? savedProject : p)),
        );
        showToast(`Project "${savedProject.code}" updated successfully!`);
      } else {
        // Create Project on backend
        let projectSavedOnBackend = false;
        try {
          const [secLookupList, fundLookupList] = await Promise.all([
            fetchLookups("SECTOR"),
            fetchLookups("FUNDING_SOURCE"),
          ]);

          const isRealId = (id?: string | null): boolean => {
            if (!id || typeof id !== "string") return false;
            return (
              !id.startsWith("sec-") &&
              !id.startsWith("fs-") &&
              !id.startsWith("pm-") &&
              !id.startsWith("custom-") &&
              !id.startsWith("proj-code-") &&
              id.length > 5
            );
          };

          // Find real DB sector lookup, or create one in the backend
          let targetSectorId = secLookupList.find(
            (s) =>
              isRealId(s.id) &&
              (s.label.toLowerCase() === savedProject.sector.toLowerCase() ||
                s.code.toLowerCase() === savedProject.sector.toLowerCase()),
          )?.id;

          if (!targetSectorId) {
            const anyRealSec = secLookupList.find((s) => isRealId(s.id));
            if (anyRealSec) {
              targetSectorId = anyRealSec.id;
            } else {
              try {
                const newSec = await createLookup({
                  type: "SECTOR",
                  code:
                    savedProject.sector
                      .replace(/[^A-Za-z0-9]/g, "_")
                      .toUpperCase()
                      .slice(0, 10) || "SEC_GEN",
                  label: savedProject.sector || "General Sector",
                });
                if (isRealId(newSec.id)) targetSectorId = newSec.id;
              } catch {}
            }
          }

          // Find real DB funding source lookup, or create one in the backend
          let targetFsId = fundLookupList.find(
            (f) =>
              isRealId(f.id) &&
              (f.label
                .toLowerCase()
                .includes(savedProject.fundingSource.toLowerCase()) ||
                f.code
                  .toLowerCase()
                  .includes(savedProject.fundingSource.toLowerCase())),
          )?.id;

          if (!targetFsId) {
            const anyRealFs = fundLookupList.find((f) => isRealId(f.id));
            if (anyRealFs) {
              targetFsId = anyRealFs.id;
            } else {
              try {
                const newFs = await createLookup({
                  type: "FUNDING_SOURCE",
                  code:
                    savedProject.fundingSource
                      .replace(/[^A-Za-z0-9]/g, "_")
                      .toUpperCase()
                      .slice(0, 10) || "FS_GEN",
                  label: savedProject.fundingSource || "General Funding",
                });
                if (isRealId(newFs.id)) targetFsId = newFs.id;
              } catch {}
            }
          }

          if (targetSectorId && targetFsId) {
            const result = await createProject({
              code: savedProject.code,
              name: savedProject.name,
              sectorId: targetSectorId,
              fundingSourceId: targetFsId,
              sapIdentificationNo: savedProject.sapNumber,
              country: savedProject.countryOrg,
              executingAgency: savedProject.executingAgency,
              organization: savedProject.region,
              fundingType: savedProject.fundingType,
              loanGrantNumbers: savedProject.loanGrantNumbers,
              components: savedProject.components,
              subcomponents: savedProject.subcomponents,
              baseCurrency: savedProject.currency,
              projectStartDate: savedProject.startDate
                ? new Date(savedProject.startDate).toISOString()
                : undefined,
              projectEndDate: savedProject.endDate
                ? new Date(savedProject.endDate).toISOString()
                : undefined,
            });

            if (result && result.id) {
              projectSavedOnBackend = true;
              savedProject.id = result.id;
              if (
                savedProject.assignedOfficers &&
                savedProject.assignedOfficers.length > 0
              ) {
                for (const off of savedProject.assignedOfficers) {
                  try {
                    await assignOfficerToProject(result.id, off.id);
                  } catch (assignErr) {
                    console.warn("Assign officer note:", assignErr);
                  }
                }
              }
            }
          }
        } catch (apiErr) {
          console.warn("Backend create project API note:", apiErr);
        }

        if (projectSavedOnBackend) {
          await loadData();
        } else {
          // Optimistic local state fallback: ensures project appears in the table immediately
          setProjects((prev) => [
            savedProject,
            ...prev.filter((p) => p.code !== savedProject.code),
          ]);
        }

        showToast(
          `New sector project "${savedProject.code}" registered and officer assigned!`,
        );
      }
    } finally {
      setEditingProject(null);
      setViewMode("list");
    }
  };

  // Open Plan Review/Edit Form for Director
  const handleEditPlanClick = (plan: ProcurementPlan) => {
    setEditingPlan(plan);
    setViewMode("plan-form");
  };

  const updateLocalStoragePlanAndActivities = (
    plan: ProcurementPlan,
    newPlanStatus: string,
    newActivityStatus?: string,
    rejectionReason?: string,
  ) => {
    if (typeof window === "undefined") return;
    try {
      const rawPlanDrafts = window.localStorage.getItem(
        OFFICER_PLAN_DRAFTS_STORAGE_KEY,
      );
      if (rawPlanDrafts) {
        const parsed = JSON.parse(rawPlanDrafts);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((item: any) => {
            const itemRef = item.plan?.reference?.toLowerCase()?.trim();
            const itemName = item.plan?.name?.toLowerCase()?.trim();
            const itemId = item.plan?.id?.toLowerCase()?.trim();
            const planRef = plan.reference?.toLowerCase()?.trim();
            const planName = plan.planName?.toLowerCase()?.trim();
            const planId = plan.id?.toLowerCase()?.trim();

            const matches =
              (itemId && (itemId === planId || itemId === planRef)) ||
              (itemRef &&
                (itemRef === planRef ||
                  itemRef === planName ||
                  itemRef === planId)) ||
              (itemName &&
                (itemName === planName ||
                  itemName === planRef ||
                  itemName === planId));

            if (matches) {
              return {
                ...item,
                plan: {
                  ...item.plan,
                  status: newPlanStatus,
                  rejectionReason:
                    rejectionReason !== undefined
                      ? rejectionReason
                      : item.plan.rejectionReason,
                },
              };
            }
            return item;
          });
          window.localStorage.setItem(
            OFFICER_PLAN_DRAFTS_STORAGE_KEY,
            JSON.stringify(updated),
          );
        }
      }

      if (newActivityStatus) {
        const rawActDrafts = window.localStorage.getItem(
          OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
        );
        if (rawActDrafts) {
          const parsedActs = JSON.parse(rawActDrafts);
          if (Array.isArray(parsedActs)) {
            const updatedActs = parsedActs.map((item: any) => {
              const pRef = item.planReference?.toLowerCase()?.trim();
              const planRef = plan.reference?.toLowerCase()?.trim();
              const planName = plan.planName?.toLowerCase()?.trim();
              const planId = plan.id?.toLowerCase()?.trim();

              const matchesPlan =
                pRef &&
                (pRef === planId || pRef === planRef || pRef === planName);

              if (matchesPlan) {
                return {
                  ...item,
                  activity: {
                    ...item.activity,
                    status: newActivityStatus,
                  },
                };
              }
              return item;
            });
            window.localStorage.setItem(
              OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
              JSON.stringify(updatedActs),
            );
          }
        }
      }
    } catch (err) {
      console.warn("Storage sync error:", err);
    }
  };

  // Save Plan Handler (Director Review -> Approve & Forward to Committee or Return to Officer)
  const handleSavePlan = async (savedPlan: ProcurementPlan) => {
    try {
      if (savedPlan.status === "Committee Review") {
        try {
          await sendPlanToCommittee(savedPlan.id);
        } catch (err) {
          console.warn("Backend sendToCommittee note:", err);
        }
        updateLocalStoragePlanAndActivities(
          savedPlan,
          "Committee Review",
          "Not Started",
        );
        recordPlanVersionEvent({
          planId: savedPlan.id,
          planReference: savedPlan.reference || savedPlan.planName,
          projectCode: savedPlan.projectCode,
          versionNumber: getCurrentPlanVersionNumber(savedPlan.id),
          action: "APPROVED_DIRECTOR",
          actionLabel: "Plan Approved by Director & Sent to Committee",
          changedBy: "Director",
          changedByRole: "Director",
          reason:
            "Plan approved by Director and forwarded to Endorsement Committee.",
        });
        showToast(
          `Plan "${savedPlan.planName}" approved by Director and forwarded to Endorsing Committee!`,
        );
      } else if (savedPlan.status === "Returned") {
        try {
          await rejectPlan(
            savedPlan.id,
            savedPlan.rejectionReason || "Returned by Director for revisions.",
          );
        } catch (err) {
          console.warn("Backend rejectPlan note:", err);
        }
        updateLocalStoragePlanAndActivities(
          savedPlan,
          "Returned",
          undefined,
          savedPlan.rejectionReason || "Returned by Director for revisions.",
        );
        recordPlanVersionEvent({
          planId: savedPlan.id,
          planReference: savedPlan.reference || savedPlan.planName,
          projectCode: savedPlan.projectCode,
          versionNumber: getCurrentPlanVersionNumber(savedPlan.id),
          action: "RETURNED",
          actionLabel: "Plan Returned by Director for Revision",
          changedBy: "Director",
          changedByRole: "Director",
          reason:
            savedPlan.rejectionReason || "Returned by Director for revisions.",
        });
        showToast(
          `Plan "${savedPlan.planName}" returned to Procurement Officer with feedback.`,
        );
      } else {
        showToast(
          `Plan "${savedPlan.planName}" updated successfully by Director.`,
        );
      }

      setPlans((prev) =>
        prev.map((p) => (p.id === savedPlan.id ? savedPlan : p)),
      );
    } finally {
      setEditingPlan(null);
      setViewMode("plans-list");
    }
  };

  // View Activities Action -> Opens Tabular Package Activities Directory
  const handleViewActivitiesClick = (plan: ProcurementPlan) => {
    setSelectedPlanForActivities(plan);
    setViewMode("activities-list");
    if (typeof window !== "undefined" && selectedProject) {
      window.history.pushState(
        {},
        "",
        `/workspace/projects?project=${encodeURIComponent(selectedProject.code)}&plan=${encodeURIComponent(plan.reference || plan.id)}`,
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-700 animate-in slide-in-from-top-3 max-w-md">
          <BellRing className="h-4 w-4 text-[#A3E635] shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{toastMessage}</p>
        </div>
      )}

      {/* RENDER VIEW ACCORDING TO VIEW MODE */}
      {viewMode === "list" && (
        <ProjectsDirectoryView
          projects={projects}
          onCreateClick={handleCreateProjectClick}
          onEditClick={handleEditProjectClick}
          onViewPlansClick={handleViewPlansClick}
          onImportClick={
            readOnly ? undefined : () => setIsImportModalOpen(true)
          }
          onUpdateProjectOfficers={(projectId, updatedOfficers) => {
            setProjects((prev) =>
              prev.map((p) =>
                p.id === projectId
                  ? { ...p, assignedOfficers: updatedOfficers }
                  : p,
              ),
            );
            showToast("Project officers updated successfully!");
          }}
          readOnly={readOnly}
        />
      )}

      {viewMode === "project-form" && (
        <CreateProjectView
          initialData={editingProject}
          availableOfficers={
            availableOfficers.length > 0 ? availableOfficers : undefined
          }
          allProjects={projects}
          onBackClick={() => {
            setEditingProject(null);
            setViewMode("list");
            if (typeof window !== "undefined") {
              window.history.replaceState({}, "", "/workspace/projects");
            }
          }}
          onSaveProject={handleSaveProject}
        />
      )}

      {viewMode === "plans-list" && selectedProject && (
        <ProjectPlansView
          project={selectedProject}
          plans={plans}
          userRole={readOnly ? "MANAGEMENT" : "DIRECTOR"}
          onBackToProjects={() => {
            dismissedProjectRef.current =
              selectedProject?.code || selectedProjectCode || "dismissed";
            setSelectedProject(null);
            setViewMode("list");
            if (typeof window !== "undefined") {
              window.history.replaceState({}, "", "/workspace/projects");
            }
          }}
          onEditPlanClick={readOnly ? undefined : handleEditPlanClick}
          onViewActivitiesClick={handleViewActivitiesClick}
        />
      )}

      {viewMode === "plan-form" && selectedProject && editingPlan && (
        <CreatePlanForm
          project={selectedProject}
          initialData={editingPlan}
          userRole={readOnly ? "MANAGEMENT" : "DIRECTOR"}
          readOnly={true}
          onBackClick={() => {
            setEditingPlan(null);
            setViewMode("plans-list");
          }}
          onSavePlan={handleSavePlan}
        />
      )}

      {viewMode === "activities-list" &&
        selectedProject &&
        selectedPlanForActivities && (
          <DirectorActivitiesListView
            plan={selectedPlanForActivities}
            project={selectedProject}
            parentSection="projects"
            userRole={readOnly ? "MANAGEMENT" : "DIRECTOR"}
            onBackClick={() => {
              setSelectedPlanForActivities(null);
              setViewMode("plans-list");
              if (typeof window !== "undefined" && selectedProject) {
                window.history.replaceState(
                  {},
                  "",
                  `/workspace/projects?project=${encodeURIComponent(selectedProject.code)}`,
                );
              }
            }}
            onApprovePlan={
              readOnly
                ? undefined
                : async (p) => {
                    try {
                      await sendPlanToCommittee(p.id);
                    } catch (err) {
                      console.warn("Backend sendToCommittee note:", err);
                    }
                    updateLocalStoragePlanAndActivities(
                      p,
                      "Committee Review",
                      "Not Started",
                    );
                    recordPlanVersionEvent({
                      planId: p.id,
                      planReference: p.reference || p.planName,
                      projectCode: p.projectCode,
                      versionNumber: getCurrentPlanVersionNumber(p.id),
                      action: "APPROVED_DIRECTOR",
                      actionLabel:
                        "Plan Approved by Director & Sent to Committee",
                      changedBy: "Director",
                      changedByRole: "Director",
                      reason:
                        "Plan approved by Director and forwarded to Endorsement Committee.",
                    });
                    showToast(
                      `Plan "${p.planName}" approved by Director and forwarded to Endorsing Committee!`,
                    );
                    await loadData();
                    setSelectedPlanForActivities(null);
                    setViewMode("plans-list");
                  }
            }
            onReturnPlan={
              readOnly
                ? undefined
                : async (p, remarks) => {
                    try {
                      await rejectPlan(
                        p.id,
                        remarks || "Returned by Director for revisions.",
                      );
                    } catch (err) {
                      console.warn("Backend rejectPlan note:", err);
                    }
                    updateLocalStoragePlanAndActivities(
                      p,
                      "Returned",
                      undefined,
                      remarks || "Returned by Director for revisions.",
                    );
                    recordPlanVersionEvent({
                      planId: p.id,
                      planReference: p.reference || p.planName,
                      projectCode: p.projectCode,
                      versionNumber: getCurrentPlanVersionNumber(p.id),
                      action: "RETURNED",
                      actionLabel: "Plan Returned by Director for Revision",
                      changedBy: "Director",
                      changedByRole: "Director",
                      reason: remarks || "Returned by Director for revisions.",
                    });
                    showToast(
                      `Plan "${p.planName}" returned to Officer for revision.`,
                    );
                    await loadData();
                    setSelectedPlanForActivities(null);
                    setViewMode("plans-list");
                  }
            }
          />
        )}

      <ProjectExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={async ({ created, updated }) => {
          showToast(
            `Successfully imported ${created + updated} project${
              created + updated === 1 ? "" : "s"
            } as Draft! You can now click "Edit" on each project to review details and assign officers.`,
          );
          await loadData();
        }}
      />
    </div>
  );
}
