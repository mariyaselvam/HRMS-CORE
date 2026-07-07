import { Router } from 'express';

import authRoutes from './modules/auth/auth.routes';
import orgRoutes from './modules/organization/organization.routes';
import employeeRoutes from './modules/employees/employee.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leave/leave.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import holidayRoutes from './modules/holiday/holiday.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import testingRoutes from './modules/testing/testing.routes';
import shiftRoutes from './modules/shifts/shifts.routes';
import settingsRoutes from './modules/settings/settings.routes';

const router = Router();

// Testing routes (Conditioned for dev/test)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_TESTING_API === 'true') {
    router.use('/testing', testingRoutes);
}

// Auth routes
router.use('/auth', authRoutes);

// Organization routes
router.use('/org', orgRoutes);
router.use('/holidays', holidayRoutes);

// Employee routes
router.use('/employees', employeeRoutes);

// Attendance routes
router.use('/attendance', attendanceRoutes);

// Shifts routes
router.use('/shifts', shiftRoutes);

// Leave routes
router.use('/leave', leaveRoutes);

// Payroll routes
import compensationRoutes from './modules/payroll/compensation.routes';
router.use('/payroll/compensation', compensationRoutes);
router.use('/payroll', payrollRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Settings routes
router.use('/settings', settingsRoutes);


// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default router;
