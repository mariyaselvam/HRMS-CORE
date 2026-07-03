import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Shift } from '@prisma/client';

export class ShiftFactory extends BaseFactory<Shift> {
    protected model = prisma.shift;

    protected async definition() {
        return {
            name: 'General Shift',
            code: 'GEN',
            startTime: new Date('1970-01-01T09:00:00Z'),
            endTime: new Date('1970-01-01T18:00:00Z'),
            graceMinutes: 60,
            breakDuration: 0,
            status: 'active',
            companyId: '', // Must be provided
        };
    }

    async createStandardShifts(companyId: string) {
        const shifts = [
            {
                name: 'General Shift',
                code: 'GEN',
                startTime: new Date('1970-01-01T09:00:00Z'),
                endTime: new Date('1970-01-01T18:00:00Z'),
                graceMinutes: 60,
                breakDuration: 60,
                status: 'active',
            },
            {
                name: 'Morning Shift',
                code: 'MORN',
                startTime: new Date('1970-01-01T06:00:00Z'),
                endTime: new Date('1970-01-01T15:00:00Z'),
                graceMinutes: 30,
                breakDuration: 30,
                status: 'active',
            },
            {
                name: 'Night Shift',
                code: 'NIGHT',
                startTime: new Date('1970-01-01T22:00:00Z'),
                endTime: new Date('1970-01-01T07:00:00Z'),
                graceMinutes: 30,
                breakDuration: 30,
                status: 'active',
            }
        ];

        const created = [];
        for (const shift of shifts) {
            const s = await this.create({ ...shift, companyId });
            created.push(s);
        }
        return created;
    }
}

export const shiftFactory = new ShiftFactory();