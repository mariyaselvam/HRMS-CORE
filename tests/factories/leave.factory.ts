import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { LeaveType, LeaveRequest, LeaveBalance } from '@prisma/client';

export class LeaveTypeFactory extends BaseFactory<LeaveType> {
    protected model = prisma.leaveType;

    protected async definition() {
        return {
            name: faker.helpers.arrayElement(['Casual Leave', 'Sick Leave', 'Earned Leave']),
            maxDays: 12,
            isPaid: true,
            carryForward: false,
            companyId: '', // Must be provided
        };
    }
}

export class LeaveRequestFactory extends BaseFactory<LeaveRequest> {
    protected model = prisma.leaveRequest;

    protected async definition() {
        const startDate = faker.date.future();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 2);

        return {
            startDate,
            endDate,
            totalDays: 3,
            reason: faker.lorem.sentence(),
            status: 'pending',
            employeeId: '', // Must be provided
            leaveTypeId: '', // Must be provided
        };
    }
}

export class LeaveBalanceFactory extends BaseFactory<LeaveBalance> {
    protected model = prisma.leaveBalance;

    protected async definition() {
        return {
            year: new Date().getFullYear(),
            entitledDays: 12,
            balance: 12,
            carriedForward: 0,
            employeeId: '', // Must be provided
            leaveTypeId: '', // Must be provided
        };
    }
}

export const leaveTypeFactory = new LeaveTypeFactory();
export const leaveRequestFactory = new LeaveRequestFactory();
export const leaveBalanceFactory = new LeaveBalanceFactory();
