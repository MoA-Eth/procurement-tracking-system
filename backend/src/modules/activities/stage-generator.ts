import { StageStatus } from '../../generated/prisma/index.js';
import type { Prisma } from '../../generated/prisma/index.js';

export interface CustomStageInput {
  sequence?: number | undefined;
  stageTypeId?: string | undefined;
  name?: string | undefined;
  notApplicable?: boolean | undefined;
  isNotApplicable?: boolean | undefined;
  status?: string | undefined;
  plannedStartDate?: string | Date | undefined;
  plannedEndDate?: string | Date | undefined;
  currentTargetStartDate?: string | Date | undefined;
  currentTargetEndDate?: string | Date | undefined;
  gregorianDate?: string | Date | undefined;
  plannedDays?: number | undefined;
  remarks?: string | undefined;
}

function getStageStatus(custom: CustomStageInput | undefined, isNA: boolean) {
  if (isNA) return StageStatus.NOT_APPLICABLE;
  if (custom?.status === 'IN_PROGRESS' || custom?.status === 'In Progress') {
    return StageStatus.IN_PROGRESS;
  }
  if (custom?.status === 'COMPLETED' || custom?.status === 'Completed') {
    return StageStatus.COMPLETED;
  }
  return StageStatus.NOT_STARTED;
}

function getStageDates(custom: CustomStageInput | undefined, isNA: boolean) {
  if (isNA) {
    return {
      plannedStartDate: null,
      plannedEndDate: null,
      currentTargetStartDate: null,
      currentTargetEndDate: null,
      plannedDays: 0,
    };
  }

  const rawStartDate =
    custom?.plannedStartDate ||
    custom?.gregorianDate ||
    custom?.currentTargetStartDate;
  let plannedStartDate: Date | null = null;
  if (rawStartDate) {
    const parsedDate = new Date(rawStartDate);
    if (!isNaN(parsedDate.getTime())) plannedStartDate = parsedDate;
  }

  const rawEndDate = custom?.plannedEndDate || custom?.currentTargetEndDate;
  let plannedEndDate: Date | null = null;
  if (rawEndDate) {
    const parsedDate = new Date(rawEndDate);
    if (!isNaN(parsedDate.getTime())) plannedEndDate = parsedDate;
  }

  const plannedDays = custom?.plannedDays || 14;
  if (!plannedEndDate && plannedStartDate) {
    plannedEndDate = new Date(plannedStartDate);
    plannedEndDate.setUTCDate(plannedStartDate.getUTCDate() + plannedDays);
  }

  return {
    plannedStartDate,
    plannedEndDate,
    currentTargetStartDate: plannedStartDate,
    currentTargetEndDate: plannedEndDate,
    plannedDays,
  };
}

function isStageNotApplicable(custom: CustomStageInput | undefined) {
  return Boolean(
    custom?.notApplicable ||
    custom?.isNotApplicable ||
    custom?.status === 'NOT_APPLICABLE' ||
    custom?.status === 'Not Applicable',
  );
}

async function resolveCustomStageType(
  tx: Prisma.TransactionClient,
  custom: CustomStageInput,
  sequence: number,
) {
  if (custom.stageTypeId) {
    const existing = await tx.lookupValue.findUnique({
      where: { id: custom.stageTypeId },
    });
    if (existing) return existing;
  }

  const label = custom.name?.trim() || `Stage ${sequence}`;
  const codeSuffix =
    label
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || String(sequence);
  const code = `STAGE_${codeSuffix}`;

  return tx.lookupValue.upsert({
    where: { type_code: { type: 'STAGE_TYPE', code } },
    create: { type: 'STAGE_TYPE', code, label },
    update: { label, isActive: true },
  });
}

export async function generateStagesForActivity(
  tx: Prisma.TransactionClient,
  activityId: string,
  procurementMethodId: string,
  customStages?: CustomStageInput[],
) {
  // 1. Fetch the templates for the given procurement method
  const templates = await tx.stageTemplate.findMany({
    where: { procurementMethodId },
    include: { stageType: true },
    orderBy: { sequence: 'asc' },
  });

  if (templates.length === 0) {
    if (!customStages?.length) return [];

    const stagesToCreate = [];
    for (let index = 0; index < customStages.length; index++) {
      const custom = customStages[index]!;
      const sequence = custom.sequence ?? index + 1;
      const isNA = isStageNotApplicable(custom);
      const stageType = await resolveCustomStageType(tx, custom, sequence);
      const dates = getStageDates(custom, isNA);
      stagesToCreate.push({
        activityId,
        stageTypeId: stageType.id,
        sequence,
        status: getStageStatus(custom, isNA),
        ...dates,
        isNotApplicable: isNA,
        remarks: custom.remarks || null,
      });
    }

    await tx.stage.createMany({ data: stagesToCreate });
    return stagesToCreate;
  }

  // 2. Create the Stage records for the activity
  const stagesToCreate = templates.map((template, idx: number) => {
    const custom = customStages?.find(
      (cs, csIdx) =>
        cs.sequence === template.sequence ||
        cs.stageTypeId === template.stageTypeId ||
        (cs.name &&
          template.stageType?.label &&
          cs.name.toLowerCase() === template.stageType.label.toLowerCase()) ||
        csIdx === idx,
    );

    const isNA = isStageNotApplicable(custom);
    const dates = getStageDates(custom, isNA);

    return {
      activityId,
      stageTypeId: template.stageTypeId,
      sequence: template.sequence,
      status: getStageStatus(custom, isNA),
      ...dates,
      isNotApplicable: isNA,
      remarks: custom?.remarks || null,
    };
  });

  await tx.stage.createMany({
    data: stagesToCreate,
  });

  return stagesToCreate;
}
