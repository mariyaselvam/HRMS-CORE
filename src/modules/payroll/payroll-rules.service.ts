import prisma from '../../common/utils/prisma';

export class PayrollRulesService {
    async getRule(companyId: string) {
        return prisma.payrollRule.findUnique({
            where: { companyId }
        });
    }

    async upsertRule(companyId: string, data: any) {
        return prisma.payrollRule.upsert({
            where: { companyId },
            create: { ...data, companyId },
            update: data
        });
    }
}
