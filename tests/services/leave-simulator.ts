import prisma from '../../src/common/utils/prisma';
import { leaveTypeFactory, leaveRequestFactory, leaveBalanceFactory } from '../factories/leave.factory';
import { faker } from '@faker-js/faker';

export class LeaveSimulator {
    /**
     * Initializes leave setup for a company and its employees.
     */
    async setupLeaveBasics(companyId: string, employeeIds: string[]) {
        // 1. Create default leave types if they don't exist
        const names = ['Casual Leave', 'Sick Leave', 'Earned Leave'];
        const leaveTypes = [];

        for (const name of names) {
            let lt = await prisma.leaveType.findFirst({ where: { companyId, name } });
            if (!lt) {
                lt = await leaveTypeFactory.create({ companyId, name });
            }
            leaveTypes.push(lt);
        }

        // 2. Assign balances to all employees
        for (const empId of employeeIds) {
            for (const lt of leaveTypes) {
                const existing = await prisma.leaveBalance.findUnique({
                    where: {
                        employeeId_leaveTypeId_year: {
                            employeeId: empId,
                            leaveTypeId: lt.id,
                            year: new Date().getFullYear()
                        }
                    }
                });

                if (!existing) {
                    await leaveBalanceFactory.create({
                        employeeId: empId,
                        leaveTypeId: lt.id,
                        balance: 10,
                        entitledDays: 10
                    });
                }
            }
        }

        return leaveTypes;
    }

    /**
     * Randomly generates leave requests for a list of employees.
     */
    async simulateRequests(employeeIds: string[], count: number) {
        const requests = [];
        const leaveTypes = await prisma.leaveType.findMany({
            where: { name: { in: ['Casual Leave', 'Sick Leave'] } }
        });

        for (let i = 0; i < count; i++) {
            const empId = faker.helpers.arrayElement(employeeIds);
            const lt = faker.helpers.arrayElement(leaveTypes);

            const startDate = faker.date.recent({ days: 30 });
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + faker.number.int({ min: 1, max: 3 }));

            const status = faker.helpers.arrayElement(['approved', 'rejected', 'pending']);

            const request = await leaveRequestFactory.create({
                employeeId: empId,
                leaveTypeId: lt.id,
                startDate,
                endDate,
                totalDays: 2,
                status,
                reason: faker.lorem.sentence()
            });

            requests.push(request);
        }

        return requests;
    }
}

export const leaveSimulator = new LeaveSimulator();
