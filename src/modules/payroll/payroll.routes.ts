import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
    validateSalaryStructure,
    validateGeneratePayroll
} from './payroll.validator';

const router = Router();
const controller = new PayrollController();

// Auth required
router.use(authenticate);

// Salary Configuration
router.post('/salary-setup', validateSalaryStructure, controller.setupSalary);

// Payroll Processing
router.post('/generate', validateGeneratePayroll, controller.generate);
router.get('/records', controller.listRecords);
router.patch('/cycles/:id/finalize', controller.finalize);

export default router;
