"use client";

import type { AuthUser } from "../../../lib/authTypes";
import { DirectorActivitiesListView } from "../../activities/components/DirectorActivitiesListView";
import { usePlanForReview } from "./review/usePlanForReview";
import { PlanRestrictedEditView } from "./review/PlanRestrictedEditView";
import { PlanFullScreenReviewView } from "./review/PlanFullScreenReviewView";
import { PlanReviewDirectoryTable } from "./review/PlanReviewDirectoryTable";

export interface PlanForReviewViewProps {
  user: AuthUser;
  selectedPlanId?: string;
  selectedActivityRef?: string;
}

export function PlanForReviewView({
  user,
  selectedPlanId,
  selectedActivityRef,
}: PlanForReviewViewProps) {
  const review = usePlanForReview({
    user,
    selectedPlanId,
    selectedActivityRef,
  });

  // VIEW 1: Activity List Table under Particular Plan
  if (review.activitiesPlan) {
    const proj = review.getProjectForPlan(review.activitiesPlan.projectCode);
    return (
      <DirectorActivitiesListView
        plan={review.activitiesPlan}
        project={proj}
        parentSection="plan-for-review"
        userRole={user.role}
        targetActivityRef={selectedActivityRef}
        onBackClick={() => review.setActivitiesPlan(null)}
        onApprovePlan={
          user.role === "DIRECTOR"
            ? (p) => {
                review.handleApprovePlan(p);
                review.setActivitiesPlan(null);
              }
            : undefined
        }
        onReturnPlan={
          user.role === "DIRECTOR"
            ? (p, remarks) => {
                review.setReturnRemarks(remarks);
                review.handleReturnPlan(p, remarks);
                review.setActivitiesPlan(null);
              }
            : undefined
        }
        onCommitteeVote={
          user.role === "ENDORSING_COMMITTEE"
            ? (p, decision, remarks, rejectionDetails) => {
                if (remarks) review.setReturnRemarks(remarks);
                review.handleCommitteeVote(
                  p,
                  decision,
                  remarks,
                  rejectionDetails,
                );
                review.setActivitiesPlan(null);
              }
            : undefined
        }
      />
    );
  }

  // VIEW 2: Director Restricted Form Edit View
  if (review.editingPlan) {
    const proj = review.getProjectForPlan(review.editingPlan.projectCode);
    return (
      <PlanRestrictedEditView
        editingPlan={review.editingPlan}
        project={proj}
        onBackClick={() => review.setEditingPlan(null)}
        onSavePlan={review.handleSavePlanEdits}
      />
    );
  }

  // VIEW 3: Full-Screen Plan Review View
  if (review.selectedPlanForReview) {
    return (
      <PlanFullScreenReviewView
        plan={review.selectedPlanForReview}
        userRole={user.role}
        toastMessage={review.toastMessage}
        onBackClick={() => review.setSelectedPlanForReview(null)}
        onOpenActivitiesPlan={(p) => review.setActivitiesPlan(p)}
        onOpenHistoryModal={(p) => review.setHistoryModalPlan(p)}
        onUpdatePlanName={(newName) => {
          review.setSelectedPlanForReview((prev) =>
            prev ? { ...prev, planName: newName } : null,
          );
          review.setPlans((prev) =>
            prev.map((p) =>
              p.id === review.selectedPlanForReview?.id
                ? { ...p, planName: newName }
                : p,
            ),
          );
        }}
        reviewActivities={review.reviewActivities}
        isSaving={review.isSaving}
        showSavedFeedback={review.showSavedFeedback}
        selectedActivityRef={selectedActivityRef}
        editingActivity={review.editingActivity}
        setEditingActivity={review.setEditingActivity}
        onSaveActivity={review.handleActivityUpdate}
        committeeDeadlineDate={review.committeeDeadlineDate}
        setCommitteeDeadlineDate={review.setCommitteeDeadlineDate}
        returnRemarks={review.returnRemarks}
        setReturnRemarks={review.setReturnRemarks}
        onApprovePlan={review.handleApprovePlan}
        onReturnPlan={review.handleReturnPlan}
        onCommitteeVote={review.handleCommitteeVote}
        isCommitteeRejectionModalOpen={review.isCommitteeRejectionModalOpen}
        setIsCommitteeRejectionModalOpen={
          review.setIsCommitteeRejectionModalOpen
        }
      />
    );
  }

  // MAIN DIRECTORY VIEW: Plans Pending Review Table
  return (
    <PlanReviewDirectoryTable
      userRole={user.role}
      toastMessage={review.toastMessage}
      searchTerm={review.searchTerm}
      setSearchTerm={review.setSearchTerm}
      categoryFilter={review.categoryFilter}
      setCategoryFilter={review.setCategoryFilter}
      budgetYearFilter={review.budgetYearFilter}
      setBudgetYearFilter={review.setBudgetYearFilter}
      regionFilter={review.regionFilter}
      setRegionFilter={review.setRegionFilter}
      filteredPlans={review.filteredPlans}
      loading={review.loading}
      onSelectPlan={(plan) => review.setActivitiesPlan(plan)}
      historyModalPlan={review.historyModalPlan}
      setHistoryModalPlan={review.setHistoryModalPlan}
      pendingApprovePlan={review.pendingApprovePlan}
      setPendingApprovePlan={review.setPendingApprovePlan}
      committeeDeadlineDate={review.committeeDeadlineDate}
      setCommitteeDeadlineDate={review.setCommitteeDeadlineDate}
      onApprovePlan={review.handleApprovePlan}
    />
  );
}
