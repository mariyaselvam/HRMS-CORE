import { Router } from 'express';
import { ShiftsController } from './shifts.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateCreateShift, validateAssignShift } from './shifts.validator';

const router = Router();
const controller = new ShiftsController();

// Auth required for all shift routes
router.use(authenticate);

// Shifts (Admin)
router.post('/', validateCreateShift, controller.createShift);
router.get('/', controller.listShifts);
router.post('/assign', validateAssignShift, controller.assignShift);

export default router;