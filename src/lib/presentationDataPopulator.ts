import { apiClient, directApiFetch, BACKEND_API_URL } from "./apiClient";
import { authTokenManager } from "./authTokenManager";
import {
  fetchProjects,
  createProject,
  deleteProject,
  assignOfficerToProject,
  type BackendProject,
} from "./projectsApi";
import { fetchPlans, deletePlan, type BackendPlan } from "./plansApi";
import { deleteActivity, fetchActivities } from "./activitiesApi";
import { fetchContracts } from "./contractsApi";

async function fetchUserToken(
  email: string,
  password: string,
): Promise<string | null> {
  try {
    const res = await directApiFetch<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        identifier: email.trim().toLowerCase(),
        password,
      }),
      skipAuth: true,
    });
    const data = res?.data || res;
    return (
      data?.tokens?.accessToken ||
      data?.sessionToken ||
      data?.accessToken ||
      null
    );
  } catch {
    return null;
  }
}

export const PRESENTATION_DIRECTOR = {
  email: "fikreyealemzewd@gmail.com",
  password: "Password123!",
};

export const PRESENTATION_OFFICER = {
  email: "betiytes@gmail.com",
};

export interface PopulateProgress {
  message: string;
  percent: number;
  completed?: boolean;
  error?: string;
}

export interface PopulateOptions {
  cleanPreviousProjects?: boolean;
  directorEmail?: string;
  directorPassword?: string;
  officerEmail?: string;
  loginAsDirectorAfter?: boolean;
}

const isRealDbId = (id?: string | null): boolean => {
  if (!id || typeof id !== "string") return false;
  if (
    id.startsWith("sec-") ||
    id.startsWith("fs-") ||
    id.startsWith("pm-") ||
    id.startsWith("custom-") ||
    id.startsWith("proj-code-") ||
    id.startsWith("off-") ||
    id.startsWith("sup-")
  ) {
    return false;
  }
  return id.length > 5;
};

