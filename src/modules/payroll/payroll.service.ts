import { PayrollRepository } from './payroll.repository';
import {
    SalaryStructureInput,
    GeneratePayrollInput,
    UpdatePayrollRecordInput
} from './payroll.validator';
import { AppError, NotFoundError } from '../../common/errors/AppError';
import prisma from '../../common/utils/prisma';

export class PayrollService {
    private repository: PayrollRepository;

    constructor() {
        this.repository = new PayrollRepository();
    }

    // --- Salary Setup ---
    async setupSalary(companyId: string, data: SalaryStructureInput) {
        // Verify employee belongs to company
        const employee = await prisma.employee.findFirst({
            where: { id: data.employeeId, companyId }
        });
        if (!employee) throw new NotFoundError('Employee not found in your company');

        // Deactivate previous structures
        await prisma.salaryStructure.updateMany({
            where: { employeeId: data.employeeId, isActive: true },
            data: { isActive: false, effectiveTo: new Date() }
        });

        return this.repository.upsertSalaryStructure(data);
    }

    // --- Payroll Generation ---
    async generateMonthlyPayroll(companyId: string, adminUserId: string, data: GeneratePayrollInput) {
        const monthDate = new Date(`${data.month}-01`);

        // 1. Check if cycle already exists
        const existingCycle = await this.repository.findCycle(companyId, monthDate);
        if (existingCycle) {
            throw new AppError(`Payroll for ${data.month} is already generated (${existingCycle.status})`, 400);
        }

        // 2. Create Cycle
        const cycle = await this.repository.createCycle(companyId, monthDate, adminUserId);

        // 3. Get all active employees
        const employees = await prisma.employee.findMany({
            where: { companyId, employmentStatus: 'active' }
        });

        const monthStart = new Date(monthDate);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        // 4. Fetch holidays for this month
        const holidays = await prisma.holiday.findMany({
            where: {
                companyId,
                date: { gte: monthStart, lte: monthEnd }
            }
        });

        // 5. Calculate business working days (Total - Weekends - Holidays)
        let totalWorkingDays = 0;
        const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);

        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
            const dateStr = d.toISOString().split('T')[0];

            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidayDates.includes(dateStr);

            if (!isWeekend && !isHoliday) {
                totalWorkingDays++;
            }
        }

        const results = [];

        // 6. Calculate for each employee
        for (const emp of employees) {
            const salary = await this.repository.getActiveSalary(emp.id);
            if (!salary) continue; // Skip if no salary defined

            const summary = await this.repository.getEmployeeWorkSummary(emp.id, monthStart, monthEnd);

            // Basic Calculation Logic (Can be customized)
            // Deduction = (Gross / TotalDays) * (TotalDays - (Present + ApprovedLeaves))
            const dailyRate = Number(salary.grossSalary) / totalWorkingDays;
            const daysAbsent = totalWorkingDays - (summary.presentDays + summary.approvedLeaveDays);
            const attendanceDeduction = daysAbsent > 0 ? dailyRate * daysAbsent : 0;

            const netSalary = Number(salary.grossSalary) - attendanceDeduction;

            const record = await this.repository.createPayrollRecord({
                payrollCycleId: cycle.id,
                employeeId: emp.id,
                basicSalary: salary.basicSalary,
                hra: salary.hra,
                transportAllowance: salary.transportAllowance,
                otherAllowances: salary.otherAllowances,
                grossSalary: salary.grossSalary,
                attendanceDeduction: Number(attendanceDeduction.toFixed(2)),
                leaveDeduction: 0, // In this simple model, we count approved leaves as working days
                netSalary: Number(netSalary.toFixed(2)),
                workingDays: totalWorkingDays,
                presentDays: summary.presentDays + summary.approvedLeaveDays // Count both as paid
            });

            results.push(record);
        }

        return { cycle, recordsCreated: results.length };
    }

    async getCycleRecords(companyId: string, month: string) {
        const monthDate = new Date(`${month}-01`);
        const cycle = await this.repository.findCycle(companyId, monthDate);
        if (!cycle) throw new NotFoundError('Payroll cycle not found for this month');

        return this.repository.getPayrollRecords(cycle.id);
    }

    async finalizePayroll(companyId: string, cycleId: string) {
        const cycle = await prisma.payrollCycle.findFirst({
            where: { id: cycleId, companyId }
        });
        if (!cycle) throw new NotFoundError('Payroll cycle not found');
        if (cycle.status === 'finalized') throw new AppError('Already finalized', 400);

        return this.repository.finalizeCycle(cycleId);
    }
}
