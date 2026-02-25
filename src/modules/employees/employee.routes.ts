import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateOnboard, validateUpdateEmployee } from './employee.validator';
import { DocumentController } from './document.controller';
import { upload } from '../../common/middleware/upload.middleware';
import { validateUploadDocument } from './document.validator';

const router = Router();
const controller = new EmployeeController();
const docController = new DocumentController();

// All employee routes require authentication
router.use(authenticate);

// Employee Profiles
router.post('/onboard', validateOnboard, controller.onboard);
router.get('/', controller.list);
router.get('/:id', controller.detail);
router.patch('/:id', validateUpdateEmployee, controller.update);

// Employee Documents
router.post('/documents/upload', upload.single('file'), validateUploadDocument, docController.upload);
router.get('/:employeeId/documents', docController.list);
router.delete('/documents/:id', docController.delete);

export default router;
