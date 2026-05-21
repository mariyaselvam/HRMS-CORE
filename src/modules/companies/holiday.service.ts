import { HolidayRepository } from './holiday.repository';
import { CreateHolidayInput } from './holiday.validator';
import { AppError } from '../../common/errors/AppError';

export class HolidayService {
    private repository: HolidayRepository;

    constructor() {
        this.repository = new HolidayRepository();
    }

    async addHoliday(companyId: string, data: any) {
        if (data.allBranches) {
            return this.repository.createHolidayForAllBranches(companyId, data);
        }

        const date = new Date(data.date);
        const existing = await this.repository.findHolidayByDate(companyId, date, data.workLocationId);

        if (existing) {
            throw new AppError('A holiday already exists on this date', 400);
        }

        return this.repository.createHoliday(companyId, data);
    }

    async getHolidays(companyId: string, year?: number, locationId?: string) {
        return this.repository.listHolidays(companyId, year, locationId);
    }

    async removeHoliday(id: string, companyId: string) {
        const result = await this.repository.deleteHoliday(id, companyId);
        if (result.count === 0) {
            throw new AppError('Holiday not found', 404);
        }
        return { success: true };
    }
}
