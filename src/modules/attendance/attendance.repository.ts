import prisma from '../../common/utils/prisma';
import { CheckInInput, CheckOutInput, AttendanceFilterInput } from './attendance.validator';

export class AttendanceRepository {
    // --- Attendance ---
    async getTodayLog(employeeId: string, date: Date) {
        return prisma.attendanceLog.findFirst({
            where: {
                employeeId,
                attendanceDate: date
            }
        });
    }

    async createCheckIn(employeeId: string, companyId: string, data: any) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        return prisma.attendanceLog.create({
            data: {
                employeeId,
                attendanceDate: today,
                shiftId: data.shiftId,
                workLocationId: data.workLocationId,
                checkIn: new Date(),
                status: data.status || 'present'
            }
        });
    }

    async updateCheckOut(id: string, data: CheckOutInput) {
        const checkOutTime = new Date();

        const log = await prisma.attendanceLog.findUnique({ where: { id } });
        let totalHours = null;

        if (log?.checkIn) {
            const diffMs = checkOutTime.getTime() - new Date(log.checkIn).getTime();
            totalHours = diffMs / (1000 * 60 * 60);
        }

        return prisma.attendanceLog.update({
            where: { id },
            data: {
                checkOut: checkOutTime,
                totalHours: totalHours ? Number(totalHours.toFixed(2)) : null
            }
        });
    }

    async listAttendance(companyId: string, filter: AttendanceFilterInput) {
        const page = Number(filter.page) || 1;
        const limit = Number(filter.limit) || 10;
        const skip = (page - 1) * limit;

        const where: any = {
            employee: {
                companyId,
                ...(filter.search ? {
                    OR: [
                        { employeeCode: { contains: filter.search as string, mode: 'insensitive' as const } },
                        { user: { email: { contains: filter.search as string, mode: 'insensitive' as const } } }
                    ]
                } : {})
            },
            ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
            status: filter.status,
            attendanceDate: {
                gte: filter.startDate ? new Date(filter.startDate) : undefined,
                lte: filter.endDate ? new Date(filter.endDate) : undefined
            }
        };

        const [records, total] = await Promise.all([
            prisma.attendanceLog.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            employeeCode: true,
                            user: { select: { email: true } }
                        }
                    },
                    shift: { select: { name: true } },
                    workLocation: { select: { name: true } }
                },
                orderBy: { attendanceDate: 'desc' },
                skip,
                take: limit
            }),
            prisma.attendanceLog.count({ where })
        ]);

        return { total, records };
    }
}
