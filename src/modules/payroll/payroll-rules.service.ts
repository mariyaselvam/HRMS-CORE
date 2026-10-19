import prisma from '../../common/utils/prisma';

export class PayrollRulesService {
    /**
     * Get rule for a specific scope (Company master rule if workLocationId is omitted, or branch rule)
     */
    async getRule(companyId: string, workLocationId?: string) {
        return prisma.payrollRule.findFirst({
            where: {
                companyId,
                workLocationId: workLocationId || null
            },
            include: {
                workLocation: {
                    select: { id: true, name: true }
                }
            }
        });
    }

    /**
     * Get effective rule applying inheritance:
     * 1. Specific branch rule (if workLocationId is provided)
     * 2. Fallback to Company Master Default (workLocationId = null)
     */
    async getEffectiveRule(companyId: string, workLocationId?: string) {
        if (workLocationId) {
            const branchRule = await prisma.payrollRule.findFirst({
                where: { companyId, workLocationId, isActive: true },
                include: {
                    workLocation: {
                        select: { id: true, name: true }
                    }
                }
            });
            if (branchRule) {
                return { ...branchRule, isInherited: false };
            }
        }

        const masterRule = await prisma.payrollRule.findFirst({
            where: { companyId, workLocationId: null, isActive: true }
        });

        if (masterRule) {
            return { ...masterRule, isInherited: Boolean(workLocationId) };
        }

        return null;
    }

    /**
     * Get all configured payroll rules for a company (master + branch overrides)
     */
    async getAllRules(companyId: string) {
        return prisma.payrollRule.findMany({
            where: { companyId },
            include: {
                workLocation: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    /**
     * Create or update a payroll rule for master company default or a specific branch
     */
    async upsertRule(companyId: string, data: any, workLocationId?: string) {
        const targetLocationId = workLocationId || data.workLocationId || null;
        
        // Remove keys that should not be mass-assigned in update
        const { companyId: _, id: __, workLocationId: ___, workLocation: ____, ...updatePayload } = data;

        const existing = await prisma.payrollRule.findFirst({
            where: {
                companyId,
                workLocationId: targetLocationId
            }
        });

        if (existing) {
            return prisma.payrollRule.update({
                where: { id: existing.id },
                data: updatePayload
            });
        }

        return prisma.payrollRule.create({
            data: {
                ...updatePayload,
                companyId,
                workLocationId: targetLocationId
            }
        });
    }
}
