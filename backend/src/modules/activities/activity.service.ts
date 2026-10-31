import {
  Prisma,
  ActivityStatus,
  PlanStatus,
  StageStatus,
  RevisionEntityType,
  RevisionChangeType,
  UserRole,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logRevision } from '../../shared/audit/revision.service.js';
import { createAuditLog } from '../../shared/audit/audit-logger.js';
import { ApiError } from '../../utils/errors.js';
import {
  generateStagesForActivity,
  type CustomStageInput,
} from './stage-generator.js';
import { notifyOfficersOnEntityChange } from '../alerts/officer-notification.helper.js';
import type {
  CreateActivityInput,
  UpdateActivityInput,
  ReplanStageInput,
  UpdateStageInput,
  UpdateStageActualInput,
} from './activity.schema.js';

// ─── Reference ID Generation ─────────────────────────────────────────────────

async function generateActivityReference(
  procurementMethodId: string,
): Promise<string> {
  const method = await prisma.lookupValue.findUnique({
    where: { id: procurementMethodId },
  });
  const methodCode = (method?.code ?? 'UNK').toUpperCase().replace(/\s+/g, '_');

  const count = await prisma.activity.count({
    where: { procurementMethodId },
  });
  const seq = String(count + 1).padStart(6, '0');

  return `MOA-${methodCode}-${seq}`;
}

// ─── Get Activities ───────────────────────────────────────────────────────────

