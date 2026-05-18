import prisma from '../../src/common/utils/prisma';
import { payrollCycleFactory, payrollRecordFactory } from '../factories/payroll.factory';

export class PayrollSimulator {
    /**
     * Generates a monthly payroll for an entire branch.
     */
    async runMonthlyPayroll(companyId: string, workLocationId: string, year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // 1. Create a payroll cycle
        const cycle = await payrollCycleFactory.create({
            companyId,
            workLocationId,
            month: startDate,
            status: 'finalized',
        });

        // 2. Process all branch employees
        const employees = await prisma.employee.findMany({
            where: { companyId, workLocationId },
            include: {
                attendanceLogs: {
                    where: {
                        attendanceDate: { gte: startDate, lte: endDate }
                    }
                },
                leaveRequests: {
                    where: {
                        startDate: { gte: startDate, lte: endDate },
                        status: 'approved'
                    }
                }
            }
        });

        const payrollRecords = [];

        for (const emp of employees) {
            // 1. Fetch Salary Structure
            const salary: any = await prisma.salaryStructure.findFirst({
                where: { employeeId: emp.id, isActive: true }
            }) || {
                basicSalary: 30000,
                hra: 15000,
                transportAllowance: 5000,
                otherAllowances: 5000,
                pfContribution: 1800,
                esiContribution: 500,
                grossSalary: 55000
            };

            const totalWorkingDays = 22;
            const presentDays = emp.attendanceLogs.filter(l => l.status === 'present' || l.status === 'late').length;
            const absentDays = emp.attendanceLogs.filter(l => l.status === 'absent').length;

            // 2. Calculations
            const perDaySalary = Number(salary.basicSalary) / totalWorkingDays;
            const attendanceDeduction = absentDays * perDaySalary;

            const pfDeduction = Number(salary.pfContribution || 0);
            const esiDeduction = Number(salary.esiContribution || 0);
            const ptDeduction = 200;

            const totalDeductions = attendanceDeduction + pfDeduction + esiDeduction + ptDeduction;
            const netSalary = Number(salary.grossSalary) - totalDeductions;

            const record = await payrollRecordFactory.create({
                payrollCycleId: cycle.id,
                employeeId: emp.id,
                basicSalary: salary.basicSalary,
                hra: salary.hra,
                transportAllowance: salary.transportAllowance,
                otherAllowances: salary.otherAllowances,
                grossSalary: salary.grossSalary,
                attendanceDeduction,
                pfDeduction,
                esiDeduction,
                ptDeduction,
                netSalary,
                workingDays: totalWorkingDays,
                presentDays: presentDays,
            });

            payrollRecords.push(record);
        }

        return { cycle, records: payrollRecords };
    }
}

export const payrollSimulator = new PayrollSimulator();
