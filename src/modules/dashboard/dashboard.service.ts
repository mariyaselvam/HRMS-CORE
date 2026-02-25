import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
    private repository: DashboardRepository;

    constructor() {
        this.repository = new DashboardRepository();
    }

    async getAdminSummary(companyId: string) {
        const [employeeStats, attendanceToday, pendingRequests, payrollSummary] = await Promise.all([
            this.repository.getEmployeeStats(companyId),
            this.repository.getAttendanceToday(companyId),
            this.repository.getPendingRequests(companyId),
            this.repository.getPayrollSummary(companyId)
        ]);

        return {
            employees: employeeStats,
            attendance: {
                presentToday: attendanceToday
            },
            approvalsPending: pendingRequests,
            latestPayroll: payrollSummary
        };
    }
}