export const updateReference = async (id: string, newRef: string) => {
  if (!newRef?.trim()) {
    throw ApiError.badRequest('Reference cannot be empty');
  }
  const trimmed = newRef.trim();
  try {
    const updated = await prisma.activity.update({
      where: { id },
      data: { reference: trimmed },
      include: { plan: { include: { project: true } } },
    });
    return updated;
  } catch (e: any) {
    if (e?.code === 'P2002') {
      // unique constraint violation
      throw ApiError.conflict('Reference already in use');
    }
    throw e;
  }
};
  let where: Prisma.ActivityWhereInput = { isActive: true };
  if (planId) {
    const trimmed = planId.trim();
    const targetPlan = await prisma.plan.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { title: { equals: trimmed, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: { id: true, parentPlanId: true },
    });

    const planIds = [trimmed];
    if (targetPlan) {
      if (targetPlan.id && !planIds.includes(targetPlan.id)) {
        planIds.push(targetPlan.id);
      }
      if (targetPlan.parentPlanId && !planIds.includes(targetPlan.parentPlanId)) {
        planIds.push(targetPlan.parentPlanId);
      }
    }

    where = {
      isActive: true,
      OR: [
        { planId: { in: planIds } },
        { plan: { id: { in: planIds } } },
        { plan: { title: { equals: trimmed, mode: 'insensitive' } } },
      ],
    };
  }
  return prisma.activity.findMany({
    where,
    include: {
      plan: { include: { project: true } },
      creator: true,
      updatedByUser: true,
      lots: true,
      fundings: true,
      components: true,
      procurementMethod: true,
      stages: {
        include: { stageType: true, revisions: true },
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};

// ─── Get Activity By ID ───────────────────────────────────────────────────────

export const getActivityByIdService = async (id: string) => {
  return prisma.activity.findFirst({
    where: { id, isActive: true },
    include: {
      plan: true,
      creator: true,
      updatedByUser: true,
      lots: true,
      fundings: true,
      components: true,
      procurementMethod: true,
      stages: {
        include: { stageType: true, revisions: true },
        orderBy: { sequence: 'asc' },
      },
    },
  });
};

// ─── Create Activity ──────────────────────────────────────────────────────────

export const createActivityService = async (
  data: CreateActivityInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Resolve plan by ID or Title
    const trimmedPlanId = data.planId.trim();
    let plan = await tx.plan.findFirst({
      where: {
        id: trimmedPlanId,
        isActive: true,
      },
    });
    if (!plan) {
      plan = await tx.plan.findFirst({
        where: {
          title: { equals: trimmedPlanId, mode: 'insensitive' },
          isActive: true,
        },
      });
    }
    if (!plan) {
      throw new Error(`Plan not found for ID: ${data.planId}`);
    }

    // 2. Resolve Procurement Method ID or Code
    let resolvedMethodId = data.procurementMethodId;
    let method = await tx.lookupValue.findFirst({
      where: {
        OR: [
          { id: resolvedMethodId },
          { code: resolvedMethodId },
          { label: { contains: resolvedMethodId, mode: 'insensitive' } },
        ],
        type: 'PROCUREMENT_METHOD',
      },
    });
    if (!method) {
      method = await tx.lookupValue.findFirst({
        where: { type: 'PROCUREMENT_METHOD' },
      });
    }
    if (method) {
      resolvedMethodId = method.id;
    }

    let reference = (data as { reference?: string }).reference;
    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      reference = await generateActivityReference(resolvedMethodId);
    } else {
      reference = reference.trim();
      const existing = await tx.activity.findUnique({ where: { reference } });
      if (existing) {
        reference = await generateActivityReference(resolvedMethodId);
      }
    }

    const inputWithExtra = data as CreateActivityInput & {
      stages?: unknown;
      roadmap?: unknown;
    };
    const { lots, fundings, components, ...activityData } = inputWithExtra;
    const cleanActivityData = { ...activityData };
    delete (
      cleanActivityData as {
        stages?: unknown;
        roadmap?: unknown;
        planId?: unknown;
        procurementMethodId?: unknown;
      }
    ).stages;
    delete (
      cleanActivityData as {
        stages?: unknown;
        roadmap?: unknown;
        planId?: unknown;
        procurementMethodId?: unknown;
      }
    ).roadmap;
    delete (
      cleanActivityData as {
        stages?: unknown;
        roadmap?: unknown;
        planId?: unknown;
        procurementMethodId?: unknown;
      }
    ).planId;
    delete (
      cleanActivityData as {
        stages?: unknown;
        roadmap?: unknown;
        planId?: unknown;
        procurementMethodId?: unknown;
      }
    ).procurementMethodId;

    const rawClean = cleanActivityData as Record<string, unknown>;
    if (typeof rawClean.domesticPreference === 'boolean') {
      rawClean.domesticPreference = rawClean.domesticPreference ? 'Yes' : 'No';
    }

    let validActUserId: string | undefined = undefined;
    if (userId) {
      const u = await tx.user.findUnique({ where: { id: userId } });
      if (u) validActUserId = u.id;
    }

    const createData: Prisma.ActivityCreateInput = {
      ...(cleanActivityData as unknown as Prisma.ActivityCreateInput),
      reference,
      plan: { connect: { id: plan.id } },
      procurementMethod: { connect: { id: resolvedMethodId } },
      status:
        data.status === 'DRAFT' ? ActivityStatus.DRAFT : ActivityStatus.PLANNED,
      ...(validActUserId
        ? {
            creator: { connect: { id: validActUserId } },
            updatedByUser: { connect: { id: validActUserId } },
          }
        : {}),
    };

    if (lots && lots.length > 0) {
      createData.lots = {
        create: lots.map((l, idx) => ({
          lotNumber: l.lotNumber?.trim() || String(idx + 1),
          description: l.description?.trim() || null,
          estimatedAmount:
            l.estimatedAmount !== undefined ? l.estimatedAmount : null,
        })),
      };
    }

    if (fundings && fundings.length > 0) {
      createData.fundings = {
        create: fundings as Prisma.ActivityFundingCreateWithoutActivityInput[],
      };
    }

    if (components && components.length > 0) {
      createData.components = {
        create:
          components as Prisma.ActivityComponentCreateWithoutActivityInput[],
      };
    }

    const activity = await tx.activity.create({
      data: createData,
      include: {
        lots: true,
        fundings: true,
        components: true,
        creator: true,
        updatedByUser: true,
      },
    });

    // Generate stages from templates or persist the submitted custom roadmap.
    await generateStagesForActivity(
      tx,
      activity.id,
      activity.procurementMethodId,
      data.stages || data.roadmap,
    );

    try {
      if (userId) {
        await logRevision(
          tx,
          RevisionEntityType.ACTIVITY,
          RevisionChangeType.CREATE,
          activity.id,
          userId,
          null,
          activity,
        );
      }
      await createAuditLog(
        {
          userId,
          action: 'ACTIVITY_CREATED',
          entityType: 'ACTIVITY',
          entityId: activity.id,
          changes: {
            reference: activity.reference,
            estimatedBudget: activity.estimatedBudget,
            currency: activity.currency,
            description: activity.description,
          },
        },
        tx,
      );
    } catch (auditErr) {
      console.warn('logRevision activity create error:', auditErr);
    }

    return activity;
  });
};

