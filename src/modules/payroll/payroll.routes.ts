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
router.get('/salary-structure/:id', controller.getSalaryStructure);
router.post('/generate', validateGeneratePayroll, controller.generate);
router.get('/records', controller.listRecords);
router.patch('/cycles/:id/finalize', controller.finalize);
router.get('/records/:id/download', controller.downloadPayslip);

export default router;
