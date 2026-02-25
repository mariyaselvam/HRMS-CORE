import prisma from '../../common/utils/prisma';
import { CreateHolidayInput } from './holiday.validator';

export class HolidayRepository {
    async createHoliday(companyId: string, data: CreateHolidayInput) {
        return prisma.holiday.create({
            data: {
                name: data.name,
                date: new Date(data.date),
                isOptional: data.isOptional,
                companyId: companyId
            }
        });
    }

    async listHolidays(companyId: string, year?: number) {
        const where: any = { companyId };

        if (year) {
            where.date = {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
            };
        }

        return prisma.holiday.findMany({
            where,
            orderBy: { date: 'asc' }
        });
    }

    async deleteHoliday(id: string, companyId: string) {
        return prisma.holiday.deleteMany({
            where: { id, companyId }
        });
    }

    async findHolidayByDate(companyId: string, date: Date) {
        return prisma.holiday.findFirst({
            where: { companyId, date }
        });
    }
}