export const deleteDraftActivityService = async (
  id: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const activity = await tx.activity.findFirst({
      where: { OR: [{ id }, { reference: id }] },
      include: { plan: true },
    });
    if (!activity) throw ApiError.notFound('Activity not found');
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.unauthorized();
    const isOfficer =
      user.authRole === UserRole.OFFICER ||
      (user as { role?: string }).role === 'ProcurementOfficer';
    if (isOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: {
          userId_projectId: { userId, projectId: activity.plan.projectId },
        },
      });
      if (!assignment) {
        throw ApiError.forbidden('You are not assigned to this project.');
      }
    }

    if (!activity.isActive) return activity;

    const editableStatuses: PlanStatus[] = [
      PlanStatus.DRAFT,
      PlanStatus.REJECTED,
      PlanStatus.COMMITTEE_REJECTED,
      PlanStatus.MANAGEMENT_REJECTED,
      PlanStatus.RETURNED_FOR_REVISION,
    ];
    if (!editableStatuses.includes(activity.plan.status)) {
      throw ApiError.conflict(
        `Activity "${activity.reference}" is linked to plan "${activity.plan.title}" (ID: ${activity.planId}), whose current status is ${activity.plan.status}. Activities can only be deleted while the linked plan is editable.`,
      );
    }

    const isDraftActivity =
      activity.status === ActivityStatus.DRAFT ||
      activity.status === ActivityStatus.PLANNED;
    if (!isDraftActivity) {
      throw ApiError.conflict('Only draft activities can be deleted.');
    }

    const deletedActivity = await tx.activity.update({
      where: { id: activity.id },
      data: { isActive: false },
    });
    await logRevision(
      tx,
      RevisionEntityType.ACTIVITY,
      RevisionChangeType.SOFT_DELETE,
      activity.id,
      userId,
      activity,
      deletedActivity,
    );
    return deletedActivity;
  });
};

// ─── Update Activity ──────────────────────────────────────────────────────────

