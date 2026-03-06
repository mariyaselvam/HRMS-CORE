import { Router } from 'express';
import { companyFactory } from '../../../tests/factories/company.factory';
import { attendanceSimulator } from '../../../tests/services/attendance-simulator';
import { leaveSimulator } from '../../../tests/services/leave-simulator';
import { payrollSimulator } from '../../../tests/services/payroll-simulator';
import prisma from '../../common/utils/prisma';

const router = Router();

// Endpoint to create a complete sandbox company
router.post('/create-sandbox', async (req, res) => {
    try {
        const { name } = req.body;
        const { company } = await companyFactory.createWithBasics({ name });
        res.json({ message: 'Sandbox company created', companyId: company.id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to trigger bulk attendance generation
router.post('/generate-attendance', async (req, res) => {
    try {
        const { employeeIds, year, month } = req.body;
        const logs = await attendanceSimulator.simulateMonth(employeeIds, year, month);
        res.json({ message: 'Attendance generated', count: logs.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to trigger leave simulation
router.post('/generate-leaves', async (req, res) => {
    try {
        const { companyId, employeeIds, count } = req.body;
        await leaveSimulator.setupLeaveBasics(companyId, employeeIds);
        const leaves = await leaveSimulator.simulateRequests(employeeIds, count || 10);
        res.json({ message: 'Leaves generated', count: leaves.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to run payroll
router.post('/run-payroll', async (req, res) => {
    try {
        const { companyId, year, month } = req.body;
        const result = await payrollSimulator.runMonthlyPayroll(companyId, year, month);
        res.json({ message: 'Payroll processed', recordCount: result.records.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to reset data (FOR TESTING USE ONLY)
router.post('/reset-db', async (req, res) => {
    if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_DANGEROUS_RESET !== 'true') {
        return res.status(403).json({ error: 'Reset not allowed in this environment' });
    }

    // In a real scenario, we would truncate all tables
    // This is a placeholder for the logic
    res.json({ message: 'Database reset simulation complete' });
});

export default router;
