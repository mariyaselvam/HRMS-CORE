import prisma from '../../src/common/utils/prisma';
import { payrollCycleFactory, payrollRecordFactory } from '../factories/payroll.factory';

export class PayrollSimulator {
    /**
     * Generates a monthly payroll for an entire branch.
     */
    async runMonthlyPayroll(
        companyId: string,
        workLocationIdOrYear: string | number,
        yearOrMonth: number,
        monthOrWorkLocationId?: number | string
    ) {
        let workLocationId: string;
        let year: number;
        let month: number;

        if (typeof workLocationIdOrYear === 'number') {
            year = workLocationIdOrYear;
            month = yearOrMonth;
            workLocationId = (monthOrWorkLocationId as string) || '';
        } else {
            workLocationId = workLocationIdOrYear;
            year = yearOrMonth;
            month = monthOrWorkLocationId as number;
        }

        if (!workLocationId) {
            const loc = await prisma.workLocation.findFirst({ where: { companyId } });
            workLocationId = loc?.id || '';
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // 1. Create a payroll cycle (status: finalized directly for simulation)
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
                },
                overtimeRecords: {
                    where: {
                        status: 'approved',
                        createdAt: { gte: startDate, lte: endDate }
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

            // Calculate overtime pay (1.5x hourly rate)
            const totalOvertimeHours = emp.overtimeRecords.reduce((sum, ot) => sum + Number(ot.hours), 0);
            const perDaySalary = Number(salary.basicSalary) / totalWorkingDays;
            const perHourRate = perDaySalary / 9; // Assuming 9-hour workday
            const overtimePay = totalOvertimeHours * perHourRate * 1.5; // 1.5x rate

            // 2. Calculations
            const attendanceDeduction = absentDays * perDaySalary;

            const pfDeduction = Number(salary.pfContribution || 0);
            const esiDeduction = Number(salary.esiContribution || 0);
            const ptDeduction = 200;

            const totalDeductions = attendanceDeduction + pfDeduction + esiDeduction + ptDeduction;
            const netSalary = Number(salary.grossSalary) - totalDeductions + overtimePay;

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
                overtimePay: Number(overtimePay.toFixed(2)),
                netSalary: Number(netSalary.toFixed(2)),
                workingDays: totalWorkingDays,
                presentDays: presentDays,
            });

            payrollRecords.push(record);
        }

        return { cycle, records: payrollRecords };
    }

    /**
     * Runs payroll for ALL branches and creates a PayrollRun audit record.
     */
    async runFullPayroll(companyId: string, year: number, month: number, triggeredBy?: string) {
        const period = `${year}-${String(month).padStart(2, '0')}`;
        const branches = await prisma.workLocation.findMany({
            where: { companyId }
        });

        // Create PayrollRun audit record
        const run = await prisma.payrollRun.create({
            data: {
                companyId,
                payrollPeriod: period,
                runType: 'Manual',
                triggeredBy,
                status: 'Processing',
                startedAt: new Date()
            }
        });

        try {
            let totalEmployees = 0;
            let totalAmount = 0;
            const allCycles = [];

            for (const branch of branches) {
                console.log(`⏳ Processing payroll for ${branch.name}...`);
                const { cycle, records } = await this.runMonthlyPayroll(companyId, branch.id, year, month);
                allCycles.push({ branch: branch.name, cycle, records });
                totalEmployees += records.length;
                totalAmount += records.reduce((sum, r) => sum + Number(r.netSalary), 0);
                console.log(`✅ ${records.length} records for ${branch.name}`);
            }

            // Update PayrollRun as completed
            await prisma.payrollRun.update({
                where: { id: run.id },
                data: {
                    status: 'Completed',
                    employeeCount: totalEmployees,
                    totalAmount,
                    completedAt: new Date()
                }
            });

            return { run, cycles: allCycles };
        } catch (err: any) {
            await prisma.payrollRun.update({
                where: { id: run.id },
                data: {
                    status: 'Failed',
                    errorMessage: err.message,
                    completedAt: new Date()
                }
            });
            throw err;
        }
    }
}

export const payrollSimulator = new PayrollSimulator();