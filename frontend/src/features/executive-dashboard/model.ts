export const ITEM_TYPES = [
  "WORKS",
  "GOODS",
  "SERVICES",
  "UNCLASSIFIED",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type ProcurementPortfolioStatus =
  | "NOT_STARTED"
  | "BIDDING_DOCUMENT_PREPARATION"
  | "BID_ADVERTISED"
  | "BID_EVALUATION"
  | "CONTRACT_AWARDED"
  | "CONTRACT_DELIVERY"
  | "COMPLETED";
export const TYPE_LABELS: Record<ItemType, string> = {
  WORKS: "Works",
  GOODS: "Goods",
  SERVICES: "Services",
  UNCLASSIFIED: "Unclassified",
};
export interface ExecutiveRecord {
  id: string;
  activityId: string | null;
  activityReference?: string;
  activityContractCount?: number;
  activityStatus?: string;
  planStatus?: string;
  activityStage?: string | null;
  portfolioStatus?: ProcurementPortfolioStatus;
  contractId: string | null;
  reference: string;
  description: string;
  projectId: string | null;
  project: string;
  itemType: ItemType;
  sourceCategory: string | null;
  estimate: number | null;
  estimateCurrency: string | null;
  currency: string | null;
  invitationDate: string | null;
  bidOpeningDate: string | null;
  signedDate: string | null;
  startDate?: string | null;
  supplier: string | null;
  country: string | null;
  initialAmount: number | null;
  initialCompletionDate: string | null;
  revisedCompletionDate: string | null;
  actualCompletionDate: string | null;
  complete: boolean | null;
  completionPct: number | null;
  status: string;
}
export interface SystemSummary {
  projects: number;
  plans: number;
  directorReview: number;
  committeeReview: number;
  executiveApproval: number;
  delayedActivities: number;
  activities: number;
  activitiesWithStages: number;
}
export interface Snapshot {
  systemSummary?: SystemSummary;
  records: ExecutiveRecord[];
  fetchedAt: string;
  source: string;
}
export interface Filters {
  itemType: string;
  currency: string;
  project: string;
  status: string;
  search: string;
  supplier: string;
  signingYear: string;
  completionYear: string;
}
export const EMPTY_FILTERS: Filters = {
  itemType: "ALL",
  currency: "ALL",
  project: "ALL",
  status: "ALL",
  search: "",
  supplier: "ALL",
  signingYear: "ALL",
  completionYear: "ALL",
};

export function projectNameLabels(records: ExecutiveRecord[]) {
  const projects = new Map(
    records.map((row) => [row.projectId || "UNLINKED", row.project]),
  );
  const counts = new Map<string, number>();
  for (const name of projects.values())
    counts.set(name, (counts.get(name) || 0) + 1);
  return new Map(
    [...projects].map(([id, name]) => [
      id,
      (counts.get(name) || 0) > 1 ? `${name} (record ${id.slice(-6)})` : name,
    ]),
  );
}

export function isOverdue(row: ExecutiveRecord, asOf: string): boolean {
  const due = row.revisedCompletionDate || row.initialCompletionDate;
  return (
    !!row.contractId &&
    row.complete !== true &&
    !["CANCELLED", "TERMINATED", "COMPLETED"].includes(row.status) &&
    !!due &&
    due.slice(0, 10) < asOf.slice(0, 10)
  );
}
export function deliveryStatus(row: ExecutiveRecord, asOf: string): string {
  if (!row.contractId) return "Pre-contract";
  if (row.complete) return "Completed";
  if (["CANCELLED", "TERMINATED"].includes(row.status)) return "Closed";
  return isOverdue(row, asOf) ? "Overdue" : "In progress";
}
export function filterRecords(
  records: ExecutiveRecord[],
  filters: Filters,
  asOf: string,
) {
  const query = filters.search.trim().toLowerCase();
  return records.filter(
    (row) =>
      (filters.itemType === "ALL" || row.itemType === filters.itemType) &&
      (filters.currency === "ALL" ||
        (row.currency || "UNSPECIFIED") === filters.currency) &&
      (filters.project === "ALL" ||
        (row.projectId || "UNLINKED") === filters.project) &&
      (filters.supplier === "ALL" ||
        (row.supplier || "UNRECORDED") === filters.supplier) &&
      (filters.signingYear === "ALL" ||
        row.signedDate?.slice(0, 4) === filters.signingYear) &&
      (filters.completionYear === "ALL" ||
        (row.revisedCompletionDate || row.initialCompletionDate)?.slice(
          0,
          4,
        ) === filters.completionYear) &&
      (filters.status === "ALL" ||
        deliveryStatus(row, asOf) === filters.status) &&
      (!query ||
        [row.reference, row.description, row.project, row.supplier].some(
          (value) => value?.toLowerCase().includes(query),
        )),
  );
}
export function summarize(records: ExecutiveRecord[], asOf: string) {
  const contracts = records.filter((row) => !!row.contractId);
  const activities = new Map(
    records
      .filter((row) => !!row.activityId)
      .map((row) => [row.activityId!, row]),
  );
  const amounts = new Map<string, number>();
  for (const row of contracts)
    if (row.initialAmount !== null)
      amounts.set(
        row.currency || "Unspecified",
        (amounts.get(row.currency || "Unspecified") || 0) + row.initialAmount,
      );
  const estimates = new Map<string, number>();
  for (const row of activities.values())
    if (row.estimate !== null)
      estimates.set(
        row.estimateCurrency || "Unspecified",
        (estimates.get(row.estimateCurrency || "Unspecified") || 0) +
          row.estimate,
      );
  return {
    activities: activities.size,
    contracts: contracts.length,
    completed: contracts.filter((row) => row.complete).length,
    overdue: contracts.filter((row) => isOverdue(row, asOf)).length,
    preContract: records.filter((row) => !row.contractId).length,
    missingProgress: contracts.filter((row) => row.completionPct === null)
      .length,
    amounts: [...amounts.entries()].sort(),
    estimates: [...estimates.entries()].sort(),
  };
}

export function summarizeProcurementProgress(records: ExecutiveRecord[]) {
  const activities = new Map<
    string,
    {
      projectId: string | null;
      status: string;
      planStatus?: string;
      activityStage?: string | null;
      portfolioStatus?: ProcurementPortfolioStatus;
      invitationDate: string | null;
      bidOpeningDate: string | null;
      contracts: ExecutiveRecord[];
    }
  >();

  for (const row of records) {
    if (!row.activityId) continue;
    const activity = activities.get(row.activityId) ?? {
      projectId: row.projectId,
      status: row.activityStatus || "",
      planStatus: row.planStatus,
      activityStage: row.activityStage,
      portfolioStatus: row.portfolioStatus,
      invitationDate: row.invitationDate,
      bidOpeningDate: row.bidOpeningDate,
      contracts: [],
    };
    if (row.contractId) activity.contracts.push(row);
    activities.set(row.activityId, activity);
  }

  const counts = {
    notStarted: 0,
    biddingDocumentPreparation: 0,
    bidAdvertised: 0,
    bidEvaluation: 0,
    contractAwarded: 0,
    contractDelivery: 0,
    completed: 0,
  };
  let notYetToMarket = 0;
  let inTendering = 0;
  let awardedDelivery = 0;
  let completed = 0;
  for (const activity of activities.values()) {
    const status =
      activity.portfolioStatus ||
      (activity.status === "COMPLETED" ||
      (activity.contracts.length > 0 &&
        activity.contracts.every((contract) => contract.complete === true))
        ? "COMPLETED"
        : activity.contracts.some((contract) => contract.status === "ACTIVE")
          ? "CONTRACT_DELIVERY"
          : activity.contracts.some(
                (contract) =>
                  contract.status === "SIGNED" || contract.signedDate !== null,
              )
            ? "CONTRACT_AWARDED"
            : activity.invitationDate || activity.bidOpeningDate
              ? "BID_ADVERTISED"
              : ["CONTRACTED"].includes(activity.status)
                ? "CONTRACT_AWARDED"
                : "BIDDING_DOCUMENT_PREPARATION");
    if (activity.planStatus !== undefined) {
      const normalizedPlanStatus = activity.planStatus
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
      const isFinallyApproved = [
        "APPROVED",
        "FINALLY_APPROVED",
        "FINALLY_APPROVE",
        "MANAGEMENT_APPROVED",
      ].includes(normalizedPlanStatus);
      const normalizedStage = (activity.activityStage || activity.status || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (!isFinallyApproved) {
        counts.notStarted += 1;
        notYetToMarket += 1;
        continue;
      }

      if (
        normalizedStage === "draft request for quotations" ||
        normalizedStage === "draft request for quotation"
      ) {
        counts.biddingDocumentPreparation += 1;
      } else if (normalizedStage === "invitation to bidders") {
        counts.bidAdvertised += 1;
      } else if (
        normalizedStage === "receive quotations" ||
        normalizedStage === "receiving quotations"
      ) {
        counts.bidEvaluation += 1;
      } else if (normalizedStage === "signed contract") {
        counts.contractAwarded += 1;
      } else if (normalizedStage === "notification of intention of award") {
        counts.contractAwarded += 1;
        counts.contractDelivery += 1;
      } else if (normalizedStage === "contract completion") {
        counts.completed += 1;
      }

      if (normalizedStage === "contract completion") {
        completed += 1;
      } else if (
        normalizedStage === "notification of intention of award"
      ) {
        awardedDelivery += 1;
      } else {
        inTendering += 1;
      }
      continue;
    }

    const countKey = {
      NOT_STARTED: "notStarted",
      BIDDING_DOCUMENT_PREPARATION: "biddingDocumentPreparation",
      BID_ADVERTISED: "bidAdvertised",
      BID_EVALUATION: "bidEvaluation",
      CONTRACT_AWARDED: "contractAwarded",
      CONTRACT_DELIVERY: "contractDelivery",
      COMPLETED: "completed",
    } as const;
    counts[countKey[status]] += 1;

    if (status === "NOT_STARTED" || status === "BIDDING_DOCUMENT_PREPARATION") {
      notYetToMarket += 1;
    } else if (status === "BID_ADVERTISED" || status === "BID_EVALUATION") {
      inTendering += 1;
    } else if (status === "CONTRACT_AWARDED" || status === "CONTRACT_DELIVERY") {
      awardedDelivery += 1;
    } else if (status === "COMPLETED") {
      completed += 1;
    }
  }

  return {
    activities: activities.size,
    projects: new Set(
      [...activities.values()]
        .map((activity) => activity.projectId)
        .filter((id): id is string => Boolean(id)),
    ).size,
    notYetToMarket,
    inTendering,
    awardedDelivery,
    completed,
    statuses: counts,
  };
}

export const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en", {
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
export function displayDate(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return [
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCFullYear()).slice(-2),
  ].join("/");
}
export const REGISTER_COLUMNS = [
  "No.",
  "Contract Ref",
  "Contract Description",
  "Project",
  "Cost Estimate (USD/ETB)",
  "Date of Invitation (mm/dd/yy)",
  "Date of Bid Opening (mm/dd/yy)",
  "Date Contract Signed (mm/dd/yy)",
  "Supplier / Contractor, Country",
  "Initial Contract Amount (USD/ETB, excl. VAT)",
  "Initial Contract Completion Date (mm/dd/yy)",
  "Complete, Yes/No",
  "% Completion (reported activity)",
] as const;
export function registerCells(row: ExecutiveRecord, number: number): string[] {
  const amount = (value: number | null, currency: string | null) =>
    value === null
      ? "Not recorded"
      : money(value) + " " + (currency || "(currency not recorded)");
  const contractMissing = "Not applicable (pre-contract)";
  return [
    String(number),
    row.contractId
      ? row.reference
      : "Activity: " + row.reference + " (no contract)",
    row.description || "Not recorded",
    row.project || "Not recorded",
    amount(row.estimate, row.estimateCurrency),
    displayDate(row.invitationDate),
    displayDate(row.bidOpeningDate),
    row.contractId ? displayDate(row.signedDate) : contractMissing,
    (row.supplier ||
      (row.contractId ? "Supplier not recorded" : "Supplier not awarded")) +
      "; Supplier country not available",
    row.contractId ? amount(row.initialAmount, row.currency) : contractMissing,
    row.contractId ? displayDate(row.initialCompletionDate) : contractMissing,
    row.complete === null ? contractMissing : row.complete ? "Yes" : "No",
    row.completionPct === null
      ? "Not reported"
      : String(row.completionPct) + "%",
  ];
}
export function registerCsv(records: ExecutiveRecord[]) {
  const cell = (value: unknown) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      REGISTER_COLUMNS,
      ...records.map((row, index) => registerCells(row, index + 1)),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
