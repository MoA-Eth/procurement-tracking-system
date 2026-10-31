import { Router } from 'express';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteDraftActivity,
  updateStage,
  updateStageActual,
  replanStage,
  patchReference,
} from './activity.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import './activity.schema.js';

const router = Router();

// Secure all activity routes
router.use(authenticate);

router.get('/', getActivities);
router.get('/:id', getActivityById);
router.post('/', createActivity);
router.patch('/:id', updateActivity);
router.delete(
  '/:id',
  authorize('ProcurementOfficer', 'OFFICER', 'Administrator', 'ADMIN'),
  deleteDraftActivity,
);
router.patch('/:id/stages/:stageId', updateStage);
router.patch('/:id/stages/:stageId/actual', updateStageActual);
router.patch('/:id/reference', patchReference);


export default router;
