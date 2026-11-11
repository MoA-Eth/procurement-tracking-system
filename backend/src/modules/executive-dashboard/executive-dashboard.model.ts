export type ItemType = 'WORKS' | 'GOODS' | 'SERVICES' | 'UNCLASSIFIED';
export type ProcurementPortfolioStatus =
  | 'NOT_STARTED'
  | 'BIDDING_DOCUMENT_PREPARATION'
  | 'BID_ADVERTISED'
  | 'BID_EVALUATION'
  | 'CONTRACT_AWARDED'
  | 'CONTRACT_DELIVERY'
  | 'COMPLETED';

type PortfolioStage = {
  label: string;
  status: string;
  isNotApplicable: boolean;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
};

type PortfolioContract = {
  status: string;
  signatureDate: Date | null;
  actualCompletionDate: Date | null;
};

export function procurementPortfolioStatus(
  activityStatus: string,
  stages: PortfolioStage[],
  contracts: PortfolioContract[],
): ProcurementPortfolioStatus {
  if (
    activityStatus === 'COMPLETED' ||
    (contracts.length > 0 &&
      contracts.every(
        (contract) =>
          contract.status === 'COMPLETED' ||
          contract.actualCompletionDate !== null,
      ))
  ) {
    return 'COMPLETED';
  }
  if (
    contracts.some((contract) =>
      ['ACTIVE', 'PARTIALLY_TERMINATED'].includes(contract.status),
    )
  ) {
    return 'CONTRACT_DELIVERY';
  }
  if (
    contracts.some(
      (contract) =>
        contract.status === 'SIGNED' || contract.signatureDate !== null,
    )
  ) {
    return 'CONTRACT_AWARDED';
  }

  const activeStage =
    stages.find(
      (stage) => !stage.isNotApplicable && stage.status === 'IN_PROGRESS',
    ) ??
    stages.find(
      (stage) =>
        !stage.isNotApplicable &&
        !['COMPLETED', 'NOT_APPLICABLE'].includes(stage.status),
    );
  const label = activeStage?.label.toLowerCase() ?? '';

  if (/\b(bank|approval|endorsement)\b/.test(label)) return 'NOT_STARTED';
  if (/\b(evaluation|evaluating)\b/.test(label)) return 'BID_EVALUATION';
  if (/\b(advertis|invitation|issuance)\b/.test(label)) return 'BID_ADVERTISED';
  if (/\b(award|contract signing|signing of contract)\b/.test(label))
    return 'CONTRACT_AWARDED';
  if (
    /\b(bid|bidding|tender)\b/.test(label) &&
    /\b(document|prepar|draft)\b/.test(label)
  ) {
    return 'BIDDING_DOCUMENT_PREPARATION';
  }

  if (
    stages.length > 0 &&
    stages.every(
      (stage) =>
        stage.isNotApplicable ||
        ['COMPLETED', 'NOT_APPLICABLE'].includes(stage.status),
    )
  ) {
    return 'COMPLETED';
  }
  return 'BIDDING_DOCUMENT_PREPARATION';
}

export function latestReachedStageLabel(
  stages: PortfolioStage[],
): string | null {
  const applicableStages = stages.filter((stage) => !stage.isNotApplicable);
  const inProgressStages = applicableStages.filter(
    (stage) => stage.status === 'IN_PROGRESS',
  );
  const datedInProgressStages = inProgressStages
    .map((stage, index) => ({
      stage,
      index,
      date: stage.actualEndDate ?? stage.actualStartDate ?? null,
    }))
    .filter(
      (entry): entry is typeof entry & { date: Date } => entry.date !== null,
    );

  if (datedInProgressStages.length > 0) {
    return datedInProgressStages.reduce((latest, candidate) =>
      candidate.date > latest.date ||
      (candidate.date.getTime() === latest.date.getTime() &&
        candidate.index > latest.index)
        ? candidate
        : latest,
    ).stage.label;
  }
  if (inProgressStages.length > 0) {
    return inProgressStages.at(-1)?.label ?? null;
  }

  const datedStages = applicableStages
    .map((stage, index) => ({
      stage,
      index,
      date: stage.actualEndDate ?? stage.actualStartDate ?? null,
    }))
    .filter(
      (entry): entry is typeof entry & { date: Date } => entry.date !== null,
    );
  if (datedStages.length > 0) {
    return datedStages.reduce((latest, candidate) =>
      candidate.date > latest.date ||
      (candidate.date.getTime() === latest.date.getTime() &&
        candidate.index > latest.index)
        ? candidate
        : latest,
    ).stage.label;
  }

  return (
    [...applicableStages]
      .reverse()
      .find((stage) => stage.status === 'COMPLETED')?.label ??
    applicableStages[0]?.label ??
    null
  );
}