export const updateActivityService = async (
  id: string,
  data: UpdateActivityInput,
  userId: string,
) => {
  const { activity, oldActivity, user } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const oldActivity = await tx.activity.findUniqueOrThrow({
        where: { id },
        include: { plan: true },
      });
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (
        user &&
        (user.authRole === UserRole.OFFICER ||
          (user as { role?: string }).role === 'ProcurementOfficer')
      ) {
        const assignment = await tx.userProject.findUnique({
          where: {
            userId_projectId: { userId, projectId: oldActivity.plan.projectId },
          },
        });
        if (!assignment)
          throw new Error('You are not assigned to this project.');
        const editableStatuses: PlanStatus[] = [
          PlanStatus.DRAFT,
          PlanStatus.REJECTED,
          PlanStatus.RETURNED_FOR_REVISION,
        ];
        if (!editableStatuses.includes(oldActivity.plan.status)) {
          throw new Error(
            `Cannot edit activities in a plan with status ${oldActivity.plan.status}. Plan must be in DRAFT, RETURNED_FOR_REVISION, REJECTED, or UPDATE_REQUESTED status.`,
          );
        }
      }

      const inputWithExtra = data as UpdateActivityInput & {
        stages?: unknown;
        roadmap?: unknown;
      };
      const { lots, fundings, components, ...scalarData } = inputWithExtra;
      const cleanScalarData = { ...scalarData };
      delete (cleanScalarData as { stages?: unknown; roadmap?: unknown })
        .stages;
      delete (cleanScalarData as { stages?: unknown; roadmap?: unknown })
        .roadmap;

      const rawScalar = cleanScalarData as Record<string, unknown>;
      if (typeof rawScalar.domesticPreference === 'boolean') {
        rawScalar.domesticPreference = rawScalar.domesticPreference
          ? 'Yes'
          : 'No';
      }

      let resolvedMethodId: string | undefined = undefined;
      if (
        cleanScalarData.procurementMethodId &&
        typeof cleanScalarData.procurementMethodId === 'string'
      ) {
        resolvedMethodId = cleanScalarData.procurementMethodId;
        delete (cleanScalarData as { procurementMethodId?: unknown })
          .procurementMethodId;
      }
      delete (cleanScalarData as { planId?: unknown }).planId;

      // Replace child records if provided
      if (fundings !== undefined) {
        await tx.activityFunding.deleteMany({ where: { activityId: id } });
      }
      if (components !== undefined) {
        await tx.activityComponent.deleteMany({ where: { activityId: id } });
      }
      if (lots !== undefined) {
        await tx.activityLot.deleteMany({ where: { activityId: id } });
      }

      const updateData: Prisma.ActivityUpdateInput = {
        ...(cleanScalarData as unknown as Prisma.ActivityUpdateInput),
        ...(resolvedMethodId
          ? { procurementMethod: { connect: { id: resolvedMethodId } } }
          : {}),
        ...(user ? { updatedByUser: { connect: { id: user.id } } } : {}),
      };

      if (fundings !== undefined && fundings.length > 0) {
        updateData.fundings = {
          create:
            fundings as Prisma.ActivityFundingCreateWithoutActivityInput[],
        };
      }

      if (components !== undefined && components.length > 0) {
        updateData.components = {
          create:
            components as Prisma.ActivityComponentCreateWithoutActivityInput[],
        };
      }

      if (lots !== undefined && lots.length > 0) {
        updateData.lots = {
          create: lots.map((l, idx) => ({
            lotNumber: l.lotNumber?.trim() || String(idx + 1),
            description: l.description?.trim() || null,
            estimatedAmount:
              l.estimatedAmount !== undefined ? l.estimatedAmount : null,
          })),
        };
      }

      const activity = await tx.activity.update({
        where: { id },
        data: updateData,
        include: {
          lots: true,
          fundings: true,
          components: true,
          creator: true,
          updatedByUser: true,
        },
      });

      // Update stages if provided
      const stageInputs = (inputWithExtra.stages ||
        inputWithExtra.roadmap) as unknown as CustomStageInput[];
      if (Array.isArray(stageInputs) && stageInputs.length > 0) {
        const existingStages = await tx.stage.findMany({
          where: { activityId: id },
          include: { stageType: true },
          orderBy: { sequence: 'asc' },
        });

        if (existingStages.length > 0) {
          for (let idx = 0; idx < existingStages.length; idx++) {
            const st = existingStages[idx];
            if (!st) continue;

            const custom = stageInputs.find(
              (cs, csIdx) =>
                cs.sequence === st.sequence ||
                cs.stageTypeId === st.stageTypeId ||
                (typeof cs.name === 'string' &&
                  st.stageType?.label &&
                  cs.name.toLowerCase() === st.stageType.label.toLowerCase()) ||
                csIdx === idx,
            );
            if (custom) {
              const isNA = Boolean(
                custom.notApplicable ||
                custom.isNotApplicable ||
                custom.status === 'NOT_APPLICABLE' ||
                custom.status === 'Not Applicable',
              );
              let plannedStart: Date | null = null;
              if (!isNA) {
                const rawDate =
                  custom.plannedStartDate ||
                  custom.gregorianDate ||
                  custom.currentTargetStartDate;
                if (rawDate) {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) plannedStart = d;
                }
              }
              const plannedDays =
                Number(custom.plannedDays) || st.plannedDays || 14;
              let plannedEnd: Date | null = null;
              const rawEndDate =
                custom.plannedEndDate || custom.currentTargetEndDate;
              if (rawEndDate) {
                const parsedEndDate = new Date(rawEndDate);
                if (!isNaN(parsedEndDate.getTime())) {
                  plannedEnd = parsedEndDate;
                }
              }
              if (
                !plannedEnd &&
                plannedStart &&
                !isNaN(plannedStart.getTime())
              ) {
                plannedEnd = new Date(plannedStart);
                plannedEnd.setUTCDate(plannedStart.getUTCDate() + plannedDays);
              }
              await tx.stage.update({
                where: { id: st.id },
                data: {
                  plannedStartDate: isNA
                    ? null
                    : plannedStart || st.plannedStartDate,
                  plannedEndDate: isNA ? null : plannedEnd || st.plannedEndDate,
                  currentTargetStartDate: isNA
                    ? null
                    : plannedStart || st.currentTargetStartDate,
                  currentTargetEndDate: isNA
                    ? null
                    : plannedEnd || st.currentTargetEndDate,
                  isNotApplicable: isNA,
                  remarks:
                    custom.remarks !== undefined
                      ? custom.remarks
                        ? String(custom.remarks)
                        : null
                      : st.remarks,
                  status: isNA
                    ? StageStatus.NOT_APPLICABLE
                    : custom.status === 'IN_PROGRESS' ||
                        custom.status === 'In Progress'
                      ? StageStatus.IN_PROGRESS
                      : custom.status === 'COMPLETED' ||
                          custom.status === 'Completed'
                        ? StageStatus.COMPLETED
                        : st.status,
                },
              });
            }
          }
        } else {
          await generateStagesForActivity(
            tx,
            activity.id,
            activity.procurementMethodId,
            stageInputs,
          );
        }
      }

      await logRevision(
        tx,
        RevisionEntityType.ACTIVITY,
        RevisionChangeType.UPDATE,
        id,
        userId,
        oldActivity,
        activity,
      );

      await createAuditLog(
        {
          userId,
          action: 'ACTIVITY_UPDATED',
          entityType: 'ACTIVITY',
          entityId: activity.id,
          changes: {
            reference: activity.reference,
            previousEstimatedBudget: oldActivity.estimatedBudget,
            newEstimatedBudget: activity.estimatedBudget,
            currency: activity.currency,
          },
        },
        tx,
      );

      return { activity, oldActivity, user };
    },
  );

  if (
    user?.authRole === UserRole.DIRECTOR &&
    oldActivity.plan.status !== PlanStatus.DRAFT
  ) {
    const directorName = user.displayName || user.name || 'Director';
    const activityTitle = activity.reference || 'Activity';
    notifyOfficersOnEntityChange({
      planId: oldActivity.planId,
      projectId: oldActivity.plan.projectId,
      creatorId: oldActivity.plan.createdBy,
      actorUserId: user.id,
      title: `Activity Modified by Director: ${activityTitle}`,
      message: `Director ${directorName} made changes to activity "${activityTitle}" in procurement plan "${oldActivity.plan.title}".`,
      type: 'PLAN_REVIEW',
      severity: 'INFO',
      link: '/workspace/plan-management',
    }).catch(() => {});
  }

  return activity;
};

