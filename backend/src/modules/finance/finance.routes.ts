import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { financeController } from './finance.controller.js';

const router = Router();
router.use(authenticate);

// Disbursements
router.post(
  '/disbursements',
  authorize('FINANCE', 'ADMIN'),
  (req, res, next) => financeController.createDisbursement(req, res).catch(next),
);
router.get(
  '/disbursements',
  authorize('FINANCE', 'ADMIN', 'MANAGEMENT', 'DIRECTOR'),
  (req, res, next) => financeController.getDisbursements(req, res).catch(next),
);
router.get(
  '/disbursements/:id',
  authorize('FINANCE', 'ADMIN', 'MANAGEMENT', 'DIRECTOR'),
  (req, res, next) => financeController.getDisbursementById(req, res).catch(next),
);
router.post(
  '/disbursements/:id/retry-sms',
  authorize('FINANCE', 'ADMIN'),
  (req, res, next) => financeController.retrySms(req, res).catch(next),
);

// SMS settings
router.get(
  '/settings',
  authorize('ADMIN', 'FINANCE'),
  (req, res, next) => financeController.getSmsSettings(req, res).catch(next),
);
router.put(
  '/settings',
  authorize('ADMIN', 'FINANCE'),
  (req, res, next) => financeController.updateSmsSettings(req, res).catch(next),
);
router.post(
  '/settings/test-sms',
  authorize('ADMIN', 'FINANCE'),
  (req, res, next) => financeController.testSms(req, res).catch(next),
);

export default router;
