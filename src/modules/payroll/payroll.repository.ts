import prisma from '../../common/utils/prisma';
import {
    SalaryStructureInput,
    UpdatePayrollRecordInput
} from './payroll.validator';

export class PayrollRepository {
    // --- Salary Structure ---
    async upsertSalaryStructure(data: SalaryStructureInput) {
        // Basic multi-tenant check happens at service level, here we just execute
        const grossSalary = data.basicSalary + data.hra + data.transportAllowance + data.otherAllowances;

        return prisma.salaryStructure.create({
            data: {
                employeeId: data.employeeId,
                basicSalary: data.basicSalary,
                hra: data.hra,
                transportAllowance: data.transportAllowance,
                otherAllowances: data.otherAllowances,
                grossSalary: grossSalary,
                effectiveFrom: new Date(data.effectiveFrom),
                isActive: true
            }
        });
    }

    async getActiveSalary(employeeId: string) {
        return prisma.salaryStructure.findFirst({
            where: { employeeId, isActive: true },
            orderBy: { effectiveFrom: 'desc' }
        });
    }

    // --- Payroll Cycles ---
    async findCycle(companyId: string, month: Date, workLocationId: string) {
        return prisma.payrollCycle.findFirst({
            where: { companyId, workLocationId, month }
        });
    }

    async createCycle(companyId: string, month: Date, adminUserId: string | null, workLocationId: string) {
        return prisma.payrollCycle.create({
            data: {
                companyId,
                workLocationId,
                month,
                status: 'draft',
                triggeredBy: adminUserId || undefined
            }
        });
    }

    // --- Attendance/Leave Summary for Calculation ---
    async getEmployeeWorkSummary(employeeId: string, startDate: Date, endDate: Date) {
        const [attendanceCount, leaveCount] = await Promise.all([
            prisma.attendanceLog.count({
                where: {
                    employeeId,
                    attendanceDate: { gte: startDate, lte: endDate },
                    status: 'present'
                }
            }),
            prisma.leaveRequest.aggregate({
                where: {
                    employeeId,
                    status: 'approved',
                    startDate: { gte: startDate },
                    endDate: { lte: endDate }
                },
                _sum: { totalDays: true }
            })
        ]);

        return {
            presentDays: attendanceCount,
            approvedLeaveDays: Number(leaveCount._sum.totalDays || 0)
        };
    }

    // --- Payroll Records ---
    async createPayrollRecord(data: any) {
        return prisma.payrollRecord.create({
            data: data
        });
    }

    async getPayrollRecords(cycleId: string) {
        return prisma.payrollRecord.findMany({
            where: { payrollCycleId: cycleId },
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        department: { select: { name: true } },
                        personalDetails: { select: { firstName: true, lastName: true } },
                        user: { select: { email: true } }
                    }
                }
            }
        });
    }

    async updateRecord(id: string, data: UpdatePayrollRecordInput) {
        const record = await prisma.payrollRecord.findUnique({ where: { id } });
        if (!record) return null;

        // Recalculate net salary including all deductions
        const otherDeductions = data.otherDeductions ?? Number(record.otherDeductions);

        const netSalary = Number(record.grossSalary) -
            Number(record.attendanceDeduction) -
            Number(record.leaveDeduction) -
            Number(record.pfDeduction) -
            Number(record.esiDeduction) -
            Number(record.ptDeduction) -
            Number(record.incomeTax) -
            otherDeductions;

        return prisma.payrollRecord.update({
            where: { id },
            data: {
                otherDeductions,
                netSalary: Number(netSalary.toFixed(2))
            }
        });
    }

    async finalizeCycle(cycleId: string) {
        return prisma.payrollCycle.update({
            where: { id: cycleId },
            data: {
                status: 'finalized',
                finalizedAt: new Date()
            }
        });
    }

    async getFullRecordContext(recordId: string) {
        return prisma.payrollRecord.findUnique({
            where: { id: recordId },
            include: {
                payrollCycle: {
                    include: {
                        company: true
                    }
                },
                employee: {
                    include: {
                        user: true,
                        department: true,
                        personalDetails: true,
                        bankDetails: true,
                        jobDetails: true
                    }
                }
            }
        });
    }
}
