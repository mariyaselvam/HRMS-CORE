import { Router } from 'express';

import authRoutes from './modules/auth/auth.routes';
import orgRoutes from './modules/companies/organization.routes';
import employeeRoutes from './modules/employees/employee.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leave/leave.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import holidayRoutes from './modules/companies/holiday.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import testingRoutes from './modules/testing/testing.routes';

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

// Leave routes
router.use('/leave', leaveRoutes);

// Payroll routes
router.use('/payroll', payrollRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default router;
