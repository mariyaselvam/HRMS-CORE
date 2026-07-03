import { Router } from 'express';
import { ShiftsController } from './shifts.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
    validateCreateShift,
    validateUpdateShift,
    validateBulkAssignShift,
    validateBulkRemoveShift,
    validateTransferShift,
    validateShiftEmployeeFilter
} from './shifts.validator';

const router = Router();
const controller = new ShiftsController();

// Auth required for all shift routes
router.use(authenticate);

// Shift CRUD
router.post('/', validateCreateShift, controller.createShift);
router.get('/', controller.listShifts);
router.get('/:shiftId', controller.getShiftById);
router.patch('/:shiftId', validateUpdateShift, controller.updateShift);

// Bulk Operations
router.post('/assign', validateBulkAssignShift, controller.bulkAssign);
router.post('/remove', validateBulkRemoveShift, controller.bulkRemove);
router.post('/transfer', validateTransferShift, controller.transfer);

// Shift Employee Queries
router.get('/:shiftId/employees', validateShiftEmployeeFilter, controller.getShiftEmployees);

export default router;