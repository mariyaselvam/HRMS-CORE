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

    /**
     * Seeds the standard corporate leave types.
     */
    async seedStandardLeaveTypes(companyId: string): Promise<LeaveType[]> {
        const leaveTypeConfigs = [
            { name: 'Casual Leave', maxDays: 12, isPaid: true, carryForward: false },
            { name: 'Sick Leave', maxDays: 8, isPaid: true, carryForward: false },
            { name: 'Earned Leave', maxDays: 15, isPaid: true, carryForward: true },
            { name: 'Unpaid Leave', maxDays: 30, isPaid: false, carryForward: false },
        ];

        const created: LeaveType[] = [];
        for (const lt of leaveTypeConfigs) {
            const item = await this.create({ companyId, ...lt });
            created.push(item);
        }
        return created;
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

    /**
     * Bulk seeds leave balances for an array of employees across leave types.
     */
    async seedBalancesForEmployees(
        employees: Array<{ id: string }>,
        leaveTypes: LeaveType[],
        year: number = new Date().getFullYear()
    ): Promise<void> {
        const balancesToInsert: Array<{
            employeeId: string;
            leaveTypeId: string;
            year: number;
            entitledDays: number;
            balance: number;
            carriedForward: number;
        }> = [];

        for (const employee of employees) {
            for (const lt of leaveTypes) {
                const used = faker.number.int({ min: 0, max: Math.min(3, lt.maxDays) });
                balancesToInsert.push({
                    employeeId: employee.id,
                    leaveTypeId: lt.id,
                    year,
                    entitledDays: lt.maxDays,
                    balance: lt.maxDays - used,
                    carriedForward: lt.carryForward ? faker.number.int({ min: 0, max: 5 }) : 0,
                });
            }
        }

        if (balancesToInsert.length > 0) {
            await prisma.leaveBalance.createMany({
                data: balancesToInsert,
                skipDuplicates: true,
            });
        }
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

    /**
     * Seeds dummy leave requests for employees with diverse approval statuses.
     */
    async seedDummyRequests(
        employees: Array<{ id: string }>,
        leaveTypes: LeaveType[],
        approverId: string,
        year: number = new Date().getFullYear()
    ): Promise<LeaveRequest[]> {
        const statuses = ['approved', 'approved', 'pending', 'rejected'];
        const requestsToInsert: Array<{
            employeeId: string;
            leaveTypeId: string;
            startDate: Date;
            endDate: Date;
            totalDays: number;
            reason: string;
            status: string;
            approvedBy: string | null;
            approvedAt: Date | null;
            rejectionReason: string | null;
        }> = [];

        for (const employee of employees) {
            const lt = faker.helpers.arrayElement(leaveTypes.slice(0, 3));
            const startDate = faker.date.between({
                from: new Date(`${year}-01-01`),
                to: new Date(`${year}-06-30`),
            });
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + faker.number.int({ min: 1, max: 3 }));
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
            const status = faker.helpers.arrayElement(statuses);

            requestsToInsert.push({
                employeeId: employee.id,
                leaveTypeId: lt.id,
                startDate,
                endDate,
                totalDays,
                reason: faker.lorem.sentence(),
                status,
                approvedBy: status !== 'pending' ? approverId : null,
                approvedAt: status !== 'pending' ? new Date() : null,
                rejectionReason:
                    status === 'rejected' ? 'Insufficient leave balance or business requirement.' : null,
            });
        }

        const created: LeaveRequest[] = [];
        for (const req of requestsToInsert) {
            const item = await this.create(req);
            created.push(item);
        }
        return created;
    }
}

export const leaveTypeFactory = new LeaveTypeFactory();
export const leaveBalanceFactory = new LeaveBalanceFactory();
export const leaveRequestFactory = new LeaveRequestFactory();
