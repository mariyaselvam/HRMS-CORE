import { AttendanceRepository } from './attendance.repository';
import { ShiftsService } from '../shifts/shifts.service';
import { CheckInInput, CheckOutInput, AttendanceFilterInput } from './attendance.validator';
import { AppError, NotFoundError } from '../../common/errors/AppError';
import prisma from '../../common/utils/prisma';

export class AttendanceService {
    private repository: AttendanceRepository;
    private shiftsService: ShiftsService;

    constructor() {
        this.repository = new AttendanceRepository();
        this.shiftsService = new ShiftsService();
    }

    // Check-In Logic
    async processCheckIn(userId: string, companyId: string, data: CheckInInput) {
        const employee = await prisma.employee.findUnique({
            where: { userId },
            include: { workLocation: true }
        });

        if (!employee) {
            throw new AppError('Employee profile not found for this user', 404);
        }

        const today = new Date();
        const attendanceDate = new Date(today);
        attendanceDate.setUTCHours(0, 0, 0, 0);

        const existing = await this.repository.getTodayLog(employee.id, attendanceDate);
        if (existing) {
            throw new AppError('Already checked in for today', 400);
        }

        // 1. Determine Shift
        let shiftId = data.shiftId;
        let activeShift = null;

        if (!shiftId) {
            const shiftAssignment = await this.shiftsService.getActiveShift(employee.id);
            if (shiftAssignment) {
                activeShift = shiftAssignment.shift;
                shiftId = activeShift.id;
            }
        } else {
            activeShift = await prisma.shift.findUnique({ where: { id: shiftId } });
        }

        // 2. Determine Status (Grace Period Logic)
        let status = 'present';
        if (activeShift) {
            const now = new Date();
            const shiftStart = new Date(now);
            const shiftStartTime = new Date(activeShift.startTime);

            shiftStart.setHours(shiftStartTime.getUTCHours(), shiftStartTime.getUTCMinutes(), 0, 0);

            const graceThreshold = new Date(shiftStart.getTime() + (activeShift.graceMinutes * 60000));

            if (now > graceThreshold) {
                status = 'late';
                // Optional: If more than 2 hours late, mark as half-day
                const halfDayThreshold = new Date(shiftStart.getTime() + (120 * 60000));
                if (now > halfDayThreshold) {
                    status = 'half-day';
                }
            }
        }

        return this.repository.createCheckIn(employee.id, companyId, {
            ...data,
            shiftId,
            status
        } as any);
    }

    // Check-Out Logic
    async processCheckOut(userId: string, data: CheckOutInput) {
        const employee = await prisma.employee.findUnique({
            where: { userId }
        });

        if (!employee) throw new NotFoundError('Employee not found');

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const log = await this.repository.getTodayLog(employee.id, today);

        if (!log) {
            throw new AppError('No check-in record found for today', 400);
        }

        if (log.checkOut) {
            throw new AppError('Already checked out for today', 400);
        }

        return this.repository.updateCheckOut(log.id, data);
    }

    async getAttendanceHistory(companyId: string, userId: string | undefined, role: string, filter: AttendanceFilterInput) {
        let employeeId = filter.employeeId;

        // If no explicit employeeId filter is provided:
        if (!employeeId) {
            // Case 1: If userId is provided, it's a personal view request.
            // Even Admins should see their own logs by default in their personal tab.
            if (userId) {
                const employee = await prisma.employee.findUnique({ where: { userId } });
                employeeId = employee?.id;
            }
            // Case 2: If userId is NOT provided (Internal call for All Logs)
            // AND user is NOT an admin/manager, we shouldn't allow it (security check).
            // But here the controllers handle the routing, so if userId is undefined,
            // the controller intended to show "All".
        }

        return this.repository.listAttendance(companyId, { ...filter, employeeId });
    }
}
