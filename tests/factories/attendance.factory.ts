import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { AttendanceLog } from '@prisma/client';

export class AttendanceFactory extends BaseFactory<AttendanceLog> {
    protected model = prisma.attendanceLog;

    protected async definition() {
        return {
            attendanceDate: new Date(),
            status: 'present',
            checkIn: new Date(),
            checkOut: new Date(),
        };
    }

    async generateForDate(employeeId: string, date: Date, status: 'present' | 'absent' | 'late', shiftId?: string, workLocationId?: string) {
        let checkIn: Date | null = null;
        let checkOut: Date | null = null;
        let totalHours = 0;

        if (status !== 'absent') {
            checkIn = new Date(date);
            checkIn.setHours(9, status === 'late' ? 30 : 0, 0);

            checkOut = new Date(date);
            checkOut.setHours(18, 0, 0);

            totalHours = status === 'late' ? 8.5 : 9;
        }

        return await this.create({
            employeeId,
            attendanceDate: date,
            status,
            checkIn,
            checkOut,
            totalHours: status === 'absent' ? 0 : String(totalHours),
            shiftId,
            workLocationId,
        });
    }
}

export const attendanceFactory = new AttendanceFactory();