export function classifyItemType(value: string | null): ItemType {
  const category = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (['works', 'work', 'construction', 'civil works'].includes(category))
    return 'WORKS';
  if (['goods', 'good'].includes(category)) return 'GOODS';
  if (
    [
      'service',
      'services',
      'consultancy',
      'consultancy services',
      'consulting services',
      'consulting',
      'non consulting services',
      'non consultancy services',
      'non consulting',
      'consultant services',
    ].includes(category)
  )
    return 'SERVICES';
  return 'UNCLASSIFIED';
}

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

export interface ExecutiveDashboardCharts {
  executiveSummary: {
    totalActivities: number;
    totalProjects: number;
    notYetToMarket: number;
    inTendering: number;
    awardedDelivery: number;
    completed: number;
  };
  consolidatedPortfolio: {
    totalActivities: number;
    statuses: Record<keyof ExecutivePortfolioCounts, number>;
  };
  projectPortfolio: {
    projectId: string;
    project: string;
    totalActivities: number;
    statuses: Record<keyof ExecutivePortfolioCounts, number>;
  }[];
  financialPosition: {
    currencyTotals: Record<string, number>;
    procurementStageTotals: {
      key: 'planning' | 'tendering' | 'contracted' | 'completed';
      label: string;
      value: number;
    }[];
    totalEtb: number;
    largestProjects: {
      projectId: string;
      project: string;
      value: number;
      activities: number;
    }[];
  };
}

type ExecutivePortfolioCounts = {
  notStarted: number;
  biddingDocumentPreparation: number;
  bidAdvertised: number;
  bidEvaluation: number;
  contractAwarded: number;
  contractDelivery: number;
  completed: number;
};

const emptyPortfolioCounts = (): ExecutivePortfolioCounts => ({
  notStarted: 0,
  biddingDocumentPreparation: 0,
  bidAdvertised: 0,
  bidEvaluation: 0,
  contractAwarded: 0,
  contractDelivery: 0,
  completed: 0,
});