// ─── Stage Status Calculation ────────────────────────────────────────────────
function determineStageStatus(stage: {
  isNotApplicable: boolean;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  currentTargetEndDate: Date | null;
}): StageStatus {
  if (stage.isNotApplicable) {
    return StageStatus.NOT_APPLICABLE;
  }
  if (stage.actualEndDate) {
    return StageStatus.COMPLETED;
  }
  if (stage.actualStartDate) {
    return StageStatus.IN_PROGRESS;
  }
  if (stage.currentTargetEndDate && stage.currentTargetEndDate < new Date()) {
    return StageStatus.DELAYED;
  }
  return StageStatus.NOT_STARTED;
}

// ─── Stage: Update Planning Dates ────────────────────────────────────────────

export const updateStageService = async (
  stageId: string,
  data: UpdateStageInput,
  userId?: string,
) => {
  const { updatedStage, stage } = await prisma.$transaction(async (tx) => {
    const stage = await tx.stage.findUniqueOrThrow({
      where: { id: stageId },
      include: {
        stageType: true,
        activity: { include: { plan: true } },
      },
    });

    const updateData: Prisma.StageUpdateInput = {};
    if (data.plannedStartDate !== undefined) {
      updateData.plannedStartDate = data.plannedStartDate;
      updateData.currentTargetStartDate = data.plannedStartDate;
    }
    if (data.plannedEndDate !== undefined) {
      updateData.plannedEndDate = data.plannedEndDate;
      updateData.currentTargetEndDate = data.plannedEndDate;
    }
    if (data.plannedDays !== undefined)
      updateData.plannedDays = data.plannedDays;
    if (data.isNotApplicable !== undefined)
      updateData.isNotApplicable = data.isNotApplicable;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    // Pre-calculate status
    const tempStage = {
      isNotApplicable:
        data.isNotApplicable !== undefined
          ? data.isNotApplicable
          : stage.isNotApplicable,
      actualStartDate: stage.actualStartDate,
      actualEndDate: stage.actualEndDate,
      currentTargetEndDate:
        data.plannedEndDate !== undefined
          ? data.plannedEndDate
          : stage.currentTargetEndDate,
    };
    updateData.status = determineStageStatus(tempStage);

    const updatedStage = await tx.stage.update({
      where: { id: stageId },
      data: updateData,
    });

    await createAuditLog(
      {
        userId: userId ?? null,
        action: 'STAGE_UPDATED',
        entityType: 'STAGE',
        entityId: stage.id,
        changes: {
          stageName: stage.stageType?.label || `Stage ${stage.sequence}`,
          activityRef: stage.activity?.reference,
          status: updatedStage.status,
        },
      },
      tx,
    );

    return { updatedStage, stage };
  });

  if (updatedStage.status !== stage.status) {
    const stageName = stage.stageType?.label || `Stage ${stage.sequence}`;
    const activityName = stage.activity?.reference || 'Activity';
    notifyOfficersOnEntityChange({
      planId: stage.activity.planId,
      projectId: stage.activity.plan.projectId,
      creatorId: stage.activity.plan.createdBy,
      actorUserId: userId,
      title: `Stage Status Updated: ${stageName}`,
      message: `Stage "${stageName}" in activity "${activityName}" status changed to ${updatedStage.status.replace('_', ' ')}.`,
      type: 'SYSTEM',
      severity: 'INFO',
      link: '/workspace/plan-management',
    }).catch(() => {});
  }

  return updatedStage;
};

