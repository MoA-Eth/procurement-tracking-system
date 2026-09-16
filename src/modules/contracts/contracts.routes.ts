import { Router } from 'express';
import { contractsController } from './contracts.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import './contracts.schema.js';

const router = Router();

// Protect all contract routes with authentication
router.use(authenticate);

router.get('/', (req, res) => contractsController.getContracts(req, res));
router.post(
  '/',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.createContract(req, res),
);

router.get('/:id', (req, res) => contractsController.getContractById(req, res));
router.patch(
  '/:id',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.updateContract(req, res),
);

router.get('/:id/payments', (req, res) =>
  contractsController.getContractPayments(req, res),
);
router.post(
  '/:id/payments',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.recordPayment(req, res),
);

export default router;
