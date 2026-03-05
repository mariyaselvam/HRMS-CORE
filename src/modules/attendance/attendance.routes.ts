import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateCreateShift, validateAssignShift, validateCheckIn, validateCheckOut } from './attendance.validator';

const router = Router();
const controller = new AttendanceController();

// Auth required for all attendance routes
router.use(authenticate);

// Shifts (Admin)
router.post('/shifts', validateCreateShift, controller.createShift);
router.get('/shifts', controller.listShifts);
router.post('/assign-shift', validateAssignShift, controller.assignShift);

// Tracking (Employee)
router.post('/check-in', validateCheckIn, controller.checkIn);
router.post('/check-out', validateCheckOut, controller.checkOut);

// Logs (Admin/Manager)
router.get('/logs', controller.history);

export default router;
