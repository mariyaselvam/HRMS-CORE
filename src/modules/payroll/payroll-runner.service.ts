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
        // Simple mock preview logic for now based on employee count
        const count = await prisma.employee.count({ where: { companyId, employmentStatus: 'active' } });
        return {
            period,
            employeeCount: count,
            estimatedTotal: count * 5000 // Mock data
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
            // Mock processing
            const count = await prisma.employee.count({ where: { companyId, employmentStatus: 'active' } });
            
            await prisma.payrollRun.update({
                where: { id: run.id },
                data: {
                    status: 'Completed',
                    employeeCount: count,
                    totalAmount: count * 5000,
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
