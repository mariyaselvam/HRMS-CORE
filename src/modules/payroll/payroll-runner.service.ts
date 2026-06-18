import prisma from '../../common/utils/prisma';
import { PayrollService } from './payroll.service'; // Use existing generation logic inside

export class PayrollRunnerService {
    async listRuns(companyId: string) {
        return prisma.payrollRun.findMany({
            where: { companyId },
            orderBy: { startedAt: 'desc' }
        });
    }

    async getRunPreview(companyId: string, period: string) {
        const activeEmployees = await prisma.employee.findMany({
            where: { companyId, employmentStatus: 'active' },
            include: { salaryStructures: { where: { isActive: true } } }
        });

        const count = activeEmployees.length;
        let estimatedTotal = 0;
        for (const emp of activeEmployees) {
            const activeSalary = emp.salaryStructures[0];
            if (activeSalary) {
                estimatedTotal += Number(activeSalary.grossSalary);
            }
        }

        return {
            period,
            employeeCount: count,
            estimatedTotal: estimatedTotal
        };
    }

    async executeRun(companyId: string, period: string, runType: string, triggeredBy?: string) {
        // Prevent duplicate runs
        const existing = await prisma.payrollRun.findFirst({
            where: { companyId, payrollPeriod: period, status: 'Completed' }
        });

        if (existing) {
            throw new Error(`Payroll already processed for period: ${period}`);
        }

        const run = await prisma.payrollRun.create({
            data: {
                companyId,
                payrollPeriod: period,
                runType,
                triggeredBy,
                status: 'Processing',
                startedAt: new Date()
            }
        });

        try {
            const payrollService = new PayrollService();
            const branches = await prisma.workLocation.findMany({
                where: { companyId }
            });

            let totalEmployees = 0;
            let totalAmount = 0;

            for (const branch of branches) {
                try {
                    const result = await payrollService.generateMonthlyPayroll(
                        companyId,
                        triggeredBy || null,
                        branch.id,
                        { month: period }
                    );

                    const records = await prisma.payrollRecord.findMany({
                        where: { payrollCycleId: result.cycle.id }
                    });

                    totalEmployees += records.length;
                    totalAmount += records.reduce((sum, r) => sum + Number(r.netSalary), 0);
                } catch (branchErr: any) {
                    console.log(`Skipping branch ${branch.name} for period ${period}: ${branchErr.message}`);
                    const monthDate = new Date(`${period}-01`);
                    const existingCycle = await prisma.payrollCycle.findFirst({
                        where: { companyId, workLocationId: branch.id, month: monthDate },
                        include: { payrollRecords: true }
                    });
                    if (existingCycle) {
                        totalEmployees += existingCycle.payrollRecords.length;
                        totalAmount += existingCycle.payrollRecords.reduce((sum, r) => sum + Number(r.netSalary), 0);
                    }
                }
            }

            await prisma.payrollRun.update({
                where: { id: run.id },
                data: {
                    status: 'Completed',
                    employeeCount: totalEmployees,
                    totalAmount: totalAmount,
                    completedAt: new Date()
                }
            });

            return { success: true, message: 'Payroll executed successfully' };
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
