import { Router } from 'express';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import { getExecutiveSnapshot } from './executive-dashboard.service.js';

const router = Router();
router.use(loadSession, requireAuthenticated);
router.get('/', async (req, res, next) => {
  if (
    !req.auth ||
    !['DIRECTOR', 'MANAGEMENT'].includes(req.auth.user.role)
  ) {
    res.status(403).json({
      message:
        'Executive dashboard access is limited to Management and Directors.',
    });
    return;
  }
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await getExecutiveSnapshot());
  } catch (error) {
    next(error);
  }
});
export default router;
