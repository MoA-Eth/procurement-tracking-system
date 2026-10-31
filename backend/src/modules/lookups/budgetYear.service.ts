import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';

/**
 * Retrieve active budget‑year lookup values.
 * Returns an array of objects with `code` and `label` strings.
 */
export const getBudgetYears = async () => {
  try {
    return await prisma.lookupValue.findMany({
      where: {
        type: 'BUDGET_YEAR',
        isActive: true,
      },
      select: {
        code: true,
        label: true,
      },
      orderBy: { code: 'asc' },
    });
  } catch (err) {
    throw new ApiError(500, 'Failed to fetch budget years');
  }
};