function isFinallyApproved(planStatus: string | undefined) {
  const status = (planStatus ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return [
    'APPROVED',
    'FINALLY_APPROVED',
    'FINALLY_APPROVE',
    'MANAGEMENT_APPROVED',
  ].includes(status);
}

function normalizeStageLabel(label: string | null | undefined) {
  return (label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function countPortfolioStatus(
  counts: ExecutivePortfolioCounts,
  activity: ExecutiveRecord,
) {
  if (!isFinallyApproved(activity.planStatus)) {
    counts.notStarted += 1;
    return;
  }

  const stage = normalizeStageLabel(activity.activityStage);
  if (
    stage === 'draft request for quotations' ||
    stage === 'draft request for quotation'
  ) {
    counts.biddingDocumentPreparation += 1;
  } else if (stage === 'invitation to bidders') {
    counts.bidAdvertised += 1;
  } else if (
    stage === 'receive quotations' ||
    stage === 'receiving quotations'
  ) {
    counts.bidEvaluation += 1;
  } else if (stage === 'signed contract') {
    counts.contractAwarded += 1;
  } else if (stage === 'notification of intention of award') {
    counts.contractAwarded += 1;
    counts.contractDelivery += 1;
  } else if (stage === 'contract completion') {
    counts.completed += 1;
  }
}

function summaryBucket(activity: ExecutiveRecord) {
  if (!isFinallyApproved(activity.planStatus)) return 'notYetToMarket';
  const stage = normalizeStageLabel(activity.activityStage);
  if (stage === 'contract completion') return 'completed';
  if (stage === 'notification of intention of award') return 'awardedDelivery';
  return 'inTendering';
}

function financialStage(counts: ExecutivePortfolioCounts) {
  if (counts.completed) return 'completed';
  if (counts.contractAwarded || counts.contractDelivery) return 'contracted';
  if (counts.bidAdvertised || counts.bidEvaluation) return 'tendering';
  return 'planning';
}

export function executiveDashboardCharts(
  records: ExecutiveRecord[],
): ExecutiveDashboardCharts {
  const activities = new Map<string, ExecutiveRecord[]>();
  const projectNameById = new Map<string, string>();
  const projectIdsByName = new Map<string, Set<string>>();

  for (const record of records) {
    if (!record.activityId) continue;
    const activityRecords = activities.get(record.activityId) ?? [];
    activityRecords.push(record);
    activities.set(record.activityId, activityRecords);
    if (record.projectId) {
      if (record.project) {
        projectNameById.set(record.projectId, record.project);
        const ids = projectIdsByName.get(record.project) ?? new Set<string>();
        ids.add(record.projectId);
        projectIdsByName.set(record.project, ids);
      }
    }
  }

  const uniqueActivities = [...activities.values()]
    .map((group) => group[0])
    .filter((activity): activity is ExecutiveRecord => Boolean(activity));
  const portfolioCounts = emptyPortfolioCounts();
  const summaryCounts = {
    notYetToMarket: 0,
    inTendering: 0,
    awardedDelivery: 0,
    completed: 0,
  };
  const projectCounts = new Map<
    string,
    {
      project: string;
      totalActivities: number;
      statuses: ExecutivePortfolioCounts;
    }
  >();

  for (const activity of uniqueActivities) {
    countPortfolioStatus(portfolioCounts, activity);
    summaryCounts[summaryBucket(activity)] += 1;

    if (activity.projectId) {
      const project = projectCounts.get(activity.projectId) ?? {
        project: activity.project || 'Project',
        totalActivities: 0,
        statuses: emptyPortfolioCounts(),
      };
      project.totalActivities += 1;
      countPortfolioStatus(project.statuses, activity);
      projectCounts.set(activity.projectId, project);
    }
  }

  const currencyTotals = new Map<string, number>();
  const stageTotals = new Map<
    'planning' | 'tendering' | 'contracted' | 'completed',
    number
  >([
    ['planning', 0],
    ['tendering', 0],
    ['contracted', 0],
    ['completed', 0],
  ]);
  const projectTotals = new Map<
    string,
    { project: string; value: number; activities: number }
  >();

  for (const group of activities.values()) {
    const activity = group.find((record) => record.estimate !== null);
    if (!activity || activity.estimate === null) continue;
    const currency = activity.estimateCurrency?.trim().toUpperCase();
    if (!currency) continue;

    currencyTotals.set(
      currency,
      (currencyTotals.get(currency) ?? 0) + activity.estimate,
    );
    if (currency !== 'ETB') continue;

    const stageCounts = emptyPortfolioCounts();
    countPortfolioStatus(stageCounts, activity);
    const stage = financialStage(stageCounts);
    stageTotals.set(stage, (stageTotals.get(stage) ?? 0) + activity.estimate);
    if (!activity.projectId) continue;

    const project = projectTotals.get(activity.projectId) ?? {
      project: activity.project || 'Project',
      value: 0,
      activities: 0,
    };
    project.value += activity.estimate;
    project.activities += 1;
    projectTotals.set(activity.projectId, project);
  }

  const totalEtb = [...stageTotals.values()].reduce(
    (total, value) => total + value,
    0,
  );
  const orderedCurrencies = ['ETB', 'USD', 'EUR'].filter((currency) =>
    currencyTotals.has(currency),
  );
  for (const currency of [...currencyTotals.keys()].sort()) {
    if (!orderedCurrencies.includes(currency)) orderedCurrencies.push(currency);
  }

  return {
    executiveSummary: {
      totalActivities: uniqueActivities.length,
      totalProjects: new Set(
        uniqueActivities
          .map((activity) => activity.projectId)
          .filter((id): id is string => Boolean(id)),
      ).size,
      ...summaryCounts,
    },
    consolidatedPortfolio: {
      totalActivities: uniqueActivities.length,
      statuses: portfolioCounts,
    },
    projectPortfolio: [...projectCounts.entries()]
      .map(([projectId, project]) => ({
        projectId,
        ...project,
        project:
          (projectIdsByName.get(project.project)?.size ?? 0) > 1
            ? `${project.project} (record ${projectId.slice(-6)})`
            : (projectNameById.get(projectId) ?? project.project),
      }))
      .sort(
        (a, b) =>
          b.totalActivities - a.totalActivities ||
          a.project.localeCompare(b.project),
      ),
    financialPosition: {
      currencyTotals: Object.fromEntries(
        orderedCurrencies.map((currency) => [
          currency,
          currencyTotals.get(currency)!,
        ]),
      ),
      procurementStageTotals: [
        {
          key: 'planning',
          label: 'Planning & submission',
          value: stageTotals.get('planning')!,
        },
        {
          key: 'tendering',
          label: 'Tendering & evaluation',
          value: stageTotals.get('tendering')!,
        },
        {
          key: 'contracted',
          label: 'Contracted / implementation',
          value: stageTotals.get('contracted')!,
        },
        {
          key: 'completed',
          label: 'Completed',
          value: stageTotals.get('completed')!,
        },
      ],
      totalEtb,
      largestProjects: [...projectTotals.entries()]
        .map(([projectId, project]) => ({
          projectId,
          ...project,
        }))
        .sort((a, b) => b.value - a.value || a.project.localeCompare(b.project))
        .slice(0, 5),
    },
  };
}

export const executiveRegisterColumns = [
  { key: 'no', label: 'No.' },
  { key: 'contractRef', label: 'Contract Ref' },
  { key: 'contractDescription', label: 'Contract Description' },
  { key: 'project', label: 'project' },
  { key: 'costEstimate', label: 'Cost Estimate in USD/ETB' },
  { key: 'invitationDate', label: 'Date of Invitation [mm/dd/yr]' },
  { key: 'bidOpeningDate', label: 'Date of bid opening [mm/dd/yr]' },
  { key: 'contractSignedDate', label: 'Date Contract Signed [mm/dd/yr]' },
  {
    key: 'supplierContractorCountry',
    label: 'Name supplier/Contractor, Country',
  },
  { key: 'initialContractAmount', label: 'Initial Contract Amount, USD/ETB' },
  {
    key: 'initialContractCompletionDate',
    label: 'Initial Contract Completion Date',
  },
  { key: 'complete', label: 'Complete, Yes/No' },
  { key: 'completionPct', label: '% of completion' },
] as const;

export function executiveRegisterDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}/${day}/${date.getUTCFullYear()}`;
}

function registerAmount(value: number | null, currency: string | null) {
  if (value === null) return '';
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${amount} ${currency}` : amount;
}

export function executiveRegisterRow(record: ExecutiveRecord, index: number) {
  return {
    no: index + 1,
    contractRef: record.reference,
    contractDescription: record.description,
    project: record.project,
    costEstimate: registerAmount(record.estimate, record.estimateCurrency),
    invitationDate: executiveRegisterDate(record.invitationDate),
    bidOpeningDate: executiveRegisterDate(record.bidOpeningDate),
    contractSignedDate: executiveRegisterDate(record.signedDate),
    supplierContractorCountry: [record.supplier, record.country]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(', '),
    initialContractAmount: registerAmount(
      record.initialAmount,
      record.currency,
    ),
    initialContractCompletionDate: executiveRegisterDate(
      record.initialCompletionDate,
    ),
    complete: record.complete === null ? '' : record.complete ? 'Yes' : 'No',
    completionPct:
      record.completionPct === null ? '' : `${record.completionPct}%`,
  };
}

export function reportedProgress(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

// Actual dates only. Planned or revised targets must never look like achieved milestones.
export function milestoneDate(
  stages: {
    label: string;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    isNotApplicable: boolean;
  }[],
  kind: 'invitation' | 'opening',
): string | null {
  const match =
    kind === 'invitation'
      ? /\binvitation\b/i
      : /\bbid\b.*\bopening\b|\bopening\b.*\bbid\b/i;
  const dates = stages
    .filter((s) => !s.isNotApplicable && match.test(s.label))
    .map((s) => s.actualEndDate ?? s.actualStartDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0]?.toISOString() ?? null;
}
