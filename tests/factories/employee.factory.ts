import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Employee } from '@prisma/client';

export class EmployeeFactory extends BaseFactory<Employee> {
    protected model = prisma.employee;

    protected async definition() {
        return {
            employeeCode: `EMP${faker.string.numeric(5)}`,
            dateOfJoining: faker.date.past(),
            employmentStatus: 'active',
            onboardingStep: 4,
            profileCompletion: 100,
        };
    }

    async createFull(companyId: string, departmentId: string, roleId: string, overrides: any = {}) {
        const email = overrides.email || faker.internet.email();
        const passwordHash = await bcrypt.hash('Password123!', 10);

        // 1. Create User
        const user = await prisma.user.create({
            data: {
                companyId,
                email,
                passwordHash,
                roleId,
                isActive: true,
            },
        });

        // 2. Create Employee
        const employee = await this.create({
            companyId,
            departmentId,
            userId: user.id,
            ...overrides,
        });

        // 3. Create Personal Details
        await prisma.employeePersonalDetail.create({
            data: {
                employeeId: employee.id,
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                gender: faker.helpers.arrayElement(['male', 'female']),
                mobile: faker.phone.number(),
            },
        });

        // 4. Create Job Details
        await prisma.employeeJobDetail.create({
            data: {
                employeeId: employee.id,
                designation: faker.person.jobTitle(),
                employmentType: 'Full-time',
                workLocationType: 'Office',
            }
        });

        // 5. Create Salary Structure
        // @ts-ignore
        await prisma.salaryStructure.create({
            data: {
                employeeId: employee.id,
                basicSalary: 30000,
                hra: 15000,
                transportAllowance: 5000,
                otherAllowances: 5000,
                grossSalary: 55000,
                // @ts-ignore
                pfContribution: 1800,
                // @ts-ignore
                esiContribution: 500,
                effectiveFrom: new Date('2024-01-01'),
                isActive: true
            }
        });

        return { user, employee };
    }
}

export const employeeFactory = new EmployeeFactory();
