import prisma from '../../common/utils/prisma';

export class DashboardRepository {
    async getEmployeeStats(companyId: string, locationId?: string) {
        const where: any = { companyId };
        if (locationId) {
            where.workLocationId = locationId;
        }

        const counts = await prisma.employee.groupBy({
            by: ['employmentStatus'],
            where,
            _count: true
        });

        const total = await prisma.employee.count({ where });

        return {
            total,
            breakdown: counts.map(c => ({ status: c.employmentStatus, count: c._count }))
        };
    }

    async getAttendanceToday(companyId: string, locationId?: string) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const where: any = {
            employee: { companyId },
            attendanceDate: today,
            status: 'present'
        };
        if (locationId) {
            where.employee.workLocationId = locationId;
        }

        const count = await prisma.attendanceLog.count({
            where
        });

        return count;
    }

    async getPendingRequests(companyId: string, locationId?: string) {
        const employeeWhere: any = { companyId };
        if (locationId) {
            employeeWhere.workLocationId = locationId;
        }

        const [leaves, attendance] = await Promise.all([
            prisma.leaveRequest.count({
                where: { employee: employeeWhere, status: 'pending' }
            }),
            prisma.attendanceRequest.count({
                where: { employee: employeeWhere, status: 'pending' }
            })
        ]);

        return { leaves, attendance };
    }

    async getPayrollSummary(companyId: string, locationId?: string) {
        const lastFinalizedCycle = await prisma.payrollCycle.findFirst({
            where: { companyId, status: 'finalized' },
            orderBy: { month: 'desc' }
        });

        if (!lastFinalizedCycle) return null;

        const recordWhere: any = { payrollCycleId: lastFinalizedCycle.id };
        if (locationId) {
            recordWhere.employee = { workLocationId: locationId };
        }

        const aggregate = await prisma.payrollRecord.aggregate({
            where: recordWhere,
            _sum: { netSalary: true, grossSalary: true },
            _count: { id: true }
        });

        return {
            month: lastFinalizedCycle.month,
            totalNetSalary: aggregate._sum.netSalary || 0,
            totalGrossSalary: aggregate._sum.grossSalary || 0,
            employeeCount: aggregate._count.id
        };
    }

    async getAttendanceOverview(companyId: string, locationId?: string) {
        const dates: Date[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setUTCHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }

        const overview = await Promise.all(dates.map(async (date) => {
            const baseWhere: any = {
                employee: { companyId },
                attendanceDate: date
            };
            if (locationId) {
                baseWhere.employee.workLocationId = locationId;
            }

            const [present, absent, late] = await Promise.all([
                prisma.attendanceLog.count({
                    where: { ...baseWhere, status: 'present' }
                }),
                prisma.attendanceLog.count({
                    where: { ...baseWhere, status: 'absent' }
                }),
                prisma.attendanceLog.count({
                    where: { ...baseWhere, status: 'late' }
                })
            ]);

            return {
                date: date.toISOString().split('T')[0],
                present,
                absent,
                late
            };
        }));

        return overview;
    }
}
