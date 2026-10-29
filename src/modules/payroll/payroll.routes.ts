import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { PayrollRulesController } from './payroll-rules.controller';
import { PayrollRunnerController } from './payroll-runner.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { heavyOperationLimiter } from '../../common/middleware/rate-limiter.middleware';
import {
    validateSalaryStructure,
    validateGeneratePayroll,
    validateUpdatePayrollRecord
} from './payroll.validator';

const router = Router();
const controller = new PayrollController();
const rulesController = new PayrollRulesController();
const runnerController = new PayrollRunnerController();

// Auth required
router.use(authenticate);

// Salary Configuration
router.post('/salary-setup', validateSalaryStructure, controller.setupSalary);

// Payroll Processing
router.get('/salary-structure/:id', controller.getSalaryStructure);
router.post('/generate', heavyOperationLimiter, validateGeneratePayroll, controller.generate);
router.get('/records', controller.listRecords);
router.patch('/records/:id', validateUpdatePayrollRecord, controller.updateRecord);
router.patch('/cycles/:id/finalize', controller.finalize);
router.get('/records/:id/download', heavyOperationLimiter, controller.downloadPayslip);

// Payroll Rules
router.get('/rules/all', rulesController.getAllRules);
router.get('/rules', rulesController.getRule);
router.post('/rules', rulesController.upsertRule);

// Payroll Runs (heavy batch execution protected by rate limiter)
router.get('/readiness', runnerController.getReadiness);
router.get('/runs', runnerController.listRuns);
router.get('/runs/preview', runnerController.getRunPreview);
router.post('/runs/execute', heavyOperationLimiter, runnerController.executeRun);
router.post('/runs/batch', heavyOperationLimiter, runnerController.executeRun);

export default router;
