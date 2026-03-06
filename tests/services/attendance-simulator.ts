import { attendanceFactory } from '../factories/attendance.factory';

export class AttendanceSimulator {
    /**
     * Generates attendance logs for a range of dates for multiple employees.
     */
    async simulateMonth(employeeIds: string[], year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const logsCreated = [];

        for (const empId of employeeIds) {
            let current = new Date(startDate);
            while (current <= endDate) {
                // Skip weekends
                if (current.getDay() !== 0 && current.getDay() !== 6) {
                    const rand = Math.random() * 100;
                    let status: 'present' | 'late' | 'absent' = 'present';

                    if (rand > 95) status = 'absent'; // 5% absent
                    else if (rand > 85) status = 'late'; // 10% late

                    const log = await attendanceFactory.generateForDate(empId, new Date(current), status);
                    logsCreated.push(log);
                }
                current.setDate(current.getDate() + 1);
            }
        }

        return logsCreated;
    }
}

export const attendanceSimulator = new AttendanceSimulator();
