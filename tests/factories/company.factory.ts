import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import { Company } from '@prisma/client';
import { SystemRole } from '../../src/common/enums/role.enum';

export class CompanyFactory extends BaseFactory<Company> {
    protected model = prisma.company;

    protected async definition() {
        return {
            name: faker.company.name(),
            industryType: faker.company.buzzNoun(),
            employeeLimit: 100,
            timezone: 'UTC',
            status: 'active',
        };
    }

    // Specialized method to create a company with essential seeds (Roles, etc.)
    async createWithBasics(overrides: Partial<any> = {}) {
        const company = await this.create(overrides);

        // Find or create Company Admin role
        let adminRole = await prisma.role.findFirst({
            where: {
                OR: [
                    { companyId: null, name: SystemRole.COMPANY_ADMIN },
                    { companyId: company.id, name: SystemRole.COMPANY_ADMIN }
                ]
            }
        });

        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    companyId: company.id,
                    name: SystemRole.COMPANY_ADMIN,
                    description: 'Full system access',
                    isSystemRole: true,
                }
            });
        }

        return { company, adminRole };
    }
}

export const companyFactory = new CompanyFactory();
