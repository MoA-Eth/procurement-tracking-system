import { Router } from 'express';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  updateStage,
  updateStageActual,
  replanStage,
} from './activity.controller.js';
import { authenticate } from '../../middleware/auth.js';
import './activity.schema.js';

const router = Router();

// Secure all activity routes
router.use(authenticate);

router.get('/', getActivities);
router.get('/:id', getActivityById);
router.post('/', createActivity);
router.patch('/:id', updateActivity);
router.patch('/:id/stages/:stageId', updateStage);
router.patch('/:id/stages/:stageId/actual', updateStageActual);
router.post('/:id/stages/:stageId/replan', replanStage);

export default router;
