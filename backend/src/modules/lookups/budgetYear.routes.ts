import { Router } from 'express';
import { fetchBudgetYears } from './budgetYear.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', fetchBudgetYears);
export default router;
