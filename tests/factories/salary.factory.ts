import { faker } from '@faker-js/faker';
import { BaseFactory } from './base.factory';
import prisma from '../../src/common/utils/prisma';
import {
    SalaryComponent,
    SalaryTemplate,
    SalaryStructure,
} from '@prisma/client';

export class SalaryComponentFactory extends BaseFactory<SalaryComponent> {
    protected model = prisma.salaryComponent;

    protected async definition() {
        return {
            name: `${faker.finance.accountName()} Allowance`,
            code: `COMP_${faker.string.alphanumeric(4).toUpperCase()}`,
            type: 'earning',
            calcType: 'fixed',
            calcValue: 0,
            isTaxable: true,
            pfApplicable: false,
            esiApplicable: false,
            companyId: '', // Must be provided
        };
    }

    /**
     * Seeds the standard corporate salary components.
     */
    async seedStandardComponents(companyId: string): Promise<SalaryComponent[]> {
        const componentConfigs = [
            {
                code: 'BASIC',
                name: 'Basic Salary',
                type: 'earning',
                calcType: 'fixed',
                calcValue: 0,
                isTaxable: true,
                pfApplicable: true,
                esiApplicable: true,
            },
            {
                code: 'HRA',
                name: 'House Rent Allowance',
                type: 'earning',
                calcType: 'pct_basic',
                calcValue: 40,
                isTaxable: true,
                pfApplicable: false,
                esiApplicable: true,
            },
            {
                code: 'TRANSPORT',
                name: 'Transport Allowance',
                type: 'earning',
                calcType: 'fixed',
                calcValue: 1600,
                isTaxable: false,
                pfApplicable: false,
                esiApplicable: false,
            },
            {
                code: 'SPECIAL',
                name: 'Special Allowance',
                type: 'earning',
                calcType: 'remaining',
                calcValue: 0,
                isTaxable: true,
                pfApplicable: false,
                esiApplicable: true,
            },
            {
                code: 'PF_EMP',
                name: 'Provident Fund (Employee)',
                type: 'deduction',
                calcType: 'pct_basic',
                calcValue: 12,
                isTaxable: false,
                pfApplicable: true,
                esiApplicable: false,
            },
        ];

        const seeded: SalaryComponent[] = [];
        for (const config of componentConfigs) {
            const comp = await prisma.salaryComponent.upsert({
                where: { companyId_code: { companyId, code: config.code } },
                update: {},
                create: { companyId, ...config },
            });
            seeded.push(comp);
        }

        return seeded;
    }
}

export class SalaryTemplateFactory extends BaseFactory<SalaryTemplate> {
    protected model = prisma.salaryTemplate;

    protected async definition() {
        return {
            name: `${faker.commerce.department()} Salary Template`,
            description: faker.lorem.sentence(),
            companyId: '', // Must be provided
        };
    }

    /**
     * Creates standard corporate template and links template items in order.
     */
    async createStandardTemplate(companyId: string, components: SalaryComponent[]): Promise<SalaryTemplate> {
        const template = await this.create({
            companyId,
            name: 'Standard Corporate Template',
            description: 'Standard salary template with HRA (40% of basic) and PF contribution (12% of basic).',
        });

        const orderMap: Record<string, number> = {
            BASIC: 1,
            HRA: 2,
            TRANSPORT: 3,
            SPECIAL: 4,
            PF_EMP: 5,
        };

        const templateItems = components
            .filter((c) => orderMap[c.code] !== undefined)
            .map((c) => ({
                salaryTemplateId: template.id,
                salaryComponentId: c.id,
                calculationOrder: orderMap[c.code],
            }));

        if (templateItems.length > 0) {
            await prisma.salaryTemplateItem.createMany({
                data: templateItems,
            });
        }

        return template;
    }
}

export class SalaryStructureFactory extends BaseFactory<SalaryStructure> {
    protected model = prisma.salaryStructure;

    protected async definition() {
        return {
            grossSalary: 50000,
            netSalary: 45000,
            effectiveFrom: new Date(),
            isActive: true,
            employeeId: '', // Must be provided
        };
    }

    /**
     * Creates an active salary structure for an employee with breakdown items,
     * and links the employee to the template.
     */
    async assignStructureWithItems(params: {
        employeeId: string;
        templateId?: string;
        grossSalary: number;
        netSalary: number;
        effectiveFrom?: Date;
        items: Array<{ salaryComponentId: string; amount: number }>;
    }): Promise<SalaryStructure> {
        if (params.templateId) {
            await prisma.employee.update({
                where: { id: params.employeeId },
                data: { salaryTemplateId: params.templateId },
            });
        }

        const structure = await this.create({
            employeeId: params.employeeId,
            grossSalary: params.grossSalary,
            netSalary: params.netSalary,
            effectiveFrom: params.effectiveFrom ?? new Date(),
            isActive: true,
        });

        if (params.items.length > 0) {
            await prisma.salaryStructureItem.createMany({
                data: params.items.map((item) => ({
                    salaryStructureId: structure.id,
                    salaryComponentId: item.salaryComponentId,
                    amount: item.amount,
                })),
            });
        }

        return structure;
    }
}

export const salaryComponentFactory = new SalaryComponentFactory();
export const salaryTemplateFactory = new SalaryTemplateFactory();
export const salaryStructureFactory = new SalaryStructureFactory();