// ─── Stage: Record Actual Date ────────────────────────────────────────────────

export const updateStageActualService = async (
  stageId: string,
  data: UpdateStageActualInput,
  userId?: string,
) => {
  const { updatedStage, stage } = await prisma.$transaction(async (tx) => {
    const stage = await tx.stage.findUniqueOrThrow({
      where: { id: stageId },
      include: {
        stageType: true,
        activity: { include: { plan: true, stages: true } },
      },
    });

    const newStartDate =
      data.actualStartDate !== undefined
        ? data.actualStartDate
        : stage.actualStartDate;
    const newEndDate =
      data.actualEndDate !== undefined
        ? data.actualEndDate
        : stage.actualEndDate;

    // Enforce Date order: Actual completion cannot precede start date or preceding stages' actual completions
    if (newEndDate) {
      const end = new Date(newEndDate);
      if (newStartDate && new Date(newStartDate) > end) {
        throw new Error('Actual end date cannot precede actual start date.');
      }
      for (const other of stage.activity.stages) {
        if (
          other.sequence < stage.sequence &&
          !other.isNotApplicable &&
          other.actualEndDate &&
          new Date(other.actualEndDate) > end
        ) {
          throw new Error(
            `Actual end date cannot precede the actual completion of preceding stage (${other.sequence}).`,
          );
        }
      }
    }

    const updateData: Prisma.StageUpdateInput = {};
    if (data.actualStartDate !== undefined)
      updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined)
      updateData.actualEndDate = data.actualEndDate;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    // Sync status
    const tempStage = {
      isNotApplicable: stage.isNotApplicable,
      actualStartDate: newStartDate,
      actualEndDate: newEndDate,
      currentTargetEndDate: stage.currentTargetEndDate,
    };
    updateData.status = determineStageStatus(tempStage);

    const updatedStage = await tx.stage.update({
      where: { id: stageId },
      data: updateData,
    });

    await createAuditLog(
      {
        userId: userId ?? null,
        action: 'STAGE_UPDATED',
        entityType: 'STAGE',
        entityId: stage.id,
        changes: {
          stageName: stage.stageType?.label || `Stage ${stage.sequence}`,
          activityRef: stage.activity?.reference,
          status: updatedStage.status,
          actualStartDate: data.actualStartDate,
          actualEndDate: data.actualEndDate,
        },
      },
      tx,
    );

    return { updatedStage, stage };
  });

  if (updatedStage.status !== stage.status) {
    const stageName = stage.stageType?.label || `Stage ${stage.sequence}`;
    const activityName = stage.activity?.reference || 'Activity';
    notifyOfficersOnEntityChange({
      planId: stage.activity.planId,
      projectId: stage.activity.plan.projectId,
      creatorId: stage.activity.plan.createdBy,
      actorUserId: userId,
      title: `Stage Status Updated: ${stageName}`,
      message: `Stage "${stageName}" in activity "${activityName}" status changed to ${updatedStage.status.replace('_', ' ')}.`,
      type: 'SYSTEM',
      severity: 'INFO',
      link: '/workspace/plan-management',
    }).catch(() => {});
  }

  return updatedStage;
};

