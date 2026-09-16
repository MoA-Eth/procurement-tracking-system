import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { reportsController } from './reports.controller.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import { excelController } from '../excel/excel.controller.js';
import './reports.schema.js';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

// Secure all report endpoints using the project's cookie session middlewares
router.use(loadSession, requireAuthenticated);

router.get('/detailed-procurement', (req, res) =>
  reportsController.detailedProcurement(req, res),
);

router.get('/annual-procurement-plan', (req, res) =>
  reportsController.annualProcurementPlan(req, res),
);

router.get('/procurement-steps', (req, res) =>
  reportsController.procurementSteps(req, res),
);

router.get('/plan-vs-actual', (req, res) =>
  reportsController.planVsActual(req, res),
);

router.get('/delayed-procurement', (req, res) =>
  reportsController.delayedProcurement(req, res),
);

router.get('/contract-payment', (req, res) =>
  reportsController.contractPayment(req, res),
);

router.get('/monthly-summary', (req, res) =>
  reportsController.monthlySummary(req, res),
);

router.get('/project-officer-summary', (req, res) =>
  reportsController.projectOfficerSummary(req, res),
);

router.get('/activity-milestone', (req, res) =>
  reportsController.activityMilestone(req, res),
);

router.post('/import/contracts', upload.any(), (req, res) =>
  excelController.importContracts(req, res),
);

export default router;
