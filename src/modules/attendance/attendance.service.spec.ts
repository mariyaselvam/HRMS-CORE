import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { ShiftsService } from '../shifts/shifts.service';
import prisma from '../../common/utils/prisma';
import { AppError, NotFoundError } from '../../common/errors/AppError';

jest.mock('./attendance.repository');
jest.mock('../shifts/shifts.service');
jest.mock('../../common/utils/prisma', () => ({
    __esModule: true,
    default: {
        employee: {
            findUnique: jest.fn(),
        },
        shift: {
            findUnique: jest.fn(),
        }
    }
}));

describe('AttendanceService', () => {
    let attendanceService: AttendanceService;
    let attendanceRepositoryMock: jest.Mocked<AttendanceRepository>;
    let shiftsServiceMock: jest.Mocked<ShiftsService>;

    beforeEach(() => {
        jest.clearAllMocks();

        attendanceService = new AttendanceService();
        attendanceRepositoryMock = (AttendanceRepository as jest.Mock).mock.instances[0] as unknown as jest.Mocked<AttendanceRepository>;
        if (!attendanceRepositoryMock) {
            attendanceRepositoryMock = (attendanceService as any).repository;
        }
        shiftsServiceMock = (ShiftsService as jest.Mock).mock.instances[0] as unknown as jest.Mocked<ShiftsService>;
        if (!shiftsServiceMock) {
            shiftsServiceMock = (attendanceService as any).shiftsService;
        }
    });

    describe('processCheckIn', () => {
        const mockCompanyId = 'company-123';
        const mockUserId = 'user-123';
        const mockEmployeeId = 'emp-123';
        const mockCheckInInput = {
            workLocationId: '00000000-0000-0000-0000-000000000000',
            note: 'Regular check-in'
        };

        it('should throw AppError if employee profile not found', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(attendanceService.processCheckIn(mockUserId, mockCompanyId, mockCheckInInput)).rejects.toThrow(AppError);
            await expect(attendanceService.processCheckIn(mockUserId, mockCompanyId, mockCheckInInput)).rejects.toMatchObject({
                message: 'Employee profile not found for this user',
                statusCode: 404
            });
            expect(prisma.employee.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserId }, include: { workLocation: true } });
        });

        it('should throw AppError if already checked in today', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            attendanceRepositoryMock.getTodayLog = jest.fn().mockResolvedValue({ id: 'log-1' });

            await expect(attendanceService.processCheckIn(mockUserId, mockCompanyId, mockCheckInInput)).rejects.toThrow(AppError);
            await expect(attendanceService.processCheckIn(mockUserId, mockCompanyId, mockCheckInInput)).rejects.toMatchObject({
                message: 'Already checked in for today',
                statusCode: 400
            });
            expect(attendanceRepositoryMock.getTodayLog).toHaveBeenCalledWith(mockEmployeeId, expect.any(Date));
        });

        it('should successfully check in with a status of present when on time', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            attendanceRepositoryMock.getTodayLog = jest.fn().mockResolvedValue(null);

            // Simulating no assigned shift for simplicity
            shiftsServiceMock.getActiveShift = jest.fn().mockResolvedValue(null);

            const createdLog = { id: 'new-log', status: 'present' };
            attendanceRepositoryMock.createCheckIn = jest.fn().mockResolvedValue(createdLog);

            const result = await attendanceService.processCheckIn(mockUserId, mockCompanyId, mockCheckInInput);

            expect(attendanceRepositoryMock.createCheckIn).toHaveBeenCalledWith(
                mockEmployeeId,
                mockCompanyId,
                expect.objectContaining({ ...mockCheckInInput, status: 'present' })
            );
            expect(result).toEqual(createdLog);
        });
    });

    describe('processCheckOut', () => {
        const mockUserId = 'user-123';
        const mockEmployeeId = 'emp-123';
        const mockCheckOutInput = {
            note: 'Finished for the day'
        };

        it('should throw NotFoundError if employee not found', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(attendanceService.processCheckOut(mockUserId, mockCheckOutInput)).rejects.toThrow(NotFoundError);
            expect(prisma.employee.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        });

        it('should throw AppError if no check-in log for today', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            attendanceRepositoryMock.getTodayLog = jest.fn().mockResolvedValue(null);

            await expect(attendanceService.processCheckOut(mockUserId, mockCheckOutInput)).rejects.toThrow(AppError);
            await expect(attendanceService.processCheckOut(mockUserId, mockCheckOutInput)).rejects.toMatchObject({
                message: 'No check-in record found for today',
                statusCode: 400
            });
        });

        it('should throw AppError if already checked out today', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            attendanceRepositoryMock.getTodayLog = jest.fn().mockResolvedValue({ id: 'log-1', checkOut: new Date() });

            await expect(attendanceService.processCheckOut(mockUserId, mockCheckOutInput)).rejects.toThrow(AppError);
            await expect(attendanceService.processCheckOut(mockUserId, mockCheckOutInput)).rejects.toMatchObject({
                message: 'Already checked out for today',
                statusCode: 400
            });
        });

        it('should successfully update checkout log', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            const mockLog = { id: 'log-1', checkOut: null };
            attendanceRepositoryMock.getTodayLog = jest.fn().mockResolvedValue(mockLog);

            const expectedLog = { ...mockLog, checkOut: new Date().toISOString() };
            attendanceRepositoryMock.updateCheckOut = jest.fn().mockResolvedValue(expectedLog);

            const result = await attendanceService.processCheckOut(mockUserId, mockCheckOutInput);

            expect(attendanceRepositoryMock.updateCheckOut).toHaveBeenCalledWith(mockLog.id, mockCheckOutInput);
            expect(result).toEqual(expectedLog);
        });
    });

    describe('getAttendanceHistory', () => {
        const mockCompanyId = 'company-123';

        it('should default to personal employeeId if userId is provided and no explicit employeeId filter', async () => {
            const mockUserId = 'user-123';
            const mockEmployeeId = 'emp-123';
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });

            const filter = { startDate: '2024-01-01' };
            attendanceRepositoryMock.listAttendance = jest.fn().mockResolvedValue([]);

            await attendanceService.getAttendanceHistory(mockCompanyId, mockUserId, 'Admin', filter);

            expect(prisma.employee.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserId } });
            expect(attendanceRepositoryMock.listAttendance).toHaveBeenCalledWith(mockCompanyId, { ...filter, employeeId: mockEmployeeId });
        });

        it('should pass explicit employeeId in filter if provided', async () => {
            const explicitEmployeeId = 'emp-999';
            const filter = { startDate: '2024-01-01', employeeId: explicitEmployeeId };
            attendanceRepositoryMock.listAttendance = jest.fn().mockResolvedValue([]);

            await attendanceService.getAttendanceHistory(mockCompanyId, 'user-123', 'Admin', filter);

            // It should NOT call findUnique since employeeId is already provided explicitly
            expect(prisma.employee.findUnique).not.toHaveBeenCalled();
            expect(attendanceRepositoryMock.listAttendance).toHaveBeenCalledWith(mockCompanyId, filter);
        });
    });
});