import { Router } from 'express';
import { LeaveController } from './leave.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
    validateCreateLeaveType,
    validateCreateLeaveRequest,
    validateHandleLeaveAction
} from './leave.validator';

const router = Router();
const controller = new LeaveController();

// Auth required
router.use(authenticate);

// Types (Admin)
router.post('/types', validateCreateLeaveType, controller.createLeaveType);
router.get('/types', controller.listLeaveTypes);

// Requests (Employee)
router.post('/apply', validateCreateLeaveRequest, controller.apply);
router.get('/my-requests', controller.myRequests);

// Management (Admin/Manager)
router.get('/all-requests', controller.allRequests);
router.patch('/requests/:id/action', validateHandleLeaveAction, controller.handleAction);

export default router;
