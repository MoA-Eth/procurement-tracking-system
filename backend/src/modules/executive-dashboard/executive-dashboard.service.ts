import { prisma } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/index.js';
import {
  classifyItemType,
  milestoneDate,
  reportedProgress,
  type ExecutiveRecord,
} from './executive-dashboard.model.js';
import { operationalSummary } from './operational-summary.js';

const contractSelect = {
  id: true,
  contractNo: true,
  totalValue: true,
  currency: true,
  signatureDate: true,
  startDate: true,
  plannedEndDate: true,
  revisedCompletionDate: true,
  actualCompletionDate: true,
  status: true,
  supplier: { select: { name: true } },
} satisfies Prisma.ContractSelect;
type SelectedContract = Prisma.ContractGetPayload<{
  select: typeof contractSelect;
}>;
const date = (value: Date | null) => value?.toISOString() ?? null;
const currency = (value: string | null) => value?.trim().toUpperCase() || null;

function contractFields(contract: SelectedContract) {
  return {
    contractId: contract.id,
    reference: contract.contractNo,
    currency: currency(contract.currency),
    signedDate: date(contract.signatureDate),
    startDate: date(contract.startDate),
    supplier: contract.supplier.name,
    initialAmount: Number(contract.totalValue),
    initialCompletionDate: date(contract.plannedEndDate),
    revisedCompletionDate: date(contract.revisedCompletionDate),
    actualCompletionDate: date(contract.actualCompletionDate),
    complete:
      contract.status === 'COMPLETED' || contract.actualCompletionDate !== null,
    status: contract.status,
  };
}

export async function getExecutiveSnapshot() {
  const [activities, unlinkedContracts, projects, plans] = await prisma.$transaction(
    [
      prisma.activity.findMany({
        where: {
          isActive: true,
          plan: { isActive: true, project: { isActive: true } },
        },
        select: {
          id: true,
          reference: true,
          description: true,
          estimatedBudget: true,
          currency: true,
          performancePct: true,
          status: true,
          plan: {
            select: {
              title: true,
              procurementCategory: true,
              project: { select: { id: true, name: true, country: true } },
            },
          },
          stages: {
            select: {
              stageType: { select: { label: true } },
              actualStartDate: true,
              actualEndDate: true,
              status: true,
              plannedEndDate: true,
              currentTargetEndDate: true,
              isNotApplicable: true,
            },
          },
          contracts: { where: { deletedAt: null }, select: contractSelect },
        },
        orderBy: { reference: 'asc' },
      }),
      prisma.contract.findMany({
        where: { deletedAt: null, activityId: null },
        select: contractSelect,
        orderBy: { contractNo: 'asc' },
      }),
      prisma.project.findMany({ where: { isActive: true }, select: { id: true } }),
      prisma.plan.findMany({ where: { isActive: true, project: { isActive: true } }, select: { status: true, managementDecision: true } }),
    ],
    { isolationLevel: 'RepeatableRead' },
  );

  const records: ExecutiveRecord[] = [];
  for (const activity of activities) {
    const stages = activity.stages.map((s) => ({
      ...s,
      label: s.stageType.label,
    }));
    const base: ExecutiveRecord = {
      id: `activity:${activity.id}`,
      activityId: activity.id,
      activityReference: activity.reference,
      activityContractCount: activity.contracts.length,
      contractId: null,
      reference: activity.reference,
      description: activity.description || activity.plan.title,
      projectId: activity.plan.project.id,
      project: activity.plan.project.name,
      itemType: classifyItemType(activity.plan.procurementCategory),
      sourceCategory: activity.plan.procurementCategory,
      estimate: activity.estimatedBudget,
      estimateCurrency: currency(activity.currency),
      currency: currency(activity.currency),
      invitationDate: milestoneDate(stages, 'invitation'),
      bidOpeningDate: milestoneDate(stages, 'opening'),
      signedDate: null,
      supplier: null,
      country: activity.plan.project.country,
      initialAmount: null,
      initialCompletionDate: null,
      revisedCompletionDate: null,
      actualCompletionDate: null,
      complete: null,
      completionPct: reportedProgress(activity.performancePct),
      status: 'PRE_CONTRACT',
    };
    if (!activity.contracts.length) records.push(base);
    for (const contract of activity.contracts)
      records.push({
        ...base,
        ...contractFields(contract),
        id: `contract:${contract.id}`,
      });
  }
  for (const contract of unlinkedContracts)
    records.push({
      id: `contract:${contract.id}`,
      activityId: null,
      projectId: null,
      project: 'Not linked to a project',
      itemType: 'UNCLASSIFIED',
      sourceCategory: null,
      description: 'Description unavailable: contract has no linked activity',
      estimate: null,
      estimateCurrency: null,
      invitationDate: null,
      bidOpeningDate: null,
      country: null,
      completionPct: null,
      ...contractFields(contract),
    });
  return {
    records,
    systemSummary: operationalSummary(projects.length, plans, activities, new Date()),
    fetchedAt: new Date().toISOString(),
    source:
      'Existing procurement activities, plans, projects, contracts and actual milestones',
  };
}
