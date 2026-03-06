import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { PayrollCycle, PayrollRecord } from '@prisma/client';

export class PayrollCycleFactory extends BaseFactory<PayrollCycle> {
    protected model = prisma.payrollCycle;

    protected async definition() {
        return {
            month: new Date(),
            status: 'draft',
            companyId: '', // Must be provided
        };
    }
}

export class PayrollRecordFactory extends BaseFactory<PayrollRecord> {
    protected model = prisma.payrollRecord;

    protected async definition() {
        return {
            basicSalary: 30000,
            hra: 15000,
            transportAllowance: 5000,
            otherAllowances: 2000,
            grossSalary: 52000,
            attendanceDeduction: 0,
            leaveDeduction: 0,
            pfDeduction: 1800,
            esiDeduction: 500,
            ptDeduction: 200,
            incomeTax: 0,
            otherDeductions: 0,
            overtimePay: 0,
            netSalary: 49500,
            workingDays: 22,
            presentDays: 22,
            employeeId: '', // Must be provided
            payrollCycleId: '', // Must be provided
        };
    }
}

export const payrollCycleFactory = new PayrollCycleFactory();
export const payrollRecordFactory = new PayrollRecordFactory();
