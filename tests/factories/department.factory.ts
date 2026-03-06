import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Department } from '@prisma/client';

export class DepartmentFactory extends BaseFactory<Department> {
    protected model = prisma.department;

    protected async definition() {
        return {
            name: faker.commerce.department(),
            companyId: '', // Must be provided
        };
    }
}

export const departmentFactory = new DepartmentFactory();
