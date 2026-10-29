type Stage = { status: string; isNotApplicable: boolean; currentTargetEndDate: Date | null; plannedEndDate: Date | null };
export function operationalSummary(projects: number, plans: { status: string; managementDecision: string | null }[], activities: { status: string; stages: Stage[] }[], now: Date) {
  const reviewStatuses = new Set(['SUBMITTED', 'PENDING_REVIEW', 'UPDATE_REQUESTED', 'RETURNED_FOR_REVISION', 'REJECTED', 'COMMITTEE_REJECTED']);
  const delayed = activities.filter((activity) => activity.status === 'DELAYED' || activity.stages.some((stage) => {
    if (stage.isNotApplicable || stage.status === 'COMPLETED') return false;
    const due = stage.currentTargetEndDate || stage.plannedEndDate;
    return stage.status === 'DELAYED' || (!!due && due.getTime() < now.getTime());
  })).length;
  return {
    projects, plans: plans.length,
    directorReview: plans.filter((plan) => reviewStatuses.has(plan.status)).length,
    committeeReview: plans.filter((plan) => ['WITH_COMMITTEE', 'UNDER_COMMITTEE_REVIEW'].includes(plan.status)).length,
    executiveApproval: plans.filter((plan) => !plan.managementDecision && ['AWAITING_MANAGEMENT_APPROVAL', 'COMMITTEE_ENDORSED'].includes(plan.status)).length,
    delayedActivities: delayed,
    activities: activities.length,
    activitiesWithStages: activities.filter((activity) => activity.stages.some((stage) => !stage.isNotApplicable)).length,
  };
}
