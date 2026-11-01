import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../../utils/errors.js';
import { getExecutiveSnapshot } from '../executive-dashboard/executive-dashboard.service.js';
import {
  authenticateIntegrationApiKey,
  requireIntegrationKeyHeader,
} from './integration-api-key.service.js';

const router = Router();

const integrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  '/executive-dashboard',
  integrationLimiter,
  async (req, res, next) => {
    try {
      const key = requireIntegrationKeyHeader(req.header('x-api-key'));
      if (!(await authenticateIntegrationApiKey(key))) {
        throw ApiError.unauthorized('A valid X-API-Key header is required.');
      }

      res.set('Cache-Control', 'no-store');
      res.json(await getExecutiveSnapshot());
    } catch (error) {
      next(error);
    }
  },
);

export default router;
