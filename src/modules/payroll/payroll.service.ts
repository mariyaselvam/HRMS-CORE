import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { numberToWords, formatINR } from '../../common/utils/currency.utils';
import { findSystemBrowser } from '../../common/utils/browser.utils';
import { PayrollRepository } from './payroll.repository';
import {
    SalaryStructureInput,
    GeneratePayrollInput,
    UpdatePayrollRecordInput
} from './payroll.validator';
import { AppError, NotFoundError } from '../../common/errors/AppError';
import { SystemRole, ADMIN_ROLES, PAYROLL_ROLES } from '../../common/enums/role.enum';
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
    async generateMonthlyPayroll(companyId: string, adminUserId: string | null, workLocationId: string | undefined, data: GeneratePayrollInput) {
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
        // Guard: month must be a valid YYYY-MM string
        if (!month || !/^\d{4}-\d{2}$/.test(month)) return [];
        const monthDate = new Date(`${month}-01`);
        if (isNaN(monthDate.getTime())) return [];
        
        // If no specific branch, find all cycles for this company+month across all branches
        if (!workLocationId) {
            const cycles = await prisma.payrollCycle.findMany({
                where: { companyId, month: monthDate },
                include: {
                    payrollRecords: {
                        include: {
                            employee: {
                                select: {
                                    employeeCode: true,
                                    department: { select: { name: true } },
                                    personalDetails: { select: { firstName: true, lastName: true } },
                                    user: { select: { email: true } }
                                }
                            }
                        }
                    }
                }
            });
            
            // Flatten all records from all cycles and add status from parent cycle
            const allRecords = cycles.flatMap(c => 
                c.payrollRecords.map(r => ({ ...r, status: c.status, payrollCycleId: c.id }))
            );
            return allRecords;
        }
        
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

        // Security: admin/payroll-manager of the same company OR the employee themselves
        const isAdmin = [...ADMIN_ROLES, ...PAYROLL_ROLES].includes(observerRole as SystemRole);
        const isOwner = record.employee.userId === observerUserId;
        const isSameCompany = record.payrollCycle.companyId === observerCompanyId;
        if (!isSameCompany || (!isAdmin && !isOwner)) {
            throw new AppError('You do not have permission to access this payslip', 403);
        }

        // ── Derived values ───────────────────────────────────────────
        const monthNames = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
        const cycleDate   = new Date(record.payrollCycle.month);
        const daysAbsent  = Math.max(0, record.workingDays - record.presentDays);
        const perDayRate  = record.workingDays > 0
            ? Number(record.grossSalary) / record.workingDays
            : 0;

        const totalDeductions =
            Number(record.attendanceDeduction) +
            Number(record.pfDeduction) +
            Number(record.esiDeduction) +
            Number(record.ptDeduction) +
            Number(record.incomeTax) +
            Number(record.otherDeductions);

        const netSalaryNum = Number(record.netSalary);
        const cycleStatus  = record.payrollCycle.status;

        const workLocationName = (record.payrollCycle as any).workLocation?.name || 'N/A';

        // ── Template data object ─────────────────────────────────────
        const data = {
            companyName:          record.payrollCycle.company.name,
            companyAddress:       (record.payrollCycle.company as any).address
                                      || (record.payrollCycle.company as any).industryType
                                      ? `Industry: ${(record.payrollCycle.company as any).industryType}`
                                      : 'N/A',
            month:                monthNames[cycleDate.getMonth()],
            year:                 cycleDate.getFullYear(),
            generatedDate:        new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            employeeName:         `${record.employee.personalDetails?.firstName || ''} ${record.employee.personalDetails?.lastName || ''}`.trim() || record.employee.user.email,
            employeeCode:         record.employee.employeeCode,
            designation:          record.employee.jobDetails?.designation || 'N/A',
            departmentName:       record.employee.department.name,
            workLocation:         workLocationName,
            joinDate:             record.employee.dateOfJoining
                                      ? new Date(record.employee.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                      : 'N/A',
            cycleStatus:          cycleStatus.charAt(0).toUpperCase() + cycleStatus.slice(1),
            statusClass:          cycleStatus === 'finalized' ? 'status-finalized' : 'status-draft',

            // Bank
            bankName:             record.employee.bankDetails?.bankName    || 'N/A',
            accountNumber:        record.employee.bankDetails?.accountNumber || 'N/A',
            ifscCode:             record.employee.bankDetails?.ifscCode     || 'N/A',
            branchName:           record.employee.bankDetails?.branchName   || 'N/A',

            // Attendance
            workingDays:          record.workingDays,
            presentDays:          record.presentDays,
            daysAbsent,
            perDayRate:           formatINR(perDayRate),

            // Earnings
            currency:             '₹',
            basicSalary:          formatINR(record.basicSalary),
            hra:                  formatINR(record.hra),
            transportAllowance:   formatINR(record.transportAllowance),
            otherAllowances:      formatINR(record.otherAllowances),
            grossSalary:          formatINR(record.grossSalary),

            // Deductions
            attendanceDeduction:  formatINR(record.attendanceDeduction),
            pfDeduction:          formatINR(record.pfDeduction),
            esiDeduction:         formatINR(record.esiDeduction),
            ptDeduction:          formatINR(record.ptDeduction),
            incomeTax:            formatINR(record.incomeTax),
            otherDeductions:      formatINR(record.otherDeductions),
            totalDeductions:      formatINR(totalDeductions),

            // Net
            netSalary:            formatINR(netSalaryNum),
            netSalaryInWords:     numberToWords(netSalaryNum),
        };

        // ── Render HTML from Handlebars template ─────────────────────
        const templatePath = path.join(__dirname, 'templates', 'payslip.hbs');
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const html = Handlebars.compile(templateHtml)(data);

        // ── Convert to PDF using Puppeteer ───────────────────────────
        // Use system Edge/Chrome to avoid bundled Chromium V8 snapshot issues on Windows
        const executablePath = findSystemBrowser();
        const browser = await puppeteer.launch({
            headless: true,
            protocolTimeout: 60000,
            ...(executablePath ? { executablePath } : {}),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-networking',
            ]
        });
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });
            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    async updateRecord(companyId: string, id: string, data: UpdatePayrollRecordInput) {
        const record = await prisma.payrollRecord.findFirst({
            where: {
                id,
                payrollCycle: {
                    companyId
                }
            },
            include: {
                payrollCycle: true
            }
        });
        if (!record) throw new NotFoundError('Payroll record not found');
        if (record.payrollCycle.status === 'finalized') {
            throw new AppError('Cannot adjust records in a finalized payroll cycle', 400);
        }

        return this.repository.updateRecord(id, data);
    }
}
