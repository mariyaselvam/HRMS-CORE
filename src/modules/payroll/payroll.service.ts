import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { PDFDocument } from 'pdf-lib';
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
    async generateMonthlyPayroll(companyId: string, adminUserId: string, workLocationId: string | undefined, data: GeneratePayrollInput) {
        if (!workLocationId) {
            throw new AppError('Branch context (workLocationId) is required for payroll generation', 400);
        }

        const monthDate = new Date(`${data.month}-01`);

        // 1. Check if cycle already exists for this branch
        const existingCycle = await this.repository.findCycle(companyId, monthDate, workLocationId);
        if (existingCycle) {
            throw new AppError(`Payroll for ${data.month} in this branch is already generated (${existingCycle.status})`, 400);
        }

        // 2. Create Cycle for this branch
        const cycle = await this.repository.createCycle(companyId, monthDate, adminUserId, workLocationId);

        // 3. Get all active employees for this branch
        const employees = await prisma.employee.findMany({
            where: {
                companyId,
                workLocationId,
                employmentStatus: 'active',
                profileCompletion: { gte: 70 } // Only pick reasonably completed profiles
            },
            include: {
                statutoryDetails: true
            }
        });

        const monthStart = new Date(monthDate);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        // 4. Fetch holidays for this branch/company this month
        const holidays = await prisma.holiday.findMany({
            where: {
                companyId,
                OR: [
                    { workLocationId: null }, // Company wide
                    { workLocationId } // Branch specific
                ],
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

    async getCycleRecords(companyId: string, workLocationId: string | undefined, month: string) {
        if (!workLocationId) return [];
        
        const monthDate = new Date(`${month}-01`);
        const cycle = await this.repository.findCycle(companyId, monthDate, workLocationId);
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

    async generatePayslipPdf(recordId: string, observerCompanyId: string, observerRole: string, observerUserId: string) {
        const record = await this.repository.getFullRecordContext(recordId);
        if (!record) throw new NotFoundError('Payroll record not found');

        // Security check: must be admin of the company OR the employee themselves
        const isAdmin = observerRole === 'Admin' || observerRole === 'Manager';
        const isOwner = record.employee.userId === observerUserId;
        const isSameCompany = record.payrollCycle.companyId === observerCompanyId;

        if (!isSameCompany || (!isAdmin && !isOwner)) {
            throw new AppError('You do not have permission to access this payslip', 403);
        }

        // Prepare data for template
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const cycleDate = new Date(record.payrollCycle.month);
        
        const totalDeductions = Number(record.attendanceDeduction) + 
                               Number(record.pfDeduction) + 
                               Number(record.esiDeduction) + 
                               Number(record.ptDeduction) + 
                               Number(record.incomeTax) + 
                               Number(record.otherDeductions);

        const data = {
            companyName: record.payrollCycle.company.name,
            companyAddress: record.payrollCycle.company.address || 'N/A', 
            month: monthNames[cycleDate.getMonth()],
            year: cycleDate.getFullYear(),
            employeeName: `${record.employee.personalDetails?.firstName || ''} ${record.employee.personalDetails?.lastName || ''}`.trim() || record.employee.user.email,
            employeeCode: record.employee.employeeCode,
            designation: record.employee.jobDetails?.designation || 'N/A',
            departmentName: record.employee.department.name,
            bankName: record.employee.bankDetails?.bankName || 'N/A',
            accountNumber: record.employee.bankDetails?.accountNumber || 'N/A',
            workingDays: record.workingDays,
            presentDays: record.presentDays,
            basicSalary: record.basicSalary,
            hra: record.hra,
            transportAllowance: record.transportAllowance,
            otherAllowances: record.otherAllowances,
            grossSalary: record.grossSalary,
            attendanceDeduction: record.attendanceDeduction,
            pfDeduction: record.pfDeduction,
            esiDeduction: record.esiDeduction,
            ptDeduction: record.ptDeduction,
            incomeTax: Number(record.incomeTax) + Number(record.otherDeductions),
            totalDeductions: totalDeductions.toFixed(2),
            currency: 'INR', // Avoided ₹ symbol as it causes encoding errors in basic PDF fonts
            netSalary: record.netSalary,
            netSalaryInWords: 'Amount in words logic' // Simplification
        };

        // Load and compile template
        const templatePath = path.join(__dirname, 'templates', 'payslip.hbs');
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const template = Handlebars.compile(templateHtml);
        const html = template(data);

        // For now, we generate a basic PDF with text using pdf-lib 
        // since html-pdf-node requires heavy dependencies or puppeteer
        // In a real prod environment we'd use a high fidelity HTML-to-PDF converter
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { height } = page.getSize();
        
        // Very basic PDF implementation just to show the result
        // A better approach in production would be using 'html-pdf' or equivalent
        page.drawText(`PAYSLIP - ${data.month} ${data.year}`, { x: 50, y: height - 50, size: 20 });
        page.drawText(`Company: ${data.companyName}`, { x: 50, y: height - 80, size: 12 });
        page.drawText(`Employee: ${data.employeeName} (${data.employeeCode})`, { x: 50, y: height - 100, size: 12 });
        page.drawText(`--------------------------------------------------`, { x: 50, y: height - 120, size: 12 });
        page.drawText(`Gross Salary: ${data.currency} ${data.grossSalary}`, { x: 50, y: height - 140, size: 12 });
        page.drawText(`Total Deductions: ${data.currency} ${data.totalDeductions}`, { x: 50, y: height - 160, size: 12 });
        page.drawText(`Net Payable: ${data.currency} ${data.netSalary}`, { x: 50, y: height - 190, size: 15 });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }
}
