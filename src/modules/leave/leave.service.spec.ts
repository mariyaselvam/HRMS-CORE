import { LeaveService } from './leave.service';
import { LeaveRepository } from './leave.repository';
import prisma from '../../common/utils/prisma';
import { AppError, NotFoundError } from '../../common/errors/AppError';

jest.mock('./leave.repository');
jest.mock('../../common/utils/prisma', () => ({
    __esModule: true,
    default: {
        employee: {
            findUnique: jest.fn(),
        },
        leaveType: {
            findUnique: jest.fn(),
        }
    }
}));

describe('LeaveService', () => {
    let leaveService: LeaveService;
    let leaveRepositoryMock: jest.Mocked<LeaveRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        leaveService = new LeaveService();
        leaveRepositoryMock = (LeaveRepository as jest.Mock).mock.instances[0] as unknown as jest.Mocked<LeaveRepository>;
        if (!leaveRepositoryMock) {
            leaveRepositoryMock = (leaveService as any).repository;
        }
    });

    const mockCompanyId = 'company-123';
    const mockUserId = 'user-123';
    const mockEmployeeId = 'emp-123';

    describe('Leave Types', () => {
        it('should add a leave type', async () => {
            const data = { name: 'Sick Leave', maxDays: 10, isPaid: true, carryForward: true };
            leaveRepositoryMock.createLeaveType = jest.fn().mockResolvedValue({ id: 'lt-1', ...data });

            const result = await leaveService.addLeaveType(mockCompanyId, data);

            expect(leaveRepositoryMock.createLeaveType).toHaveBeenCalledWith(mockCompanyId, data);
            expect(result).toHaveProperty('id', 'lt-1');
        });

        it('should get leave types', async () => {
            const list = [{ id: 'lt-1' }];
            leaveRepositoryMock.listLeaveTypes = jest.fn().mockResolvedValue(list);

            const result = await leaveService.getLeaveTypes(mockCompanyId);

            expect(leaveRepositoryMock.listLeaveTypes).toHaveBeenCalledWith(mockCompanyId);
            expect(result).toEqual(list);
        });
    });

    describe('submitLeaveRequest', () => {
        const mockLeaveData = {
            leaveTypeId: 'lt-1',
            startDate: '2024-01-01',
            endDate: '2024-01-03',
            reason: 'Sick'
        };

        it('should throw NotFoundError if employee profile not found', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(leaveService.submitLeaveRequest(mockUserId, mockLeaveData)).rejects.toThrow(NotFoundError);
            expect(prisma.employee.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserId } });
        });

        it('should throw AppError if diffDays <= 0', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            const invalidData = { ...mockLeaveData, startDate: '2024-01-05', endDate: '2024-01-01' };

            await expect(leaveService.submitLeaveRequest(mockUserId, invalidData)).rejects.toThrow(AppError);
        });

        it('should initialize leave balance if not exists', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            leaveRepositoryMock.getLeaveBalance = jest.fn().mockResolvedValue(null);
            
            (prisma.leaveType.findUnique as jest.Mock).mockResolvedValue({ id: mockLeaveData.leaveTypeId, maxDays: 15 });
            
            // Should get initialized and return an active balance
            leaveRepositoryMock.initLeaveBalance = jest.fn().mockResolvedValue({ balance: 15 });
            
            leaveRepositoryMock.createLeaveRequest = jest.fn().mockResolvedValue({ id: 'req-1' });

            const result = await leaveService.submitLeaveRequest(mockUserId, mockLeaveData);

            expect(prisma.leaveType.findUnique).toHaveBeenCalledWith({ where: { id: mockLeaveData.leaveTypeId } });
            expect(leaveRepositoryMock.initLeaveBalance).toHaveBeenCalledWith(mockEmployeeId, mockLeaveData.leaveTypeId, 15);
            expect(leaveRepositoryMock.createLeaveRequest).toHaveBeenCalledWith(mockEmployeeId, mockLeaveData, 3);
            expect(result).toHaveProperty('id', 'req-1');
        });

        it('should throw AppError if insufficient leave balance', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            leaveRepositoryMock.getLeaveBalance = jest.fn().mockResolvedValue({ balance: 2 }); // requesting 3 days

            await expect(leaveService.submitLeaveRequest(mockUserId, mockLeaveData)).rejects.toThrow(/Insufficient leave balance/);
        });

        it('should create leave request successfully', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            leaveRepositoryMock.getLeaveBalance = jest.fn().mockResolvedValue({ balance: 10 });
            
            const req = { id: 'req-2' };
            leaveRepositoryMock.createLeaveRequest = jest.fn().mockResolvedValue(req);

            const result = await leaveService.submitLeaveRequest(mockUserId, mockLeaveData);

            expect(leaveRepositoryMock.createLeaveRequest).toHaveBeenCalledWith(mockEmployeeId, mockLeaveData, 3);
            expect(result).toEqual(req);
        });
    });

    describe('getRequests', () => {
        it('should list all company requests if userId is not provided', async () => {
            leaveRepositoryMock.listRequests = jest.fn().mockResolvedValue([]);

            await leaveService.getRequests(mockCompanyId);

            expect(leaveRepositoryMock.listRequests).toHaveBeenCalledWith(mockCompanyId, undefined);
        });

        it('should list requests for a specific employee if userId is provided', async () => {
            (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: mockEmployeeId });
            leaveRepositoryMock.listRequests = jest.fn().mockResolvedValue([]);

            await leaveService.getRequests(mockCompanyId, mockUserId);

            expect(prisma.employee.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserId } });
            expect(leaveRepositoryMock.listRequests).toHaveBeenCalledWith(mockCompanyId, mockEmployeeId);
        });
    });

    describe('handleRequestAction', () => {
        const mockRequestId = 'req-1';
        const mockAdminId = 'admin-123';
        const mockRequestData = {
            id: mockRequestId,
            status: 'pending',
            employeeId: mockEmployeeId,
            leaveTypeId: 'lt-1',
            totalDays: 3
        };

        it('should throw NotFoundError if request not found', async () => {
            leaveRepositoryMock.findRequestById = jest.fn().mockResolvedValue(null);

            await expect(leaveService.handleRequestAction(mockRequestId, mockAdminId, { action: 'approve' })).rejects.toThrow(NotFoundError);
        });

        it('should throw AppError if request is already approved/rejected', async () => {
            leaveRepositoryMock.findRequestById = jest.fn().mockResolvedValue({ ...mockRequestData, status: 'approved' });

            await expect(leaveService.handleRequestAction(mockRequestId, mockAdminId, { action: 'reject' })).rejects.toThrow(AppError);
            await expect(leaveService.handleRequestAction(mockRequestId, mockAdminId, { action: 'reject' })).rejects.toMatchObject({
                message: 'Request already approved'
            });
        });

        it('should approve the request and deduct balance', async () => {
            leaveRepositoryMock.findRequestById = jest.fn().mockResolvedValue(mockRequestData);
            leaveRepositoryMock.deductBalance = jest.fn().mockResolvedValue(true);
            leaveRepositoryMock.updateRequestStatus = jest.fn().mockResolvedValue({ id: mockRequestId, status: 'approved' });

            const result = await leaveService.handleRequestAction(mockRequestId, mockAdminId, { action: 'approve' });

            expect(leaveRepositoryMock.deductBalance).toHaveBeenCalledWith(mockEmployeeId, 'lt-1', 3);
            expect(leaveRepositoryMock.updateRequestStatus).toHaveBeenCalledWith(mockRequestId, 'approved', mockAdminId);
            expect(result).toHaveProperty('status', 'approved');
        });

        it('should reject the request without deducting balance', async () => {
            leaveRepositoryMock.findRequestById = jest.fn().mockResolvedValue(mockRequestData);
            leaveRepositoryMock.updateRequestStatus = jest.fn().mockResolvedValue({ id: mockRequestId, status: 'rejected' });

            const result = await leaveService.handleRequestAction(mockRequestId, mockAdminId, { action: 'reject' });

            expect(leaveRepositoryMock.deductBalance).not.toHaveBeenCalled();
            expect(leaveRepositoryMock.updateRequestStatus).toHaveBeenCalledWith(mockRequestId, 'rejected', mockAdminId);
            expect(result).toHaveProperty('status', 'rejected');
        });
    });
});
