import prisma from '../../common/utils/prisma';
import { CreateShiftInput, CheckInInput, CheckOutInput, AttendanceFilterInput } from './attendance.validator';

export class AttendanceRepository {
    // --- Shifts ---
    async createShift(companyId: string, data: CreateShiftInput) {
        console.log('Creating shift with data:', data);
        const today = new Date().toISOString().split('T')[0];
        // Use a fixed date part but specific time
        const startTime = new Date(`${today}T${data.startTime}:00Z`);
        const endTime = new Date(`${today}T${data.endTime}:00Z`);

        console.log('Parsed times:', { startTime, endTime });

        return prisma.shift.create({
            data: {
                name: data.name,
                startTime,
                endTime,
                graceMinutes: data.graceMinutes || 0,
                companyId
            }
        });
    }

    async listShifts(companyId: string) {
        return prisma.shift.findMany({
            where: { companyId }
        });
    }

    async assignShift(data: any) {
        return prisma.employeeShift.create({
            data: {
                employeeId: data.employeeId,
                shiftId: data.shiftId,
                effectiveFrom: new Date(data.effectiveFrom),
                isActive: true
            }
        });
    }

    async getActiveShift(employeeId: string) {
        const now = new Date();
        return prisma.employeeShift.findFirst({
            where: {
                employeeId,
                isActive: true,
                effectiveFrom: { lte: now }
            },
            include: { shift: true },
            orderBy: { effectiveFrom: 'desc' }
        });
    }

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
        return prisma.attendanceLog.findMany({
            where: {
                employee: { companyId },
                employeeId: filter.employeeId,
                attendanceDate: {
                    gte: filter.startDate ? new Date(filter.startDate) : undefined,
                    lte: filter.endDate ? new Date(filter.endDate) : undefined
                }
            },
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
            orderBy: { attendanceDate: 'desc' }
        });
    }
}
