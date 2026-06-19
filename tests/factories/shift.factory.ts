import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Shift } from '@prisma/client';

export class ShiftFactory extends BaseFactory<Shift> {
    protected model = prisma.shift;

    protected async definition() {
        return {
            name: 'General Shift',
            startTime: new Date('1970-01-01T09:00:00Z'),
            endTime: new Date('1970-01-01T18:00:00Z'),
            graceMinutes: 60,
            companyId: '', // Must be provided
        };
    }

    async createStandardShifts(companyId: string) {
        const shifts = [
            {
                name: 'General Shift',
                startTime: new Date('1970-01-01T09:00:00Z'),
                endTime: new Date('1970-01-01T18:00:00Z'),
                graceMinutes: 60,
            },
            {
                name: 'Morning Shift',
                startTime: new Date('1970-01-01T06:00:00Z'),
                endTime: new Date('1970-01-01T15:00:00Z'),
                graceMinutes: 30,
            },
            {
                name: 'Night Shift',
                startTime: new Date('1970-01-01T22:00:00Z'),
                endTime: new Date('1970-01-01T07:00:00Z'),
                graceMinutes: 30,
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