"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { checkPlanAvailability, planServerId, type PlanAvailability, type PlanIdentity } from "./planAvailability";

export function usePlanAvailability(plans: readonly PlanIdentity[], userId: string) {
  const idsKey = [...new Set(plans.map(planServerId).filter((id): id is string => Boolean(id)))].sort().join(",");
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([userId, idsKey, attempt]);
  const [result, setResult] = useState<{ key: string; values: Record<string, PlanAvailability> }>({ key: "", values: {} });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      const values: Record<string, PlanAvailability> = {};
      // Sequential requests limit load; cancel obsolete checks on navigation.
      for (const id of idsKey.split(",").filter(Boolean)) {
        if (cancelled) return;
        values[id] = await checkPlanAvailability(id, async (planId) => {
          const timeout = window.setTimeout(() => controller.abort(), 15000);
          try {
            return await apiClient.get<unknown>("/plans/" + encodeURIComponent(planId), { signal: controller.signal });
          } finally {
            window.clearTimeout(timeout);
          }
        });
      }
      if (!cancelled) setResult({ key: requestKey, values });
    };
    void run();
    return () => { cancelled = true; controller.abort(); };
  }, [idsKey, requestKey]);

  const current = result.key === requestKey;
  const availability: Record<string, PlanAvailability> = current ? result.values : {};
  return {
    availability,
    checking: Boolean(idsKey) && !current,
    retry: () => setAttempt(value => value + 1),
  };
}
