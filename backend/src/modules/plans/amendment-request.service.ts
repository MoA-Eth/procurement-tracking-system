import {
  ActivityStatus,
  AmendmentEntityType,
  AmendmentRequestStatus,
  Prisma,
  PlanStatus,
  UserRole,
  VoteDecision,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { createNotification } from '../alerts/alerts.service.js';
import { ApiError } from '../../utils/errors.js';
import { getAmendmentCommitteeNextStatus } from './amendment-request-workflow.js';
import { syncPlanActivityStatuses } from './plan-activity-status.js';

const pendingStatuses = [
  AmendmentRequestStatus.PENDING_DIRECTOR,
  AmendmentRequestStatus.PENDING_COMMITTEE,
  AmendmentRequestStatus.PENDING_MANAGEMENT,
];

const roleStages: Record<string, AmendmentRequestStatus> = {
  DIRECTOR: AmendmentRequestStatus.PENDING_DIRECTOR,
  ProcurementDirector: AmendmentRequestStatus.PENDING_DIRECTOR,
  ENDORSING_COMMITTEE: AmendmentRequestStatus.PENDING_COMMITTEE,
  ManagementTeam: AmendmentRequestStatus.PENDING_MANAGEMENT,
  MANAGEMENT: AmendmentRequestStatus.PENDING_MANAGEMENT,
};

const amendmentRequestDetails = {
  requestedBy: { select: { id: true, name: true, displayName: true } },
  committeeVotes: { orderBy: { createdAt: 'asc' as const } },
  plan: {
    include: {
      project: { select: { code: true, name: true } },
      activities: {
        where: { isActive: true },
        include: {
          procurementMethod: { select: { code: true, label: true } },
        },
        orderBy: { reference: 'asc' },
      },
    },
  },
  activity: {
    include: {
      procurementMethod: { select: { code: true, label: true } },
      lots: true,
      fundings: true,
      components: true,
      plan: {
        include: {
          project: { select: { code: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.AmendmentRequestInclude;

const approvedPlanStatuses: PlanStatus[] = [
  PlanStatus.APPROVED,
  PlanStatus.MANAGEMENT_APPROVED,
];

const assertOfficerAssignment = async (
  userId: string,
  projectId: string,
  role: string,
) => {
  if (role !== UserRole.OFFICER && role !== 'ProcurementOfficer') {
    return;
  }
  const assignment = await prisma.userProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!assignment) {
    throw ApiError.forbidden('You are not assigned to this project.');
  }
};

export const createAmendmentRequest = async (
  userId: string,
  role: string,
  input: { entityType: AmendmentEntityType; entityId: string; reason: string },
) => {
  const plan =
    input.entityType === AmendmentEntityType.PLAN
      ? await prisma.plan.findFirst({
          where: { OR: [{ id: input.entityId }, { title: input.entityId }] },
          select: { id: true, projectId: true, status: true, isActive: true },
        })
      : null;
  const activity =
    input.entityType === AmendmentEntityType.ACTIVITY
      ? await prisma.activity.findFirst({
          where: {
            OR: [{ id: input.entityId }, { reference: input.entityId }],
          },
          include: { plan: { select: { projectId: true, status: true } } },
        })
      : null;

  if ((!plan || !plan.isActive) && (!activity || !activity.isActive)) {
    throw ApiError.notFound('Approved plan or activity not found.');
  }
  const parentStatus = plan?.status ?? activity?.plan.status;
  const projectId = plan?.projectId ?? activity?.plan.projectId;
  if (!parentStatus || !projectId) {
    throw ApiError.notFound('Approved plan or activity not found.');
  }
  if (!approvedPlanStatuses.includes(parentStatus)) {
    throw ApiError.conflict(
      'Amendments can only be requested for approved plans or activities.',
    );
  }
  await assertOfficerAssignment(userId, projectId, role);

  const planId =
    input.entityType === AmendmentEntityType.PLAN ? (plan?.id ?? null) : null;
  const activityId =
    input.entityType === AmendmentEntityType.ACTIVITY
      ? (activity?.id ?? null)
      : null;
  const activeRequest = await prisma.amendmentRequest.findFirst({
    where: {
      status: { in: pendingStatuses },
      ...(planId ? { planId } : { activityId }),
    },
    select: { id: true },
  });
  if (activeRequest) {
    throw ApiError.conflict(
      'There is already an amendment request awaiting a decision for this item.',
    );
  }

  const request = await prisma.amendmentRequest.create({
    data: {
      entityType: input.entityType,
      planId,
      activityId,
      requestedById: userId,
      reason: input.reason.trim(),
    },
    include: {
      requestedBy: { select: { id: true, name: true, displayName: true } },
      plan: {
        select: {
          id: true,
          title: true,
          project: { select: { code: true, name: true } },
        },
      },
      activity: {
        select: {
          id: true,
          reference: true,
          description: true,
          plan: {
            select: {
              id: true,
              title: true,
              project: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  });
  await createNotification({
    targetRole: 'DIRECTOR',
    title: 'Amendment request awaiting review',
    message: `An officer requested an amendment to ${input.entityType.toLowerCase()} ${input.entityId}.`,
    type: 'PLAN_REVIEW',
    severity: 'HIGH',
    link: '/workspace/amendment-requests',
  });
  return request;
};

export const listAmendmentRequests = async (role: string, userId?: string) => {
  if (role === UserRole.OFFICER || role === 'ProcurementOfficer') {
    if (!userId) throw ApiError.unauthorized();
    return prisma.amendmentRequest.findMany({
      where: { requestedById: userId },
      include: amendmentRequestDetails,
      orderBy: { createdAt: 'desc' },
    });
  }
  const stage = roleStages[role];
  if (!stage) {
    throw ApiError.forbidden('You cannot review amendment requests.');
  }
  return prisma.amendmentRequest.findMany({
    where: { status: stage },
    include: amendmentRequestDetails,
    orderBy: { createdAt: 'asc' },
  });
};

export const decideAmendmentRequest = async (
  id: string,
  userId: string,
  role: string,
  decision: 'APPROVE' | 'REJECT' | 'RETURN',
  comment: string,
) => {
  const stage = roleStages[role];
  if (!stage) {
    throw ApiError.forbidden('You cannot review amendment requests.');
  }

  const updatedRequest = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AmendmentRequest" WHERE "id" = ${id} FOR UPDATE`;
    const request = await tx.amendmentRequest.findUnique({
      where: { id },
      include: {
        plan: true,
        activity: { include: { plan: true } },
        committeeVotes: true,
      },
    });
    if (!request) throw ApiError.notFound('Amendment request not found.');
    if (request.status !== stage) {
      throw ApiError.conflict(
        'This request is not awaiting a decision from your role.',
      );
    }

    if (stage === AmendmentRequestStatus.PENDING_COMMITTEE) {
      if (decision === 'RETURN') {
        await tx.amendmentRequest.update({
          where: { id },
          data: {
            status: AmendmentRequestStatus.RETURNED,
            committeeId: userId,
            committeeComment: comment,
            committeeAt: new Date(),
          },
        });
      } else {
        await tx.amendmentCommitteeVote.upsert({
          where: { requestId_memberId: { requestId: id, memberId: userId } },
          update: { decision, comment },
          create: {
            requestId: id,
            memberId: userId,
            decision:
              decision === 'APPROVE'
                ? VoteDecision.APPROVE
                : VoteDecision.REJECT,
            comment,
          },
        });

        const votes = await tx.amendmentCommitteeVote.findMany({
          where: { requestId: id },
          select: { decision: true },
        });
        const approvalCount = votes.filter(
          (vote) => vote.decision === 'APPROVE',
        ).length;
        const rejectionCount = votes.filter(
          (vote) => vote.decision === 'REJECT',
        ).length;
        const nextStatus = getAmendmentCommitteeNextStatus(
          approvalCount,
          rejectionCount,
        );

        await tx.amendmentRequest.update({
          where: { id },
          data: {
            status: nextStatus,
            committeeId: userId,
            committeeComment: comment,
            committeeAt: new Date(),
          },
        });
      }

      return tx.amendmentRequest.findUniqueOrThrow({
        where: { id },
        include: amendmentRequestDetails,
      });
    }

    const isTerminal = decision !== 'APPROVE';
    const nextStatus =
      decision === 'REJECT'
        ? AmendmentRequestStatus.REJECTED
        : decision === 'RETURN'
          ? AmendmentRequestStatus.RETURNED
          : stage === AmendmentRequestStatus.PENDING_DIRECTOR
            ? AmendmentRequestStatus.PENDING_COMMITTEE
            : AmendmentRequestStatus.APPROVED;

    const updateData = {
      status: nextStatus,
      ...(stage === AmendmentRequestStatus.PENDING_DIRECTOR
        ? {
            directorId: userId,
            directorComment: comment,
            directorAt: new Date(),
          }
        : {}),
      ...(stage === AmendmentRequestStatus.PENDING_MANAGEMENT
        ? {
            managementId: userId,
            managementComment: comment,
            managementAt: new Date(),
          }
        : {}),
    };

    const updated = await tx.amendmentRequest.updateMany({
      where: { id, status: stage },
      data: updateData,
    });
    if (updated.count !== 1) {
      throw ApiError.conflict('This amendment request was already reviewed.');
    }

    if (!isTerminal && nextStatus === AmendmentRequestStatus.APPROVED) {
      if (request.entityType === AmendmentEntityType.PLAN && request.plan) {
        await syncPlanActivityStatuses(
          tx,
          request.plan.id,
          PlanStatus.DRAFT,
        );
        await tx.plan.update({
          where: { id: request.plan.id },
          data: {
            status: PlanStatus.DRAFT,
            approvedById: null,
            approvedAt: null,
            rejectedById: null,
            rejectedAt: null,
            rejectionReason: null,
            managementDecision: null,
            managementComment: null,
            managementById: null,
            managementAt: null,
            directorRevisionComment: null,
            committeeVoteDeadline: null,
          },
        });
      } else if (
        request.entityType === AmendmentEntityType.ACTIVITY &&
        request.activity
      ) {
        await tx.activity.update({
          where: { id: request.activity.id },
          data: { status: ActivityStatus.DRAFT },
        });
      }
    }

    return tx.amendmentRequest.findUniqueOrThrow({
      where: { id },
      include: amendmentRequestDetails,
    });
  });
  if (
    updatedRequest.status === AmendmentRequestStatus.PENDING_COMMITTEE &&
    stage === AmendmentRequestStatus.PENDING_DIRECTOR
  ) {
    await createNotification({
      targetRole: 'ENDORSING_COMMITTEE',
      title: 'Amendment request awaiting committee vote',
      message: `The Director approved an amendment request for ${updatedRequest.plan?.title ?? updatedRequest.activity?.reference ?? 'a procurement item'}. At least three committee approvals are required to forward it to management.`,
      type: 'PLAN_REVIEW',
      severity: 'HIGH',
      link: '/workspace/amendment-requests',
    });
  } else if (
    updatedRequest.status === AmendmentRequestStatus.PENDING_MANAGEMENT
  ) {
    await createNotification({
      targetRole: 'MANAGEMENT',
      title: 'Amendment request awaiting review',
      message: `The Endorsement Committee reached at least three approvals for the amendment request to ${updatedRequest.plan?.title ?? updatedRequest.activity?.reference ?? 'a procurement item'}. It is awaiting management review.`,
      type: 'PLAN_REVIEW',
      severity: 'HIGH',
      link: '/workspace/amendment-requests',
    });
  } else if (
    updatedRequest.status === AmendmentRequestStatus.RETURNED ||
    updatedRequest.status === AmendmentRequestStatus.REJECTED ||
    updatedRequest.status === AmendmentRequestStatus.APPROVED
  ) {
    await createNotification({
      userId: updatedRequest.requestedById,
      title: `Amendment request ${updatedRequest.status.toLowerCase()}`,
      message:
        updatedRequest.status === AmendmentRequestStatus.APPROVED
          ? 'Your amendment request was approved. You can now edit the approved item.'
          : `Your amendment request was ${updatedRequest.status.toLowerCase()}. Review the comments and submit a new request if changes are still needed.`,
      type: 'PLAN_REVIEW',
      severity:
        updatedRequest.status === AmendmentRequestStatus.APPROVED
          ? 'INFO'
          : 'MEDIUM',
      link: '/workspace/amendment-requests',
    });
  }
  return updatedRequest;
};
