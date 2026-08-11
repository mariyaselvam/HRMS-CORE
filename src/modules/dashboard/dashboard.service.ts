import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
    private repository: DashboardRepository;

    constructor() {
        this.repository = new DashboardRepository();
    }

    async getAdminSummary(companyId: string, locationId?: string, startDate?: string, endDate?: string) {
        const [employeeStats, attendanceToday, pendingRequests, payrollSummary, attendanceOverview] = await Promise.all([
            this.repository.getEmployeeStats(companyId, locationId),
            this.repository.getAttendanceToday(companyId, locationId),
            this.repository.getPendingRequests(companyId, locationId),
            this.repository.getPayrollSummary(companyId, locationId),
            this.repository.getAttendanceOverview(companyId, locationId, startDate, endDate)
        ]);

        return {
            employees: employeeStats,
            attendance: {
                presentToday: attendanceToday,
                overview: attendanceOverview
            },
            approvalsPending: pendingRequests,
            latestPayroll: payrollSummary
        };
    }
}
450