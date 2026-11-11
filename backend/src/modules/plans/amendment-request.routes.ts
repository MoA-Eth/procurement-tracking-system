import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createAmendmentRequestSchema,
  decideAmendmentRequestSchema,
  type CreateAmendmentRequestInput,
  type DecideAmendmentRequestInput,
} from './plan.schema.js';
import {
  createAmendmentRequest,
  decideAmendmentRequest,
  listAmendmentRequests,
} from './amendment-request.service.js';
import { ApiError } from '../../utils/errors.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(
    'ProcurementOfficer',
    'OFFICER',
    'ProcurementDirector',
    'DIRECTOR',
    'ENDORSING_COMMITTEE',
    'ManagementTeam',
    'MANAGEMENT',
  ),
  async (req, res, next) => {
    try {
      res
        .status(200)
        .json(
          await listAmendmentRequests(String(req.user?.role), req.user?.id),
        );
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  authorize('ProcurementOfficer', 'OFFICER', 'Administrator', 'ADMIN'),
  validate(createAmendmentRequestSchema),
  async (req, res, next) => {
    try {
      if (!req.user?.id) throw ApiError.unauthorized();
      const request = await createAmendmentRequest(
        req.user.id,
        String(req.user.role),
        req.body as CreateAmendmentRequestInput,
      );
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/decision',
  authorize(
    'ProcurementDirector',
    'DIRECTOR',
    'ENDORSING_COMMITTEE',
    'ManagementTeam',
    'MANAGEMENT',
  ),
  validate(decideAmendmentRequestSchema),
  async (req, res, next) => {
    try {
      if (!req.user?.id) throw ApiError.unauthorized();
      const { decision, comment } = req.body as DecideAmendmentRequestInput;
      const request = await decideAmendmentRequest(
        req.params.id as string,
        req.user.id,
        String(req.user.role),
        decision,
        comment,
      );
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
