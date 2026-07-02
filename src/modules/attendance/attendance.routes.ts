import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateCheckIn, validateCheckOut, validateAttendanceFilter } from './attendance.validator';

const router = Router();
const controller = new AttendanceController();

// Auth required for all attendance routes
router.use(authenticate);

// Tracking (Employee)
router.post('/check-in', validateCheckIn, controller.checkIn);
router.post('/check-out', validateCheckOut, controller.checkOut);

// Logs (Admin/Manager)
router.get('/logs', validateAttendanceFilter, controller.history);
router.get('/admin/logs', validateAttendanceFilter, controller.allHistory);

export default router;
