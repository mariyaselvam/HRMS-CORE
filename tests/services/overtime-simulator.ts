import { faker } from '@faker-js/faker';
import prisma from '../../src/common/utils/prisma';

export class OvertimeSimulator {
    /**
     * Generates overtime records for employees who had "late" attendance
     * and sometimes for "present" employees (working extra hours).
     */
    async simulateOvertime(employeeIds: string[], year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const records = [];

        for (const empId of employeeIds) {
            // Find attendance logs where employee was late (likely worked extra)
            const lateLogs = await prisma.attendanceLog.findMany({
                where: {
                    employeeId: empId,
                    attendanceDate: { gte: startDate, lte: endDate },
                    status: 'late'
                }
            });

            // Also pick some present logs randomly (10% chance)
            const allPresentLogs = await prisma.attendanceLog.findMany({
                where: {
                    employeeId: empId,
                    attendanceDate: { gte: startDate, lte: endDate },
                    status: 'present'
                }
            });

            const overtimeLogs = [...lateLogs];

            for (const log of allPresentLogs) {
                if (Math.random() < 0.1) { // 10% chance
                    overtimeLogs.push(log);
                }
            }

            // Create overtime records
            for (const log of overtimeLogs) {
                const hours = faker.number.float({ min: 1, max: 4, fractionDigits: 1 });

                const record = await prisma.overtimeRecord.create({
                    data: {
                        employeeId: empId,
                        attendanceId: log.id,
                        hours,
                        status: 'approved',
                        approvedAt: new Date(),
                        createdAt: new Date()
                    }
                });
                records.push(record);
            }
        }

        return records;
    }
}

export const overtimeSimulator = new OvertimeSimulator();