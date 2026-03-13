import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
    validateOnboard,
    validateUpdateEmployee,
    validateOnboardStep2,
    validateOnboardStep3,
    validateOnboardStep4,
    validateOnboardStep5
} from './employee.validator';
import { DocumentController } from './document.controller';
import { upload } from '../../common/middleware/upload.middleware';
import { validateUploadDocument } from './document.validator';

const router = Router();
const controller = new EmployeeController();
const docController = new DocumentController();

// All employee routes require authentication
router.use(authenticate);

// Core Onboarding (Step 1)
router.post('/onboard', validateOnboard, controller.onboard);

// Progressive Onboarding (Steps 2-4)
router.patch('/:id/personal', validateOnboardStep2, controller.savePersonal);
router.patch('/:id/job', validateOnboardStep3, controller.saveJob);
router.patch('/:id/bank', controller.saveBank);
router.patch('/:id/statutory', validateOnboardStep5, controller.saveStatutory);

// Management
router.get('/', controller.list);
router.get('/:id', controller.detail);
router.patch('/:id', validateUpdateEmployee, controller.update);
router.post('/:id/finalize', controller.finalize);

// Employee Documents
router.post('/:employeeId/documents', upload.array('documents'), (req, res, next) => {
    if (req.params.employeeId) req.body.employeeId = req.params.employeeId;
    next();
}, validateUploadDocument, docController.upload);
router.get('/:employeeId/documents', docController.list);
router.delete('/documents/:id', docController.delete);

export default router;
