import type { BackendPlan } from "@/lib/plansApi";
import type { BackendContract } from "@/lib/contractsApi";
import type { FinancialCapitalSummary } from "../directorData";

/**
 * Aggregated procurement financial capital calculations
 */
export function computeFinancialSummary(
  filteredPlans: BackendPlan[],
  contracts: BackendContract[],
  selectedProject: string,
  selectedSector: string,
): FinancialCapitalSummary {
  const planEstimatedSum = filteredPlans.reduce(
    (sum, p) =>
      sum +
      (p.activities || []).reduce((aSum, a) => {
        const budget = Number(a.estimatedBudget) || 0;
        const rate = a.currency === "USD" ? 125 : 1;
        return aSum + budget * rate;
      }, 0),
    0,
  );

  const allowedActivityIds = new Set(
    filteredPlans.flatMap((p) => (p.activities || []).map((a) => a.id)),
  );

  const relevantContracts = contracts.filter((c) => {
    if (selectedProject !== "ALL" || selectedSector !== "All Sectors") {
      return c.activityId && allowedActivityIds.has(c.activityId);
    }
    return true;
  });

  const signedCommittedSum = relevantContracts.reduce((sum, c) => {
    const val = Number(c.totalValue) || 0;
    const rate = c.currency === "USD" ? 125 : 1;
    return sum + val * rate;
  }, 0);

  const actualDisbursedSum = relevantContracts.reduce((sum, c) => {
    const rate = c.currency === "USD" ? 125 : 1;
    const fromContract = Number(c.paidAmount) || 0;
    const fromPayments = (c.payments || [])
      .filter((pay) => pay.status === "PAID")
      .reduce((pSum, pay) => pSum + (Number(pay.amount) || 0), 0);
    const paid = fromContract > 0 ? fromContract : fromPayments;
    return sum + paid * rate;
  }, 0);

  let planEstimatedValueETB = planEstimatedSum;
  const signedContractsCommittedETB = signedCommittedSum;
  let actualDisbursedETB = actualDisbursedSum;

  if (
    signedContractsCommittedETB > planEstimatedValueETB &&
    planEstimatedValueETB === 0
  ) {
    planEstimatedValueETB = signedContractsCommittedETB;
  }
  if (actualDisbursedETB > signedContractsCommittedETB) {
    actualDisbursedETB = signedContractsCommittedETB;
  }

  const committedPendingPayETB = Math.max(
    0,
    signedContractsCommittedETB - actualDisbursedETB,
  );

  const uncontractedETB = Math.max(
    0,
    planEstimatedValueETB - signedContractsCommittedETB,
  );

  const remainingUncommittedETB = uncontractedETB;

  const contractExecutionRatePct =
    planEstimatedValueETB > 0
      ? Number(
          ((signedContractsCommittedETB / planEstimatedValueETB) * 100).toFixed(
            1,
          ),
        )
      : 0;

  const disbursedOfContractedPct =
    signedContractsCommittedETB > 0
      ? Number(
          ((actualDisbursedETB / signedContractsCommittedETB) * 100).toFixed(1),
        )
      : 0;

  const availableCapacityPct =
    planEstimatedValueETB > 0
      ? Number(
          ((remainingUncommittedETB / planEstimatedValueETB) * 100).toFixed(1),
        )
      : 0;

  return {
    planEstimatedValueETB,
    signedContractsCommittedETB,
    actualDisbursedETB,
    remainingUncommittedETB,
    contractExecutionRatePct,
    disbursedOfContractedPct,
    availableCapacityPct,
    committedPendingPayETB,
    uncontractedETB,
  };
}

/**
 * Percentage breakdown for spend composition
 */
export function computeSpendPercentages(
  financialSummary: FinancialCapitalSummary,
) {
  const total = financialSummary.planEstimatedValueETB;
  if (!total || total <= 0) {
    return {
      disbursed: "0.0",
      committedPending: "0.0",
      uncontracted: "0.0",
    };
  }
  const disbursedPct = (financialSummary.actualDisbursedETB / total) * 100;
  const committedPendingPct =
    (financialSummary.committedPendingPayETB / total) * 100;
  const uncontractedPct = Math.max(0, 100 - disbursedPct - committedPendingPct);
  return {
    disbursed: disbursedPct.toFixed(1),
    committedPending: committedPendingPct.toFixed(1),
    uncontracted: uncontractedPct.toFixed(1),
  };
}
