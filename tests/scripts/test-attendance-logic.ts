import * as dotenv from 'dotenv';
dotenv.config();
import { AttendanceService } from '../../src/modules/attendance/attendance.service';
import prisma from '../../src/common/utils/prisma';

async function testAdminLogs() {
    const service = new AttendanceService();

    // Get a company with multiple employees
    const employees = await prisma.employee.findMany({ take: 5 });
    if (employees.length === 0) {
        console.log("No employees found.");
        process.exit(0);
    }

    const companyId = employees[0].companyId;

    console.log(`Testing Admin logs for Company: ${companyId}`);

    // Test as Admin (should show all since no employeeId filter)
    const allLogs = await service.getAttendanceHistory(companyId, undefined, 'Admin', {});
    console.log(`Total logs returned for Admin: ${allLogs.length}`);

    const uniqueEmployees = new Set(allLogs.map(l => l.employeeId));
    console.log(`Number of unique employees in logs: ${uniqueEmployees.size}`);

    // Test as Employee (should only show their own logs)
    const emp = employees[0];
    const user = await prisma.user.findUnique({ where: { id: emp.userId } });
    if (user) {
        const empLogs = await service.getAttendanceHistory(companyId, user.id, 'Employee', {});
        console.log(`Total logs returned for Employee ${user.email}: ${empLogs.length}`);
        const uniqueEmpEmployees = new Set(empLogs.map(l => l.employeeId));
        console.log(`Unique employees in Employee logs: ${Array.from(uniqueEmpEmployees)}`);
    }

    process.exit(0);
}

testAdminLogs().catch(err => {
    console.error(err);
    process.exit(1);
});
