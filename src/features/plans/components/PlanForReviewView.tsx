"use client";

import { useRouter } from "next/navigation";
import type { AuthUser } from "../../../lib/authTypes";
import { DirectorActivitiesListView } from "../../activities/components/DirectorActivitiesListView";
import { usePlanForReview } from "./review/usePlanForReview";
import { PlanRestrictedEditView } from "./review/PlanRestrictedEditView";
import { PlanFullScreenReviewView } from "./review/PlanFullScreenReviewView";
import { PlanReviewDirectoryTable } from "./review/PlanReviewDirectoryTable";
import { isPlanAwaitingManagementReview } from "../plansData";

export interface PlanForReviewViewProps {
  user: AuthUser;
  selectedPlanId?: string;
  selectedActivityRef?: string;
  from?: string;
}

export function PlanForReviewView({
  user,
  selectedPlanId,
  selectedActivityRef,
  from,
}: PlanForReviewViewProps) {
  const router = useRouter();
  const review = usePlanForReview({
    user,
    selectedPlanId,
    selectedActivityRef,
  });

  // VIEW 1: Activity List Table under Particular Plan
  if (review.activitiesPlan) {
    const proj = review.getProjectForPlan(review.activitiesPlan.projectCode);
    const handleActivitiesBack = () => {
      if (from === "vote-progress") {
        router.push(
          `/workspace/vote-progress?plan=${encodeURIComponent(review.activitiesPlan?.reference || review.activitiesPlan?.planName || review.activitiesPlan?.id || "")}`,
        );
      } else {
        review.closeActivitiesPlan();
      }
    };

    return (
      <DirectorActivitiesListView
        plan={review.activitiesPlan}
        project={proj}
        parentSection="plan-for-review"
        from={from}
        userRole={user.role}
        targetActivityRef={selectedActivityRef}
        onBackClick={handleActivitiesBack}
        onApprovePlan={
          user.role === "DIRECTOR" && from !== "vote-progress"
            ? (p) => {
                review.handleApprovePlan(p);
                review.closeActivitiesPlan();
              }
            : undefined
        }
        onReturnPlan={
          user.role === "DIRECTOR" && from !== "vote-progress"
            ? (p, remarks) => {
                review.setReturnRemarks(remarks);
                review.handleReturnPlan(p, remarks);
                review.closeActivitiesPlan();
              }
            : undefined
        }
        onCommitteeVote={
          user.role === "ENDORSING_COMMITTEE" && from !== "vote-progress"
            ? (p, decision, remarks, rejectionDetails) => {
                if (remarks) review.setReturnRemarks(remarks);
                review.handleCommitteeVote(
                  p,
                  decision,
                  remarks,
                  rejectionDetails,
                );
                review.closeActivitiesPlan();
              }
            : undefined
        }
        onManagementDecision={
          user.role === "MANAGEMENT" &&
          from !== "vote-progress" &&
          isPlanAwaitingManagementReview(review.activitiesPlan)
            ? (p, decision, comment) => {
                review.handleManagementDecision(p, decision, comment);
                review.closeActivitiesPlan();
              }
            : undefined
        }
        onAddActivityComment={review.handleAddActivityComment}
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
        onBackClick={() => review.closeEditingPlan()}
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
        onBackClick={() => review.closeSelectedPlanForReview()}
        onOpenActivitiesPlan={(p) => review.openActivitiesPlan(p)}
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
        onApprovePlan={
          user.role === "DIRECTOR" && from !== "vote-progress"
            ? review.handleApprovePlan
            : undefined
        }
        onReturnPlan={
          user.role === "DIRECTOR" && from !== "vote-progress"
            ? review.handleReturnPlan
            : undefined
        }
        onCommitteeVote={
          user.role === "ENDORSING_COMMITTEE" && from !== "vote-progress"
            ? review.handleCommitteeVote
            : undefined
        }
        onManagementDecision={
          user.role === "MANAGEMENT" &&
          from !== "vote-progress" &&
          isPlanAwaitingManagementReview(review.selectedPlanForReview)
            ? (p, decision, comment) => {
                review.handleManagementDecision(p, decision, comment);
                review.closeSelectedPlanForReview();
              }
            : undefined
        }
        isCommitteeRejectionModalOpen={review.isCommitteeRejectionModalOpen}
        setIsCommitteeRejectionModalOpen={
          review.setIsCommitteeRejectionModalOpen
        }
        isCommitteeChair={review.isCommitteeChair}
        isChairAuthorized={review.isPlanChairAuthorized(
          review.selectedPlanForReview.id,
        )}
        onChairAuthorize={review.handleChairAuthorizePlan}
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
      onSelectPlan={(plan) => review.openActivitiesPlan(plan)}
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
