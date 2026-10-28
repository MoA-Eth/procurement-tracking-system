import { Router } from 'express';
import type { RequestHandler } from 'express';
import { alertsController } from './alerts.controller.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';
import { UserRole } from '../../generated/prisma/index.js';
import './alerts.schema.js';

const router = Router();

// Creating, editing and deleting alerts is an administrative action; regular
// users only list their own alerts and mark them as read.
const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.auth?.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      code: 'FORBIDDEN',
      message: 'You do not have access to this resource.',
    });
    return;
  }
  next();
};

router.use(loadSession, requireAuthenticated);

router.get('/', (req, res) => alertsController.getAlerts(req, res));
router.post('/', requireAdmin, (req, res) =>
  alertsController.createAlert(req, res),
);
router.patch('/read-all', (req, res) =>
  alertsController.markAllAsRead(req, res),
);
router.get('/:id', (req, res) => alertsController.getAlertById(req, res));
router.patch('/:id', requireAdmin, (req, res) =>
  alertsController.updateAlert(req, res),
);
router.patch('/:id/read', (req, res) =>
  alertsController.markAlertAsRead(req, res),
);
router.delete('/:id', requireAdmin, (req, res) =>
  alertsController.deleteAlert(req, res),
);

export default router;
