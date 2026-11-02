export type ItemType = 'WORKS' | 'GOODS' | 'SERVICES' | 'UNCLASSIFIED';

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
