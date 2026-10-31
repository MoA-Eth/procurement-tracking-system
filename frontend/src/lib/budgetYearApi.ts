import { apiClient } from "./apiClient";

export const budgetYearApi = {
  /**
   * GET /api/budget-years – returns an array of {code, label}
   */
  getBudgetYears: async () => {
    // The backend returns raw array, not wrapped in { data: ... }
    const data = await apiClient.get<Array<{ code: string; label: string }>>(
      "/budget-years",
    );
    return data;
  },
};
