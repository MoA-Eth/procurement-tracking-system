export const ITEM_TYPES = [
  "WORKS",
  "GOODS",
  "SERVICES",
  "UNCLASSIFIED",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
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
