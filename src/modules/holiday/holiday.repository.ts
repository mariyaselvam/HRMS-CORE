import prisma from '../../common/utils/prisma';
import { CreateHolidayInput } from './holiday.validator';

export class HolidayRepository {
    async createHoliday(companyId: string, data: CreateHolidayInput) {
        return prisma.holiday.create({
            data: {
                name: data.name,
                date: new Date(data.date),
                isOptional: data.isOptional,
                companyId: companyId,
                workLocationId: data.workLocationId || null
            },
            include: {
                workLocation: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }

    async listHolidays(companyId: string, year?: number, locationId?: string) {
        const where: any = { companyId };

        if (year) {
            where.date = {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
            };
        }

        if (locationId) {
            where.workLocationId = locationId;
        }

        return prisma.holiday.findMany({
            where,
            include: {
                workLocation: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        });
    }

    async deleteHoliday(id: string, companyId: string) {
        return prisma.holiday.deleteMany({
            where: { id, companyId }
        });
    }

    async findHolidayByDate(companyId: string, date: Date, locationId?: string | null) {
        return prisma.holiday.findFirst({
            where: {
                companyId,
                date,
                workLocationId: locationId || null
            }
        });
    }

    async createHolidayForAllBranches(companyId: string, data: CreateHolidayInput) {
        const branches = await prisma.workLocation.findMany({
            where: { companyId },
            select: { id: true }
        });

        const date = new Date(data.date);

        const creations = branches.map(async (branch) => {
            const existing = await prisma.holiday.findFirst({
                where: { companyId, date, workLocationId: branch.id }
            });
            if (!existing) {
                return prisma.holiday.create({
                    data: {
                        name: data.name,
                        date,
                        isOptional: data.isOptional,
                        companyId,
                        workLocationId: branch.id
                    }
                });
            }
            return null;
        });

        const results = await Promise.all(creations);
        return results.filter(Boolean);
    }
}