export async function populatePresentationData(
  onProgressOrOptions?:
    ((progress: PopulateProgress) => void) | PopulateOptions,
  maybeOnProgress?: (progress: PopulateProgress) => void,
): Promise<{ success: boolean; summary: string }> {
  const options: PopulateOptions =
    typeof onProgressOrOptions === "object" && onProgressOrOptions !== null
      ? onProgressOrOptions
      : {};
  const onProgress =
    typeof onProgressOrOptions === "function"
      ? onProgressOrOptions
      : maybeOnProgress;

  const update = (message: string, percent: number) => {
    if (onProgress) {
      onProgress({ message, percent });
    }
  };

  const directorEmail = options.directorEmail || PRESENTATION_DIRECTOR.email;
  const directorPassword =
    options.directorPassword || PRESENTATION_DIRECTOR.password;
  const targetOfficerEmail = options.officerEmail || PRESENTATION_OFFICER.email;
  const cleanPrevious = options.cleanPreviousProjects !== false;

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // Step 0: Connectivity & Health Ping
    // ──────────────────────────────────────────────────────────────────────────
    update("Connecting to deployed backend at Render...", 5);

    let pingSuccess = false;
    let lastPingError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await apiClient.get("/lookups", { skipAuth: true });
        pingSuccess = true;
        break;
      } catch (err: any) {
        lastPingError = err;
        update(
          `Waking up Render backend (attempt ${attempt}/3)...`,
          5 + attempt * 2,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!pingSuccess && lastPingError) {
      const errMsg = lastPingError?.message || "Failed to fetch";
      throw new Error(
        `Unable to reach backend at ${BACKEND_API_URL} (${errMsg}). ` +
          `The Render service may still be spinning up. Please wait 30 seconds and try again.`,
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 0.5: Ensure valid Director token without resetting browser session
    // ──────────────────────────────────────────────────────────────────────────
    update(`Authenticating as Director (${directorEmail})...`, 10);
    let directorToken = authTokenManager.getToken();
    if (!directorToken) {
      directorToken = await fetchUserToken(directorEmail, directorPassword);
      if (directorToken) {
        authTokenManager.setToken(directorToken);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 0.8: Clean up previous unowned / stale projects if requested
    // ──────────────────────────────────────────────────────────────────────────
    if (cleanPrevious) {
      update(
        "Deleting previous unowned projects and resetting workspace...",
        15,
      );
      try {
        const staleProjects = await fetchProjects();
        const stalePlans = await fetchPlans();

        for (const sp of staleProjects) {
          if (!isRealDbId(sp.id)) continue;
          // Clean up plans and activities first to preserve foreign key constraints
          const relatedPlans = stalePlans.filter(
            (pl) => pl.projectId === sp.id || (pl as any).project?.id === sp.id,
          );
          for (const rp of relatedPlans) {
            try {
              const acts = await fetchActivities(rp.id);
              for (const a of acts) {
                try {
                  await deleteActivity(a.id);
                } catch {}
              }
              await deletePlan(rp.id);
            } catch {}
          }

          // Delete the project
          try {
            await deleteProject(sp.id);
            console.log(`Deleted previous project: ${sp.code || sp.id}`);
          } catch (delErr) {
            console.warn(
              `Notice deleting project ${sp.code || sp.id}:`,
              delErr,
            );
          }
        }
      } catch (cleanErr) {
        console.warn("Cleanup step notice:", cleanErr);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Ensure Real Database Lookups (Sectors, Funding Sources, Methods)
    // ──────────────────────────────────────────────────────────────────────────
    update("Initializing database lookup records...", 12);

    let rawDbLookups: any[] = [];
    try {
      const lookupsRes = await apiClient.get<any>("/lookups");
      rawDbLookups = Array.isArray(lookupsRes)
        ? lookupsRes
        : lookupsRes?.data || [];
    } catch (lErr) {
      console.warn("Could not fetch existing lookups:", lErr);
    }

    const ensureRealLookup = async (
      type: string,
      code: string,
      label: string,
    ): Promise<string | null> => {
      const existing = rawDbLookups.find(
        (l) =>
          l.type === type &&
          (l.code?.toUpperCase() === code.toUpperCase() ||
            l.label?.toLowerCase() === label.toLowerCase()) &&
          isRealDbId(l.id),
      );
      if (existing?.id) {
        return existing.id;
      }

      try {
        const res = await apiClient.post<any>("/lookups", {
          type,
          code: code.toUpperCase(),
          label,
        });
        const realId = res?.data?.id || res?.id;
        if (isRealDbId(realId)) {
          rawDbLookups.push({
            id: realId,
            type,
            code: code.toUpperCase(),
            label,
          });
          return realId;
        }
      } catch (postErr: any) {
        console.warn(
          `Notice creating lookup ${type}:${code}:`,
          postErr?.data || postErr?.message,
        );
      }
      return null;
    };

    const secAgriId = await ensureRealLookup(
      "SECTOR",
      "SEC_AGRI",
      "Agriculture & Livestock",
    );
    const secHortId = await ensureRealLookup(
      "SECTOR",
      "SEC_HORT",
      "Horticulture & Seed Development",
    );
    const secNatId = await ensureRealLookup(
      "SECTOR",
      "SEC_NAT",
      "Natural Resources & Irrigation",
    );

    const fsWbId = await ensureRealLookup(
      "FUNDING_SOURCE",
      "FS_WB",
      "World Bank (IDA)",
    );
    const fsAfdbId = await ensureRealLookup(
      "FUNDING_SOURCE",
      "FS_AFDB",
      "African Development Bank (AfDB)",
    );
    const fsGovId = await ensureRealLookup(
      "FUNDING_SOURCE",
      "FS_GOV",
      "Government of Ethiopia (Treasury)",
    );

    const pmNcbId = await ensureRealLookup(
      "PROCUREMENT_METHOD",
      "PM_NCB",
      "National Competitive Bidding (NCB)",
    );
    const pmRfqId = await ensureRealLookup(
      "PROCUREMENT_METHOD",
      "PM_RFQ",
      "Request for Quotations (RFQ)",
    );
    const pmQcbsId = await ensureRealLookup(
      "PROCUREMENT_METHOD",
      "PM_QCBS",
      "Quality and Cost-Based Selection (QCBS)",
    );

    const anyRealSectorId =
      secAgriId ||
      secHortId ||
      secNatId ||
      rawDbLookups.find((l) => l.type === "SECTOR" && isRealDbId(l.id))?.id;

    const anyRealFsId =
      fsWbId ||
      fsAfdbId ||
      fsGovId ||
      rawDbLookups.find((l) => l.type === "FUNDING_SOURCE" && isRealDbId(l.id))
        ?.id;

    const anyRealMethodId =
      pmNcbId ||
      pmRfqId ||
      pmQcbsId ||
      rawDbLookups.find(
        (l) => l.type === "PROCUREMENT_METHOD" && isRealDbId(l.id),
      )?.id;

    if (!anyRealSectorId || !anyRealFsId) {
      throw new Error(
        "Could not obtain valid database Sector or Funding Source IDs. " +
          "Please check your backend permissions to create lookups or ensure the database has lookups configured.",
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 2: Target Real Database Users (including betiytes@gmail.com & current user)
    // ──────────────────────────────────────────────────────────────────────────
    update(
      "Identifying active officer (betiytes@gmail.com) and database users...",
      20,
    );

    let existingUsers: any[] = [];
    try {
      const uRes = await apiClient.get<any>("/users");
      existingUsers = Array.isArray(uRes) ? uRes : uRes?.data || [];
    } catch {}

    // Also search specifically for betiytes@gmail.com if not in first page
    let betiOfficer = existingUsers.find(
      (u) => u.email?.toLowerCase().trim() === "betiytes@gmail.com",
    );

    if (!betiOfficer) {
      try {
        const sRes = await apiClient.get<any>("/users", {
          params: { search: "betiytes" },
        });
        const list = Array.isArray(sRes) ? sRes : sRes?.data || [];
        const found = list.find((u: any) =>
          u.email?.toLowerCase().includes("betiytes"),
        );
        if (found) {
          betiOfficer = found;
          existingUsers.push(found);
        }
      } catch {}
    }

    // Identify current user session
    let currentUserSession: any = null;
    try {
      const s = await apiClient.get<any>("/auth/session").catch(() => null);
      currentUserSession = s?.user || null;
    } catch {}

    // Find any existing real Committee / Director / Management users in the database
    const committeeMember1 = existingUsers.find(
      (u) =>
        (u.role === "ENDORSING_COMMITTEE" ||
          u.role === "EndorsingCommittee" ||
          u.role === "COMMITTEE" ||
          u.authRole === "ENDORSING_COMMITTEE") &&
        isRealDbId(u.id),
    );
    const committeeMember2 = existingUsers.filter(
      (u) =>
        (u.role === "ENDORSING_COMMITTEE" ||
          u.role === "EndorsingCommittee" ||
          u.role === "COMMITTEE" ||
          u.authRole === "ENDORSING_COMMITTEE") &&
        isRealDbId(u.id),
    )[1];

    const officerIdsToAssign = new Set<string>();
    if (betiOfficer?.id) {
      officerIdsToAssign.add(betiOfficer.id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 3: Ensure Real Suppliers exist
    // ──────────────────────────────────────────────────────────────────────────
    update("Registering verified Ethiopian suppliers...", 30);

    let supplierId = "";
    try {
      const suppliers = await apiClient.get<any[]>("/suppliers");
      const list = Array.isArray(suppliers)
        ? suppliers
        : (suppliers as any)?.data || [];
      const realSup = list.find((s: any) => isRealDbId(s.id));
      if (realSup) {
        supplierId = realSup.id;
      }
    } catch {}

    if (!supplierId) {
      try {
        const supRes = await apiClient.post<any>("/suppliers", {
          name: "Ethiopian Agricultural Equipment Enterprise",
          tinNumber: "0029384711",
          email: "contact@eaee.gov.et",
          phone: "+251 11 551 2345",
          address: "Bole Sub-City, Addis Ababa",
        });
        const createdSupId = supRes?.data?.id || supRes?.id;
        if (isRealDbId(createdSupId)) {
          supplierId = createdSupId;
        }
      } catch (supErr) {
        console.warn("Supplier creation note:", supErr);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 4: Create Presentation Projects & Assign Officers
    // ──────────────────────────────────────────────────────────────────────────
    update(
      "Creating strategic Ministry of Agriculture projects & assigning officers...",
      45,
    );

    const existingProjects = await fetchProjects();
    const projectMap: Record<string, BackendProject> = {};
    for (const p of existingProjects) {
      if (p.code && isRealDbId(p.id)) {
        projectMap[p.code.toUpperCase()] = p;
      }
    }

    const projectsToCreate = [
      {
        code: "DRIVE",
        name: "De-risking, Inclusion and Value Enhancement of Pastoral Economies Project",
        sectorId: secAgriId || anyRealSectorId,
        fundingSourceId: fsWbId || anyRealFsId,
        sapIdentificationNo: "P176517",
        country: "Ethiopia",
        executingAgency: "Ministry of Agriculture (MoA)",
        organization: "FPCU / Federal",
        fundingType: "Loan / Grant",
        loanGrantNumbers: ["IDA-71280-ET", "IDA-D9980-ET"],
        components: [
          "Component 1: Financial Inclusion & De-risking Pastoralists",
          "Component 2: Livestock Value Chain & Trade Infrastructure",
          "Component 3: Project Coordination & Institutional Capacity",
        ],
        subcomponents: [
          "1.1 Index-Based Insurance (IBLI)",
          "1.2 Pastoral Savings & Credit Mobilization",
          "2.1 Quarantine Facilities & Market Centers",
        ],
        baseCurrency: "USD",
        projectStartDate: new Date("2023-01-01").toISOString(),
        projectEndDate: new Date("2028-12-31").toISOString(),
      },
      {
        code: "BREFONS",
        name: "Building Resilience for Food and Nutrition Security in the Horn of Africa",
        sectorId: secNatId || anyRealSectorId,
        fundingSourceId: fsAfdbId || anyRealFsId,
        sapIdentificationNo: "P-Z1-C00-072",
        country: "Ethiopia",
        executingAgency: "Ministry of Agriculture (MoA)",
        organization: "Somali & Afar Pastoral Regions",
        fundingType: "Loan",
        loanGrantNumbers: ["ADF-2100155041"],
        components: [
          "Component 1: Water Infrastructure & Rangeland Restoration",
          "Component 2: Feed & Fodder Value Chain",
          "Component 3: Animal Health & Disease Surveillance",
        ],
        subcomponents: [
          "1.1 Micro-Dams & Water Harvesting",
          "2.1 Fodder Banks & Seed Reserves",
        ],
        baseCurrency: "ETB",
        projectStartDate: new Date("2022-07-01").toISOString(),
        projectEndDate: new Date("2027-06-30").toISOString(),
      },
      {
        code: "CALM",
        name: "Climate Action through Landscape Management Program",
        sectorId: secHortId || anyRealSectorId,
        fundingSourceId: fsWbId || anyRealFsId,
        sapIdentificationNo: "P170384",
        country: "Ethiopia",
        executingAgency: "Ministry of Agriculture (MoA)",
        organization: "Amhara, Oromia & Tigray",
        fundingType: "Grant",
        loanGrantNumbers: ["IDA-D4670-ET"],
        components: [
          "Component 1: Watershed Management & Soil Conservation",
          "Component 2: Land Administration & Secure Rural Tenure",
        ],
        baseCurrency: "ETB",
        projectStartDate: new Date("2021-09-01").toISOString(),
        projectEndDate: new Date("2026-08-31").toISOString(),
      },
      {
        code: "RLLP",
        name: "Resilient Landscapes and Livelihoods Project (Treasury Co-Financing)",
        sectorId: secNatId || anyRealSectorId,
        fundingSourceId: fsGovId || anyRealFsId,
        country: "Ethiopia",
        executingAgency: "Ministry of Agriculture (MoA)",
        organization: "FPCU / Federal",
        fundingType: "Treasury",
        loanGrantNumbers: ["ET-GOV-2024"],
        components: ["Component 1: Integrated Landscape Management"],
        baseCurrency: "ETB",
        projectStartDate: new Date("2024-01-01").toISOString(),
        projectEndDate: new Date("2026-12-31").toISOString(),
      },
    ];

    let lastProjectError: any = null;
    for (const pData of projectsToCreate) {
      if (!projectMap[pData.code]) {
        try {
          const created = await createProject(pData as any);
          if (created && created.id) {
            projectMap[pData.code] = created;
          }
        } catch (err: any) {
          lastProjectError = err;
          console.warn(`Project creation notice for ${pData.code}:`, {
            status: err?.status,
            data: err?.data,
            message: err?.message,
          });

          try {
            const minimalCreated = await createProject({
              code: pData.code,
              name: pData.name,
              sectorId: pData.sectorId,
              fundingSourceId: pData.fundingSourceId,
              baseCurrency: pData.baseCurrency || "ETB",
            } as any);
            if (minimalCreated && minimalCreated.id) {
              projectMap[pData.code] = minimalCreated;
            }
          } catch (minErr) {
            console.warn(
              `Minimal project creation attempt failed for ${pData.code}:`,
              minErr,
            );
          }
        }
      }
    }

    const allProjects = (await fetchProjects()).filter((p) => isRealDbId(p.id));
    if (allProjects.length === 0) {
      const errDetails =
        lastProjectError?.data?.message ||
        lastProjectError?.message ||
        "Foreign key or database constraint error";
      throw new Error(
        `Unable to create projects on the backend. Server response: "${errDetails}".`,
      );
    }

    // Assign Officer to projects safely so they appear in Officer Dashboard
    if (officerIdsToAssign.size > 0) {
      for (const proj of allProjects) {
        const existingMemberIds = new Set(
          (proj.members || []).map((m: any) => m.userId || m.user?.id),
        );
        for (const offId of officerIdsToAssign) {
          if (!existingMemberIds.has(offId)) {
            try {
              await assignOfficerToProject(proj.id, offId);
            } catch (aErr) {
              console.warn(
                `Notice assigning officer to ${proj.code || proj.id}:`,
                aErr,
              );
            }
          }
        }
      }
    }

    const driveProject =
      allProjects.find((p) => p.code === "DRIVE") || allProjects[0];
    const brefonsProject =
      allProjects.find((p) => p.code === "BREFONS") ||
      allProjects[1] ||
      driveProject;
    const calmProject =
      allProjects.find((p) => p.code === "CALM") ||
      allProjects[2] ||
      driveProject;

    // ──────────────────────────────────────────────────────────────────────────
    // Step 5: Create Multi-Year Annual Procurement Plans & Advance Workflows
    // ──────────────────────────────────────────────────────────────────────────
    update(
      "Configuring plans across Officer, Director, Committee & Management stages...",
      60,
    );

    const existingPlans = await fetchPlans();
    const planTitleSet = new Set(
      existingPlans.map((pl) => pl.title?.toLowerCase()).filter(Boolean),
    );

    const plansToCreate: any[] = [];

    if (driveProject?.id) {
      plansToCreate.push(
        {
          projectId: driveProject.id,
          title: "2019 EFY DRIVE - Goods & Equipment Annual Plan",
          budgetYear: "2019 EFY (2026/2027)",
          procurementCategory: "GOODS" as const,
          organization: "Federal Project Coordination Unit (FPCU)",
          description:
            "Procurement of specialized operational vehicles, IT infrastructure, and digital tracking equipment for pastoral value chain enhancement.",
          periodStart: new Date("2026-07-08").toISOString(),
          periodEnd: new Date("2027-07-07").toISOString(),
          gpnDate: new Date("2026-07-20").toISOString(),
          workflowStage: "APPROVED",
        },
        {
          projectId: driveProject.id,
          title: "2019 EFY DRIVE - Advisory & Quality Consulting Plan",
          budgetYear: "2019 EFY (2026/2027)",
          procurementCategory: "CONSULTANCY" as const,
          organization: "Federal Project Coordination Unit (FPCU)",
          description:
            "Specialized consultancy for livestock insurance actuarial assessment, M&E data systems, and environmental compliance.",
          periodStart: new Date("2026-07-08").toISOString(),
          periodEnd: new Date("2027-07-07").toISOString(),
          gpnDate: new Date("2026-07-25").toISOString(),
          workflowStage: "SUBMITTED_TO_DIRECTOR",
        },
      );
    }

    if (brefonsProject?.id) {
      plansToCreate.push(
        {
          projectId: brefonsProject.id,
          title:
            "2019 EFY BREFONS - Irrigation Works & Rangeland Micro-Dams Plan",
          budgetYear: "2019 EFY (2026/2027)",
          procurementCategory: "WORKS" as const,
          organization: "Somali & Afar Regional Bureaus",
          description:
            "Civil works including excavation, micro-earth dams, livestock watering troughs, and solar pumping installations.",
          periodStart: new Date("2026-07-08").toISOString(),
          periodEnd: new Date("2027-07-07").toISOString(),
          gpnDate: new Date("2026-08-01").toISOString(),
          workflowStage: "COMMITTEE_REVIEW",
        },
        {
          projectId: brefonsProject.id,
          title:
            "2018 EFY BREFONS - Veterinary Cold-Chain Equipment (Draft Plan)",
          budgetYear: "2018 EFY (2025/2026)",
          procurementCategory: "GOODS" as const,
          organization: "National Animal Health Diagnostic Center",
          description:
            "Draft annual procurement plan for upcoming fiscal cycle vaccine storage and mobile clinic trailers.",
          periodStart: new Date("2025-07-08").toISOString(),
          periodEnd: new Date("2026-07-07").toISOString(),
          workflowStage: "DRAFT",
        },
      );
    }

    if (calmProject?.id) {
      plansToCreate.push({
        projectId: calmProject.id,
        title:
          "2019 EFY CALM - Seed Multiplication & Non-Consulting Services Plan",
        budgetYear: "2019 EFY (2026/2027)",
        procurementCategory: "NON_CONSULTING" as const,
        organization: "Amhara & Oromia Natural Resources Bureaus",
        description:
          "Community seed multiplication contracts, aerial survey services, and specialized GIS boundary demarcation.",
        periodStart: new Date("2026-07-08").toISOString(),
        periodEnd: new Date("2027-07-07").toISOString(),
        workflowStage: "MANAGEMENT_REVIEW",
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 5: Acquire Officer token for drafting plans & activities (without touching browser cookies)
    // ──────────────────────────────────────────────────────────────────────────
    update(
      `Authenticating as Officer (${targetOfficerEmail}) to draft plans & activities...`,
      55,
    );
    const officerPasswords = [
      directorPassword,
      "Password123!",
      "password",
      "Password123",
      "12345678",
      "Admin123!",
    ];
    let officerToken: string | null = null;
    for (const pwd of officerPasswords) {
      officerToken = await fetchUserToken(targetOfficerEmail, pwd);
      if (officerToken) {
        break;
      }
    }
    if (!officerToken) {
      console.warn(
        "Officer login note: could not authenticate as officer, proceeding with director session.",
      );
    }

    const planAuthHeaders: Record<string, string> = {};
    const activeTokenForPlan =
      officerToken || directorToken || authTokenManager.getToken();
    if (activeTokenForPlan) {
      planAuthHeaders["Authorization"] = `Bearer ${activeTokenForPlan}`;
    }

    const createdPlansMap: Record<string, BackendPlan> = {};

    for (const pItem of plansToCreate) {
      let activePlan: BackendPlan | null = null;
      if (planTitleSet.has(pItem.title.toLowerCase())) {
        const found = existingPlans.find(
          (x) => x.title?.toLowerCase() === pItem.title.toLowerCase(),
        );
        if (found) activePlan = found;
      }

      if (!activePlan) {
        try {
          const newPlan = await directApiFetch<any>("/plans", {
            method: "POST",
            body: JSON.stringify({
              projectId: pItem.projectId,
              title: pItem.title,
              budgetYear: pItem.budgetYear,
              procurementCategory: pItem.procurementCategory,
              organization: pItem.organization,
              description: pItem.description,
              periodStart: pItem.periodStart,
              periodEnd: pItem.periodEnd,
              gpnDate: pItem.gpnDate,
            }),
            headers: planAuthHeaders,
            skipAuth: Boolean(activeTokenForPlan),
          }).then((r) => r?.data || r);

          if (newPlan && newPlan.id) {
            activePlan = newPlan;
          }
        } catch (err) {
          console.warn(`Plan creation notice for ${pItem.title}:`, err);
        }
      }

      if (activePlan?.id) {
        createdPlansMap[pItem.title] = activePlan;

        // Officer submits plans needing review to Director
        try {
          if (pItem.workflowStage !== "DRAFT") {
            await directApiFetch<any>(
              `/plans/${encodeURIComponent(activePlan.id)}/submit`,
              {
                method: "POST",
                headers: planAuthHeaders,
                skipAuth: Boolean(activeTokenForPlan),
              },
            );
          }
        } catch (wfErr) {
          console.warn(`Officer submit plan notice for ${pItem.title}:`, wfErr);
        }

        // Advance to committee if requested
        if (
          pItem.workflowStage === "COMMITTEE_REVIEW" ||
          pItem.workflowStage === "APPROVED" ||
          pItem.workflowStage === "MANAGEMENT_REVIEW"
        ) {
          try {
            const dirHeaders: Record<string, string> = {};
            const dToken = directorToken || authTokenManager.getToken();
            if (dToken) dirHeaders["Authorization"] = `Bearer ${dToken}`;
            await directApiFetch<any>(
              `/plans/${encodeURIComponent(activePlan.id)}/send-to-committee`,
              {
                method: "POST",
                headers: dirHeaders,
                skipAuth: Boolean(dToken),
              },
            );
          } catch {}
        }
      }
    }

    const refreshedPlans = (await fetchPlans()).filter((p) => isRealDbId(p.id));
    const driveGoodsPlan =
      refreshedPlans.find((p) => p.title?.includes("DRIVE - Goods")) ||
      refreshedPlans[0];
    const driveConsultPlan =
      refreshedPlans.find((p) => p.title?.includes("DRIVE - Advisory")) ||
      refreshedPlans[1] ||
      driveGoodsPlan;
    const brefonsWorksPlan =
      refreshedPlans.find((p) => p.title?.includes("BREFONS - Irrigation")) ||
      refreshedPlans[2] ||
      driveGoodsPlan;

    // ──────────────────────────────────────────────────────────────────────────
    // Step 6: Create Procurement Activities with Stages & Roadmaps
    // ──────────────────────────────────────────────────────────────────────────
    update(
      "Generating procurement activities, milestones & delayed alerts...",
      75,
    );

    const rfqMethodId = pmRfqId || anyRealMethodId;
    const ncbMethodId = pmNcbId || anyRealMethodId;
    const qcbsMethodId = pmQcbsId || anyRealMethodId;

    const activitiesToCreate: any[] = [];

    if (driveGoodsPlan?.id && ncbMethodId) {
      activitiesToCreate.push(
        {
          planId: driveGoodsPlan.id,
          procurementMethodId: ncbMethodId,
          description:
            "Procurement of 12 Units Heavy-Duty 4WD Field Vehicles for Pastoral Zone Outreach",
          estimatedBudget: 95000000,
          currency: "ETB",
          marketApproach: "OPEN_NATIONAL" as const,
          reviewType: "POST" as const,
          contractType: "LUMP_SUM" as const,
          fundings: [
            {
              fundingSource: "World Bank (IDA)",
              loanGrantNumber: "IDA-71280-ET",
              allocationPct: 100,
            },
          ],
          stages: [
            {
              name: "Preparation of Bidding Documents",
              sequence: 1,
              plannedStartDate: "2024-08-01",
              plannedEndDate: "2024-08-25",
              actualStartDate: "2024-08-01",
              actualEndDate: "2024-08-22",
              status: "COMPLETED",
            },
            {
              name: "Invitation / Public Tender Advertisement",
              sequence: 2,
              plannedStartDate: "2024-08-26",
              plannedEndDate: "2024-09-30",
              actualStartDate: "2024-08-26",
              actualEndDate: "2024-09-30",
              status: "COMPLETED",
            },
            {
              name: "Technical and Financial Bid Evaluation",
              sequence: 3,
              plannedStartDate: "2024-10-01",
              plannedEndDate: "2024-10-25",
              actualStartDate: "2024-10-02",
              actualEndDate: "2024-10-28",
              status: "COMPLETED",
            },
            {
              name: "Contract Award & Signing",
              sequence: 4,
              plannedStartDate: "2024-11-01",
              plannedEndDate: "2024-11-20",
              actualStartDate: "2024-11-05",
              actualEndDate: "2024-11-18",
              status: "COMPLETED",
            },
          ],
        },
        {
          planId: driveGoodsPlan.id,
          procurementMethodId: rfqMethodId,
          description:
            "Digital RFID Ear-Tags and Livestock Tracking Readers (250,000 units)",
          estimatedBudget: 48000000,
          currency: "ETB",
          marketApproach: "OPEN_NATIONAL" as const,
          reviewType: "POST" as const,
          fundings: [
            {
              fundingSource: "World Bank (IDA)",
              loanGrantNumber: "IDA-71280-ET",
              allocationPct: 100,
            },
          ],
          stages: [
            {
              name: "Technical Specification Finalization",
              sequence: 1,
              plannedStartDate: "2024-09-01",
              plannedEndDate: "2024-09-20",
              actualStartDate: "2024-09-01",
              actualEndDate: "2024-09-18",
              status: "COMPLETED",
            },
            {
              name: "Issuance of Requests for Quotation (RFQ)",
              sequence: 2,
              plannedStartDate: "2024-09-22",
              plannedEndDate: "2024-10-15",
              status: "IN_PROGRESS",
            },
          ],
        },
        {
          planId: driveGoodsPlan.id,
          procurementMethodId: ncbMethodId,
          description:
            "Solar-Powered Mobile Cold Chain Freezers for Regional Veterinary Vaccine Banks",
          estimatedBudget: 28500000,
          currency: "ETB",
          marketApproach: "OPEN_NATIONAL" as const,
          reviewType: "PRIOR" as const,
          fundings: [
            {
              fundingSource: "World Bank (IDA)",
              loanGrantNumber: "IDA-71280-ET",
              allocationPct: 100,
            },
          ],
          stages: [
            {
              name: "Bidding Document Preparation",
              sequence: 1,
              plannedStartDate: "2024-07-15",
              plannedEndDate: "2024-08-15",
              status: "DELAYED",
            },
            {
              name: "Donor Prior Review Clearance",
              sequence: 2,
              plannedStartDate: "2024-08-20",
              plannedEndDate: "2024-09-10",
              status: "NOT_STARTED",
            },
          ],
        },
      );
    }

    if (brefonsWorksPlan?.id && ncbMethodId) {
      activitiesToCreate.push({
        planId: brefonsWorksPlan.id,
        procurementMethodId: ncbMethodId,
        description:
          "Construction of 6 Community Micro-Earth Dams and Water Retention Troughs in Shinile Zone",
        estimatedBudget: 135000000,
        currency: "ETB",
        marketApproach: "OPEN_NATIONAL" as const,
        reviewType: "PRIOR" as const,
        fundings: [
          {
            fundingSource: "African Development Bank (AfDB)",
            loanGrantNumber: "ADF-2100155041",
            allocationPct: 100,
          },
        ],
        stages: [
          {
            name: "Engineering Designs & BOQ Clearance",
            sequence: 1,
            plannedStartDate: "2024-07-10",
            plannedEndDate: "2024-08-15",
            actualStartDate: "2024-07-10",
            actualEndDate: "2024-08-12",
            status: "COMPLETED",
          },
          {
            name: "National Tender Publication",
            sequence: 2,
            plannedStartDate: "2024-08-20",
            plannedEndDate: "2024-09-30",
            actualStartDate: "2024-08-20",
            actualEndDate: "2024-09-28",
            status: "COMPLETED",
          },
          {
            name: "Contract Award & Site Handover",
            sequence: 3,
            plannedStartDate: "2024-10-15",
            plannedEndDate: "2024-11-10",
            actualStartDate: "2024-10-18",
            actualEndDate: "2024-11-05",
            status: "COMPLETED",
          },
        ],
      });
    }

    if (driveConsultPlan?.id && qcbsMethodId) {
      activitiesToCreate.push({
        planId: driveConsultPlan.id,
        procurementMethodId: qcbsMethodId,
        description:
          "Consultancy Services for Satellite Index Insurance Feasibility & Actuarial Calibration",
        estimatedBudget: 340000,
        currency: "USD",
        marketApproach: "OPEN_INTERNATIONAL" as const,
        reviewType: "PRIOR" as const,
        contractType: "TIME_BASED" as const,
        fundings: [
          {
            fundingSource: "World Bank (IDA)",
            loanGrantNumber: "IDA-D9980-ET",
            allocationPct: 100,
          },
        ],
        stages: [
          {
            name: "Terms of Reference (TOR) Clearance",
            sequence: 1,
            plannedStartDate: "2024-08-01",
            plannedEndDate: "2024-08-25",
            status: "IN_PROGRESS",
          },
        ],
      });
    }

    const createdActivities: any[] = [];

    for (const act of activitiesToCreate) {
      try {
        const res = await directApiFetch<any>("/activities", {
          method: "POST",
          body: JSON.stringify(act),
          headers: planAuthHeaders,
          skipAuth: Boolean(activeTokenForPlan),
        }).then((r) => r?.data || r);
        if (res && res.id) {
          createdActivities.push(res);
        }
      } catch (actErr) {
        console.warn(`Activity creation notice:`, actErr);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 7: Create Contracts and Financial Payment Milestones
    // ──────────────────────────────────────────────────────────────────────────
    update(
      "Linking awarded contracts and recording payment transactions...",
      88,
    );

    const existingContracts = await fetchContracts();
    const existingContractNos = new Set(
      existingContracts.map((c) => c.contractNo?.toUpperCase()).filter(Boolean),
    );

    const contractsToCreate = [
      {
        contractNo: "MOA/DRIVE/G-01/2017",
        totalValue: 92500000,
        currency: "ETB",
        region: "FPCU / Federal",
        sector: "Agriculture & Livestock",
        status: "ACTIVE",
        supplierId: supplierId || undefined,
        activityId: createdActivities[0]?.id || undefined,
        advanceAmount: 27750000,
        interimAmount: 37000000,
      },
      {
        contractNo: "MOA/BREFONS/W-03/2017",
        totalValue: 132000000,
        currency: "ETB",
        region: "Somali & Afar",
        sector: "Natural Resources & Irrigation",
        status: "ACTIVE",
        supplierId: supplierId || undefined,
        activityId:
          createdActivities[3]?.id || createdActivities[1]?.id || undefined,
        advanceAmount: 26400000,
        interimAmount: null,
      },
    ];

    const dirHeaders: Record<string, string> = {};
    const dToken = directorToken || authTokenManager.getToken();
    if (dToken) dirHeaders["Authorization"] = `Bearer ${dToken}`;

    for (const cData of contractsToCreate) {
      if (existingContractNos.has(cData.contractNo.toUpperCase())) {
        continue;
      }

      try {
        const newContract = await directApiFetch<any>("/contracts", {
          method: "POST",
          body: JSON.stringify({
            contractNo: cData.contractNo,
            totalValue: cData.totalValue,
            currency: cData.currency,
            region: cData.region,
            sector: cData.sector,
            supplierId: cData.supplierId,
            activityId: cData.activityId,
          }),
          headers: dirHeaders,
          skipAuth: Boolean(dToken),
        }).then((r) => r?.data || r);

        const cId = newContract?.id;
        if (cId) {
          if (cData.advanceAmount) {
            try {
              await directApiFetch<any>(
                `/contracts/${encodeURIComponent(cId)}/payments`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    amount: cData.advanceAmount,
                    referenceNo: `PAY-ADV-${Date.now().toString().slice(-6)}`,
                    idempotencyKey: `adv-${cId}-${Date.now()}`,
                  }),
                  headers: dirHeaders,
                  skipAuth: Boolean(dToken),
                },
              );
            } catch (pErr) {
              console.warn("Advance payment notice:", pErr);
            }
          }

          if (cData.interimAmount) {
            try {
              await directApiFetch<any>(
                `/contracts/${encodeURIComponent(cId)}/payments`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    amount: cData.interimAmount,
                    referenceNo: `PAY-INT-${Date.now().toString().slice(-6)}`,
                    idempotencyKey: `int-${cId}-${Date.now()}`,
                  }),
                  headers: dirHeaders,
                  skipAuth: Boolean(dToken),
                },
              );
            } catch (pErr) {
              console.warn("Interim payment notice:", pErr);
            }
          }
        }
      } catch (cErr) {
        console.warn(`Contract creation notice for ${cData.contractNo}:`, cErr);
      }
    }

    update("Presentation data generation complete!", 100);
    return {
      success: true,
      summary: `Successfully cleaned up previous unowned projects, authenticated and created 4 MoA flagship projects under Director (${directorEmail}), assigned Officer (${targetOfficerEmail}) to all projects, and generated complete annual plans across all workflow stages!`,
    };
  } catch (err: any) {
    console.warn("Presentation data population notice:", err);
    return {
      success: false,
      summary:
        err?.message ||
        "Notice: presentation data population encountered an issue.",
    };
  }
}
