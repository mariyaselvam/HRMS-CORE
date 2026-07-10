import prisma from '../../common/utils/prisma';
import { NotFoundError } from '../../common/errors/AppError';

export class SalaryComponentService {
    async createComponent(companyId: string, data: any) {
        return prisma.salaryComponent.create({
            data: {
                companyId,
                name: data.name,
                code: data.code.toUpperCase(),
                type: data.type,
                calcType: data.calcType,
                calcValue: data.calcValue,
                formula: data.formula,
                isTaxable: data.isTaxable !== undefined ? data.isTaxable : true,
                pfApplicable: !!data.pfApplicable,
                esiApplicable: !!data.esiApplicable,
                isActive: true
            }
        });
    }

    async getComponents(companyId: string) {
        return prisma.salaryComponent.findMany({
            where: { companyId, isActive: true },
            orderBy: { name: 'asc' }
        });
    }

    async updateComponent(companyId: string, id: string, data: any) {
        const component = await prisma.salaryComponent.findFirst({
            where: { id, companyId }
        });
        if (!component) throw new NotFoundError('Component not found');

        return prisma.salaryComponent.update({
            where: { id },
            data: {
                name: data.name,
                calcType: data.calcType,
                calcValue: data.calcValue,
                formula: data.formula,
                isTaxable: data.isTaxable,
                pfApplicable: data.pfApplicable,
                esiApplicable: data.esiApplicable,
                isActive: data.isActive
            }
        });
    }

    async deleteComponent(companyId: string, id: string) {
        const component = await prisma.salaryComponent.findFirst({
            where: { id, companyId }
        });
        if (!component) throw new NotFoundError('Component not found');

        // Safe soft-delete
        return prisma.salaryComponent.update({
            where: { id },
            data: { isActive: false }
        });
    }
}
