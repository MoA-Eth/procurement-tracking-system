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
  gregorianDate?: string | Date | undefined;
  plannedDays?: number | undefined;
  remarks?: string | undefined;
}

export async function generateStagesForActivity(
  tx: Prisma.TransactionClient,
  activityId: string,
  procurementMethodId: string,
  customStages?: CustomStageInput[],
) {
  // 1. Fetch the templates for the given procurement method
  let templates = await tx.stageTemplate.findMany({
    where: { procurementMethodId },
    include: { stageType: true },
    orderBy: { sequence: 'asc' },
  });

  if (templates.length === 0) {
    const currentMethod = await tx.lookupValue.findUnique({
      where: { id: procurementMethodId },
    });
    if (currentMethod) {
      const codeSuffix = currentMethod.code.replace(/^PM_|^STEP_/, '');
      const fallbackMethod = await tx.lookupValue.findFirst({
        where: {
          type: 'PROCUREMENT_METHOD',
          id: { not: procurementMethodId },
          OR: [
            { code: codeSuffix },
            { code: `STEP_${codeSuffix}` },
            { label: { contains: codeSuffix, mode: 'insensitive' } },
          ],
        },
      });
      if (fallbackMethod) {
        templates = await tx.stageTemplate.findMany({
          where: { procurementMethodId: fallbackMethod.id },
          include: { stageType: true },
          orderBy: { sequence: 'asc' },
        });
      }
    }
  }

  if (templates.length === 0) {
    // No templates defined for this method yet.
    return [];
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

    const isNA = custom
      ? Boolean(
          custom.notApplicable ||
          custom.isNotApplicable ||
          custom.status === 'NOT_APPLICABLE' ||
          custom.status === 'Not Applicable',
        )
      : false; // Default to NOT_STARTED, never auto-mark N/A without officer input

    let plannedStart: Date | null = null;
    if (!isNA) {
      if (custom?.plannedStartDate || custom?.gregorianDate) {
        const rawDate = custom.plannedStartDate || custom.gregorianDate;
        if (typeof rawDate === 'number') {
          plannedStart = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else if (
          typeof rawDate === 'string' &&
          /^\d{4,6}(?:\.\d+)?$/.test(rawDate.trim())
        ) {
          const num = parseFloat(rawDate.trim());
          plannedStart = new Date(Math.round((num - 25569) * 86400 * 1000));
        } else {
          plannedStart = new Date(rawDate!);
        }
        if (isNaN(plannedStart.getTime())) plannedStart = null;
      }
    }

    const plannedDays = custom?.plannedDays || 14;
    let plannedEnd: Date | null = null;
    if (plannedStart && !isNaN(plannedStart.getTime())) {
      plannedEnd = new Date(plannedStart);
      plannedEnd.setUTCDate(plannedStart.getUTCDate() + plannedDays);
    }

    return {
      activityId,
      stageTypeId: template.stageTypeId,
      sequence: template.sequence,
      status: isNA
        ? StageStatus.NOT_APPLICABLE
        : custom?.status === 'IN_PROGRESS' || custom?.status === 'In Progress'
          ? StageStatus.IN_PROGRESS
          : custom?.status === 'COMPLETED' || custom?.status === 'Completed'
            ? StageStatus.COMPLETED
            : StageStatus.NOT_STARTED,
      plannedStartDate: isNA ? null : plannedStart,
      plannedEndDate: isNA ? null : plannedEnd,
      currentTargetStartDate: isNA ? null : plannedStart,
      currentTargetEndDate: isNA ? null : plannedEnd,
      plannedDays: isNA ? 0 : plannedDays,
      isNotApplicable: isNA,
      remarks: custom?.remarks || null,
    };
  });

  await tx.stage.createMany({
    data: stagesToCreate,
  });

  return stagesToCreate;
}
