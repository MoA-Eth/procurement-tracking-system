import type { Request, Response, NextFunction } from 'express';
import { getBudgetYears } from './budgetYear.service.js';

/**
 * GET handler for `/budget-years`
 */
export const fetchBudgetYears = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const years = await getBudgetYears();
    res.status(200).json(years);
  } catch (err) {
    next(err);
  }
};
