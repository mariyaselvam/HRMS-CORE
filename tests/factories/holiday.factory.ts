import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Holiday, WorkLocation } from '@prisma/client';

export class HolidayFactory extends BaseFactory<Holiday> {
    protected model = prisma.holiday;

    protected async definition() {
        return {
            name: `${faker.word.adjective()} Holiday`,
            date: faker.date.future(),
            isOptional: false,
            companyId: '', // Must be provided
            workLocationId: null,
            clusterId: null,
        };
    }

    /**
     * Seeds global and regional holidays for all given work locations.
     * Uses batch creation for high performance.
     */
    async seedStandardHolidays(params: {
        companyId: string;
        workLocations: WorkLocation[];
        year?: number;
    }): Promise<Holiday[]> {
        const year = params.year ?? new Date().getFullYear();
        const globalHolidays = [
            { date: new Date(`${year}-01-01`), name: "New Year's Day" },
            { date: new Date(`${year}-05-01`), name: "International Labour Day" },
            { date: new Date(`${year}-12-25`), name: "Christmas Day" },
            { date: new Date(`${year}-12-26`), name: "Boxing Day" },
        ];

        const hq = params.workLocations.find(
            (l) => l.name.toLowerCase().includes('headquarters') || l.name.toLowerCase().includes('new york')
        );
        const london = params.workLocations.find((l) => l.name.toLowerCase().includes('london'));

        const locationHolidays: Array<{ date: Date; name: string; workLocationId: string }> = [];

        if (hq) {
            locationHolidays.push(
                { date: new Date(`${year}-07-04`), name: 'Independence Day (US)', workLocationId: hq.id },
                { date: new Date(`${year}-11-28`), name: 'Thanksgiving Day', workLocationId: hq.id }
            );
        }

        if (london) {
            locationHolidays.push(
                { date: new Date(`${year}-04-18`), name: 'Good Friday (UK)', workLocationId: london.id },
                { date: new Date(`${year}-08-25`), name: 'Summer Bank Holiday', workLocationId: london.id }
            );
        }

        const holidaysToInsert: Array<{
            companyId: string;
            workLocationId: string | null;
            clusterId: string | null;
            date: Date;
            name: string;
            isOptional: boolean;
        }> = [];

        // Global holidays across all locations
        for (const gh of globalHolidays) {
            for (const loc of params.workLocations) {
                holidaysToInsert.push({
                    companyId: params.companyId,
                    workLocationId: loc.id,
                    clusterId: loc.clusterId ?? null,
                    date: gh.date,
                    name: gh.name,
                    isOptional: false,
                });
            }
        }

        // Location-specific holidays
        for (const lh of locationHolidays) {
            holidaysToInsert.push({
                companyId: params.companyId,
                workLocationId: lh.workLocationId,
                clusterId: null,
                date: lh.date,
                name: lh.name,
                isOptional: false,
            });
        }

        if (holidaysToInsert.length > 0) {
            await prisma.holiday.createMany({
                data: holidaysToInsert,
            });
        }

        return prisma.holiday.findMany({
            where: { companyId: params.companyId },
        });
    }
}

export const holidayFactory = new HolidayFactory();
