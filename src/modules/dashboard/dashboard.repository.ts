import prisma from '../../common/utils/prisma';

export class DashboardRepository {
    async getEmployeeStats(companyId: string) {
        const counts = await prisma.employee.groupBy({
            by: ['employmentStatus'],
            where: { companyId },
            _count: true
        });

        const total = await prisma.employee.count({ where: { companyId } });

        return {
            total,
            breakdown: counts.map(c => ({ status: c.employmentStatus, count: c._count }))
        };
    }

    async getAttendanceToday(companyId: string) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const count = await prisma.attendanceLog.count({
            where: {
                employee: { companyId },
                attendanceDate: today,
                status: 'present'
            }
        });

        return count;
    }

    async getPendingRequests(companyId: string) {
        const [leaves, attendance] = await Promise.all([
            prisma.leaveRequest.count({
                where: { employee: { companyId }, status: 'pending' }
            }),
            prisma.attendanceRequest.count({
                where: { employee: { companyId }, status: 'pending' }
            })
        ]);

        return { leaves, attendance };
    }

    async getPayrollSummary(companyId: string) {
        const lastFinalizedCycle = await prisma.payrollCycle.findFirst({
            where: { companyId, status: 'finalized' },
            orderBy: { month: 'desc' },
            include: {
                _count: { select: { payrollRecords: true } },
            }
        });

        if (!lastFinalizedCycle) return null;

        const aggregate = await prisma.payrollRecord.aggregate({
            where: { payrollCycleId: lastFinalizedCycle.id },
            _sum: { netSalary: true, grossSalary: true }
        });

        return {
            month: lastFinalizedCycle.month,
            totalNetSalary: aggregate._sum.netSalary,
            totalGrossSalary: aggregate._sum.grossSalary,
            employeeCount: lastFinalizedCycle._count.payrollRecords
        };
    }
}
