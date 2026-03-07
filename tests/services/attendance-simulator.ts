import { attendanceFactory } from '../factories/attendance.factory';
import prisma from '../../src/common/utils/prisma';

export class AttendanceSimulator {
    /**
     * Generates attendance logs for a range of dates for multiple employees.
     */
    async simulateMonth(employeeIds: string[], year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const logsCreated = [];

        for (const empId of employeeIds) {
            const emp = await prisma.employee.findUnique({
                where: { id: empId },
                include: { shifts: true }
            });
            const shiftId = emp?.shifts[0]?.shiftId;
            const workLocationId = emp?.workLocationId || undefined;

            let current = new Date(startDate);
            let empLogsCount = 0;
            while (current <= endDate) {
                // Skip weekends
                if (current.getDay() !== 0 && current.getDay() !== 6) {
                    const rand = Math.random() * 100;
                    let status: 'present' | 'late' | 'absent' = 'present';

                    if (rand > 95) status = 'absent'; // 5% absent
                    else if (rand > 85) status = 'late'; // 10% late

                    const log = await attendanceFactory.generateForDate(empId, new Date(current), status, shiftId, workLocationId);
                    logsCreated.push(log);
                    empLogsCount++;
                }
                current.setDate(current.getDate() + 1);
            }
            console.log(`DEBUG: Generated ${empLogsCount} logs for employee ${empId}`);
        }

        return logsCreated;
    }
}

export const attendanceSimulator = new AttendanceSimulator();
