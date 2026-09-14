"use client";

import { useState, useEffect, useMemo } from "react";
import type { AuthUser } from "@/lib/authTypes";
import { fetchPlans, mapBackendPlanToFrontend } from "@/lib/plansApi";
import {
  INITIAL_PLANS,
  type ProcurementPlan,
} from "@/features/plans/plansData";
import {
  filterAwaitingPlans,
  filterDelayedPlans,
  filterReviewedPlans,
  calculateVoteStats,
  sortAwaitingPlans,
  filterAwaitingPlansByQuery,
  extractRecentDecisions,
} from "./committeeCalculations";

export function useCommitteeDashboard(user: AuthUser) {
  const [searchQuery, setSearchQuery] = useState("");
  const [plans, setPlans] = useState<ProcurementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "delayed">("all");

  const [approvedPercentAnim, setApprovedPercentAnim] = useState(0);
  const [rejectedPercentAnim, setRejectedPercentAnim] = useState(0);

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const rawPlans = await fetchPlans();
        const mapped = rawPlans.map((p) =>
          mapBackendPlanToFrontend(p, user.id),
        );

        const planMap = new Map<string, ProcurementPlan>();
        INITIAL_PLANS.forEach((p) => planMap.set(p.id, p));
        mapped.forEach((p) => planMap.set(p.id, p));

        setPlans(Array.from(planMap.values()));
      } catch (err) {
        console.error("Dashboard failed to load plans:", err);
        setPlans([...INITIAL_PLANS]);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, [user.id]);

  const awaitingPlans = useMemo(() => filterAwaitingPlans(plans), [plans]);
  const delayedPlans = useMemo(
    () => filterDelayedPlans(awaitingPlans),
    [awaitingPlans],
  );
  const delayedCount = delayedPlans.length;

  const reviewedPlans = useMemo(() => filterReviewedPlans(plans), [plans]);
  const voteStats = useMemo(
    () => calculateVoteStats(reviewedPlans),
    [reviewedPlans],
  );

  useEffect(() => {
    const delay = voteStats.totalReviewedCount > 0 ? 100 : 0;
    const timer = setTimeout(() => {
      if (voteStats.totalReviewedCount > 0) {
        setApprovedPercentAnim(voteStats.approvedPercent);
        setRejectedPercentAnim(voteStats.rejectedPercent);
      } else {
        setApprovedPercentAnim(0);
        setRejectedPercentAnim(0);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [
    voteStats.approvedPercent,
    voteStats.rejectedPercent,
    voteStats.totalReviewedCount,
  ]);

  const sortedAwaitingPlans = useMemo(
    () => sortAwaitingPlans(awaitingPlans),
    [awaitingPlans],
  );

  const filteredAwaitingPlans = useMemo(
    () => filterAwaitingPlansByQuery(sortedAwaitingPlans, filter, searchQuery),
    [sortedAwaitingPlans, filter, searchQuery],
  );

  const recentDecisions = useMemo(
    () => extractRecentDecisions(reviewedPlans, 2),
    [reviewedPlans],
  );

  return {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    loading,
    awaitingCount: awaitingPlans.length,
    delayedCount,
    totalReviewedCount: voteStats.totalReviewedCount,
    approvedCount: voteStats.approvedCount,
    rejectedCount: voteStats.rejectedCount,
    approvedPercent: voteStats.approvedPercent,
    rejectedPercent: voteStats.rejectedPercent,
    approvedPercentAnim,
    rejectedPercentAnim,
    filteredAwaitingPlans,
    recentDecisions,
  };
}
