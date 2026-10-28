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
