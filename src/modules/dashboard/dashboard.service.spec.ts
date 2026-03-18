import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';

jest.mock('./dashboard.repository');

describe('DashboardService', () => {
    let dashboardService: DashboardService;
    let dashboardRepositoryMock: jest.Mocked<DashboardRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        dashboardService = new DashboardService();
        dashboardRepositoryMock = (DashboardRepository as jest.Mock).mock.instances[0] as unknown as jest.Mocked<DashboardRepository>;
        if (!dashboardRepositoryMock) {
            dashboardRepositoryMock = (dashboardService as any).repository;
        }
    });

    const mockCompanyId = 'company-123';

    describe('getAdminSummary', () => {
        it('should aggregate and return dashboard summary', async () => {
            const mockEmployeeStats = { total: 100, active: 95 };
            const mockAttendanceToday = 85;
            const mockPendingRequests = 5;
            const mockPayrollSummary = { month: '2024-01', totalAmount: 500000 };

            dashboardRepositoryMock.getEmployeeStats = jest.fn().mockResolvedValue(mockEmployeeStats);
            dashboardRepositoryMock.getAttendanceToday = jest.fn().mockResolvedValue(mockAttendanceToday);
            dashboardRepositoryMock.getPendingRequests = jest.fn().mockResolvedValue(mockPendingRequests);
            dashboardRepositoryMock.getPayrollSummary = jest.fn().mockResolvedValue(mockPayrollSummary);

            const result = await dashboardService.getAdminSummary(mockCompanyId);

            expect(dashboardRepositoryMock.getEmployeeStats).toHaveBeenCalledWith(mockCompanyId);
            expect(dashboardRepositoryMock.getAttendanceToday).toHaveBeenCalledWith(mockCompanyId);
            expect(dashboardRepositoryMock.getPendingRequests).toHaveBeenCalledWith(mockCompanyId);
            expect(dashboardRepositoryMock.getPayrollSummary).toHaveBeenCalledWith(mockCompanyId);

            expect(result).toEqual({
                employees: mockEmployeeStats,
                attendance: {
                    presentToday: mockAttendanceToday
                },
                approvalsPending: mockPendingRequests,
                latestPayroll: mockPayrollSummary
            });
        });
    });
});
