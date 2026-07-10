import prisma from '../../common/utils/prisma';
import { NotFoundError } from '../../common/errors/AppError';
import { PayrollCalculationEngine } from './payroll-calculation.engine';

export class SalaryTemplateService {
    async createTemplate(companyId: string, data: any) {
        // Create template and map its template items inside a transaction
        return prisma.$transaction(async (tx) => {
            const template = await tx.salaryTemplate.create({
                data: {
                    companyId,
                    name: data.name,
                    description: data.description
                }
            });

            if (data.items && data.items.length > 0) {
                for (let i = 0; i < data.items.length; i++) {
                    const item = data.items[i];
                    await tx.salaryTemplateItem.create({
                        data: {
                            salaryTemplateId: template.id,
                            salaryComponentId: item.salaryComponentId,
                            calcType: item.calcType,
                            calcValue: item.calcValue,
                            calculationOrder: item.calculationOrder !== undefined ? item.calculationOrder : i
                        }
                    });
                }
            }

            return template;
        });
    }

    async getTemplates(companyId: string) {
        return prisma.salaryTemplate.findMany({
            where: { companyId },
            include: {
                items: {
                    include: {
                        component: true
                    },
                    orderBy: { calculationOrder: 'asc' }
                }
            }
        });
    }

    async getTemplateById(companyId: string, id: string) {
        const template = await prisma.salaryTemplate.findFirst({
            where: { id, companyId },
            include: {
                items: {
                    include: {
                        component: true
                    },
                    orderBy: { calculationOrder: 'asc' }
                }
            }
        });
        if (!template) throw new NotFoundError('Salary Template not found');
        return template;
    }

    async calculatePreview(companyId: string, templateId: string, monthlyCTC: number) {
        const template = await this.getTemplateById(companyId, templateId);

        // Map template items to engine input shape
        const engineInputs = template.items.map(item => ({
            id: item.id,
            code: item.component.code,
            name: item.component.name,
            type: item.component.type as 'earning' | 'deduction',
            calcType: item.calcType || item.component.calcType,
            calcValue: item.calcValue !== null ? Number(item.calcValue) : Number(item.component.calcValue),
            formula: item.component.formula || undefined,
            pfApplicable: item.component.pfApplicable,
            esiApplicable: item.component.esiApplicable,
            calculationOrder: item.calculationOrder
        }));

        return PayrollCalculationEngine.calculate(monthlyCTC, engineInputs);
    }
}