// ─── Stage: Replan (create revision record) ───────────────────────────────────

export const replanStageService = async (
  stageId: string,
  data: ReplanStageInput,
  userId: string,
) => {
  const { updatedStage, stage, user } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const stage = await tx.stage.findUniqueOrThrow({
        where: { id: stageId },
        include: {
          stageType: true,
          activity: { include: { plan: true } },
        },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });

      // Get next revision number
      const lastRevision = await tx.stageRevision.findFirst({
        where: { stageId },
        orderBy: { revisionNo: 'desc' },
      });
      const nextRevisionNo = (lastRevision?.revisionNo ?? 0) + 1;

      // Create revision record (preserves history)
      const revisionData: Prisma.StageRevisionUncheckedCreateInput = {
        stageId,
        revisionNo: nextRevisionNo,
        revisedStartDate: data.revisedStartDate,
        reason: data.reason,
        revisedById: userId,
      };
      if (data.revisedEndDate !== undefined) {
        revisionData.revisedEndDate = data.revisedEndDate;
      }

      await tx.stageRevision.create({
        data: revisionData,
      });

      // Update the effective current target on stage
      const stageUpdateData: Prisma.StageUpdateInput = {
        currentTargetStartDate: data.revisedStartDate,
      };
      if (data.revisedEndDate !== undefined) {
        stageUpdateData.currentTargetEndDate = data.revisedEndDate;
      }

      // Pre-calculate status with new target end date
      const tempStage = {
        isNotApplicable: stage.isNotApplicable,
        actualStartDate: stage.actualStartDate,
        actualEndDate: stage.actualEndDate,
        currentTargetEndDate:
          data.revisedEndDate !== undefined
            ? data.revisedEndDate
            : stage.currentTargetEndDate,
      };
      stageUpdateData.status = determineStageStatus(tempStage);

      const updatedStage = await tx.stage.update({
        where: { id: stage.id },
        data: stageUpdateData,
        include: { revisions: { orderBy: { revisionNo: 'asc' } } },
      });

      await createAuditLog(
        {
          userId,
          action: 'STAGE_REPLANNED',
          entityType: 'STAGE',
          entityId: stage.id,
          changes: {
            stageName: stage.stageType?.label || `Stage ${stage.sequence}`,
            activityRef: stage.activity?.reference,
            reason: data.reason,
            revisedStartDate: data.revisedStartDate,
            revisedEndDate: data.revisedEndDate,
          },
        },
        tx,
      );

      return { updatedStage, stage, user };
    },
  );

  const actorName = user?.displayName || user?.name || 'User';
  const stageName = stage.stageType?.label || `Stage ${stage.sequence}`;
  const activityName = stage.activity?.reference || 'Activity';

  notifyOfficersOnEntityChange({
    planId: stage.activity.planId,
    projectId: stage.activity.plan.projectId,
    creatorId: stage.activity.plan.createdBy,
    actorUserId: userId,
    title: `Stage Target Date Revised: ${stageName}`,
    message: `${actorName} revised target dates for stage "${stageName}" in activity "${activityName}". Reason: ${data.reason}`,
    type: 'SYSTEM',
    severity: 'MEDIUM',
    link: '/workspace/plan-management',
  }).catch(() => {});

  return updatedStage;
};
