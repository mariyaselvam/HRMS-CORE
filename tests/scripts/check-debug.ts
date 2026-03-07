import * as dotenv from 'dotenv';
dotenv.config();
import prisma from '../../src/common/utils/prisma';

async function checkData() {
    console.log("--- DATABASE DATA CHECK ---");

    // Check Company
    const companies = await prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (companies.length === 0) {
        console.log("No companies found.");
        process.exit(0);
    }

    const companyId = companies[0].id;
    console.log(`Checking latest company: ${companies[0].name} (${companyId})`);

    const employees = await prisma.employee.findMany({
        where: { companyId },
        include: { user: true }
    });

    console.log(`Total Employees in Company: ${employees.length}`);

    for (const emp of employees) {
        const logs = await prisma.attendanceLog.findMany({
            where: { employeeId: emp.id }
        });
        const presentLogs = logs.filter(l => l.status === 'present' || l.status === 'late').length;
        const absentLogs = logs.filter(l => l.status === 'absent').length;

        const payrollCount = await prisma.payrollRecord.count({
            where: { employeeId: emp.id }
        });

        console.log(`Employee: ${emp.user.email} | ID: ${emp.id} | Present: ${presentLogs} | Absent: ${absentLogs} | Payroll: ${payrollCount}`);
    }

    process.exit(0);
}

checkData().catch(err => {
    console.error(err);
    process.exit(1);
});
