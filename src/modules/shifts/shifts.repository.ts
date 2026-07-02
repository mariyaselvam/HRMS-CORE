import prisma from '../../common/utils/prisma';
import { CreateShiftInput } from './shifts.validator';

export class ShiftsRepository {
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
}