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

    async getSalaryDetail(companyId: string, employeeId: string) {
        // Verify employee belongs to company
        const employee = await prisma.employee.findFirst({
            where: { id: employeeId, companyId }
        });
        if (!employee) throw new NotFoundError('Employee not found');

        return this.repository.getActiveSalary(employeeId);
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

        // 3. Get all active employees with their details
        const employees = await prisma.employee.findMany({
            where: {
                companyId,
                employmentStatus: 'active',
                profileCompletion: { gte: 70 } // Only pick reasonably completed profiles
            },
            include: {
                statutoryDetails: true
            }
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

            // --- LOP Calculation ---
            // Deduction = (Gross / TotalWorkingDays) * DaysAbsent
            const daysAbsent = Math.max(0, totalWorkingDays - (summary.presentDays + summary.approvedLeaveDays));
            const lopMultiplier = daysAbsent / totalWorkingDays;

            const attendanceDeduction = Number(salary.grossSalary) * lopMultiplier;

            // Adjusted components for statutory base
            const effectiveGross = Number(salary.grossSalary) - attendanceDeduction;
            const effectiveBasic = Number(salary.basicSalary) * (1 - lopMultiplier);

            // --- Statutory Deductions (India) ---
            let pfDeduction = 0;
            let esiDeduction = 0;
            let ptDeduction = 0;

            if (emp.statutoryDetails) {
                // EPF (12% of Basic, capping Basic at 15000 is common but optional)
                if (emp.statutoryDetails.pfApplicable) {
                    const pfBase = Math.min(effectiveBasic, 15000); // PF usually capped at 15000 basic
                    pfDeduction = pfBase * 0.12;
                }

                // ESI (0.75% of Gross if Gross <= 21000)
                if (emp.statutoryDetails.esiApplicable && effectiveGross <= 21000) {
                    esiDeduction = effectiveGross * 0.0075;
                }

                // PT (Professional Tax - simplified as ₹200 for gross > 10000)
                if (effectiveGross > 10000) {
                    ptDeduction = 200;
                }
            }

            // Net Salary Calculation
            const totalDeductions = attendanceDeduction + pfDeduction + esiDeduction + ptDeduction;
            const netSalary = Math.max(0, Number(salary.grossSalary) - totalDeductions);

            const record = await this.repository.createPayrollRecord({
                payrollCycleId: cycle.id,
                employeeId: emp.id,
                basicSalary: salary.basicSalary,
                hra: salary.hra,
                transportAllowance: salary.transportAllowance,
                otherAllowances: salary.otherAllowances,
                grossSalary: salary.grossSalary,
                attendanceDeduction: Number(attendanceDeduction.toFixed(2)),
                leaveDeduction: 0,
                pfDeduction: Number(pfDeduction.toFixed(2)),
                esiDeduction: Number(esiDeduction.toFixed(2)),
                ptDeduction: ptDeduction,
                netSalary: Number(netSalary.toFixed(2)),
                workingDays: totalWorkingDays,
                presentDays: summary.presentDays + summary.approvedLeaveDays
            });

            results.push(record);
        }

        return { cycle, recordsCreated: results.length };
    }

    async getCycleRecords(companyId: string, month: string) {
        const monthDate = new Date(`${month}-01`);
        const cycle = await this.repository.findCycle(companyId, monthDate);
        if (!cycle) return [];

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
