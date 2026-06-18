import { HolidayService } from './holiday.service';
import { HolidayRepository } from './holiday.repository';
import { AppError } from '../../common/errors/AppError';

jest.mock('./holiday.repository');

describe('HolidayService', () => {
    let holidayService: HolidayService;
    let holidayRepositoryMock: jest.Mocked<HolidayRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        holidayService = new HolidayService();
        holidayRepositoryMock = (HolidayRepository as jest.Mock).mock.instances[0] as unknown as jest.Mocked<HolidayRepository>;
        if (!holidayRepositoryMock) {
            holidayRepositoryMock = (holidayService as any).repository;
        }
    });

    describe('addHoliday', () => {
        const mockCompanyId = 'company-123';
        const mockData = {
            name: 'New Year',
            date: '2024-01-01',
            type: 'Public'
        };

        it('should throw AppError if a holiday already exists on the given date', async () => {
            holidayRepositoryMock.findHolidayByDate = jest.fn().mockResolvedValue({ id: 'existing-holiday' });

            await expect(holidayService.addHoliday(mockCompanyId, mockData as any)).rejects.toThrow(AppError);
            await expect(holidayService.addHoliday(mockCompanyId, mockData as any)).rejects.toMatchObject({
                message: 'A holiday already exists on this date',
                statusCode: 400
            });

            expect(holidayRepositoryMock.findHolidayByDate).toHaveBeenCalledWith(mockCompanyId, new Date(mockData.date), undefined);
        });

        it('should add a holiday successfully if no collision', async () => {
            holidayRepositoryMock.findHolidayByDate = jest.fn().mockResolvedValue(null);
            
            const newHoliday = { id: 'holiday-1', ...mockData };
            holidayRepositoryMock.createHoliday = jest.fn().mockResolvedValue(newHoliday);

            const result = await holidayService.addHoliday(mockCompanyId, mockData as any);

            expect(holidayRepositoryMock.findHolidayByDate).toHaveBeenCalledWith(mockCompanyId, new Date(mockData.date), undefined);
            expect(holidayRepositoryMock.createHoliday).toHaveBeenCalledWith(mockCompanyId, mockData);
            expect(result).toEqual(newHoliday);
        });
    });

    describe('getHolidays', () => {
        const mockCompanyId = 'company-123';

        it('should return a list of holidays for the given company and optionally year', async () => {
            const holidays = [{ id: 'holiday-1' }, { id: 'holiday-2' }];
            holidayRepositoryMock.listHolidays = jest.fn().mockResolvedValue(holidays);

            const resultWithoutYear = await holidayService.getHolidays(mockCompanyId);
            expect(holidayRepositoryMock.listHolidays).toHaveBeenLastCalledWith(mockCompanyId, undefined, undefined);
            expect(resultWithoutYear).toEqual(holidays);

            const resultWithYear = await holidayService.getHolidays(mockCompanyId, 2024);
            expect(holidayRepositoryMock.listHolidays).toHaveBeenLastCalledWith(mockCompanyId, 2024, undefined);
            expect(resultWithYear).toEqual(holidays);
        });
    });

    describe('removeHoliday', () => {
        const mockCompanyId = 'company-123';
        const mockHolidayId = 'holiday-123';

        it('should throw AppError if holiday is not found (count === 0)', async () => {
            holidayRepositoryMock.deleteHoliday = jest.fn().mockResolvedValue({ count: 0 });

            await expect(holidayService.removeHoliday(mockHolidayId, mockCompanyId)).rejects.toThrow(AppError);
            await expect(holidayService.removeHoliday(mockHolidayId, mockCompanyId)).rejects.toMatchObject({
                message: 'Holiday not found',
                statusCode: 404
            });

            expect(holidayRepositoryMock.deleteHoliday).toHaveBeenCalledWith(mockHolidayId, mockCompanyId);
        });

        it('should return an object with success: true when holiday is deleted', async () => {
            holidayRepositoryMock.deleteHoliday = jest.fn().mockResolvedValue({ count: 1 });

            const result = await holidayService.removeHoliday(mockHolidayId, mockCompanyId);

            expect(holidayRepositoryMock.deleteHoliday).toHaveBeenCalledWith(mockHolidayId, mockCompanyId);
            expect(result).toEqual({ success: true });
        });
    });
});
