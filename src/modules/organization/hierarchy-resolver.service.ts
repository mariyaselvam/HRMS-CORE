import prisma from '../../common/utils/prisma';

export type PolicySource = 'BRANCH' | 'CLUSTER' | 'COMPANY_MASTER';

export interface EffectivePolicyResult<T> {
    data: T | null;
    source: PolicySource;
    isInherited: boolean;
}

export class HierarchyResolverService {
    /**
     * Resolves the location hierarchy context (Branch -> Cluster -> Company)
     */
    async getLocationContext(companyId: string, workLocationId: string) {
        return prisma.workLocation.findFirst({
            where: { id: workLocationId, companyId },
            include: {
                cluster: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        state: true
                    }
                }
            }
        });
    }

    /**
     * Resolves effective payroll rule:
     * 1. Branch specific rule
     * 2. Fallback to Company Master Default
     */
    async getEffectivePayrollRule(companyId: string, workLocationId?: string): Promise<EffectivePolicyResult<any>> {
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
                return {
                    data: branchRule,
                    source: 'BRANCH',
                    isInherited: false
                };
            }
        }

        const masterRule = await prisma.payrollRule.findFirst({
            where: { companyId, workLocationId: null, isActive: true }
        });

        return {
            data: masterRule,
            source: 'COMPANY_MASTER',
            isInherited: Boolean(workLocationId)
        };
    }

    /**
     * Resolves effective holidays for a branch:
     * Merges Company Master holidays + Cluster holidays (if branch has cluster) + Branch holidays.
     * Specificity hierarchy: Branch > Cluster > Company Master.
     */
    async getEffectiveHolidays(companyId: string, workLocationId?: string, year?: number) {
        const dateFilter = year
            ? {
                  gte: new Date(`${year}-01-01`),
                  lte: new Date(`${year}-12-31`)
              }
            : undefined;

        // 1. Fetch Company Master holidays (no workLocation, no cluster)
        const masterHolidays = await prisma.holiday.findMany({
            where: {
                companyId,
                workLocationId: null,
                clusterId: null,
                ...(dateFilter ? { date: dateFilter } : {})
            },
            orderBy: { date: 'asc' }
        });

        if (!workLocationId) {
            return masterHolidays.map((h) => ({
                ...h,
                source: 'COMPANY_MASTER' as PolicySource,
                isInherited: false
            }));
        }

        // 2. Fetch location with cluster info
        const location = await this.getLocationContext(companyId, workLocationId);

        // 3. Fetch Cluster holidays (if location is in a cluster)
        let clusterHolidays: any[] = [];
        if (location?.clusterId) {
            clusterHolidays = await prisma.holiday.findMany({
                where: {
                    companyId,
                    clusterId: location.clusterId,
                    workLocationId: null,
                    ...(dateFilter ? { date: dateFilter } : {})
                },
                orderBy: { date: 'asc' }
            });
        }

        // 4. Fetch Branch-specific holidays
        const branchHolidays = await prisma.holiday.findMany({
            where: {
                companyId,
                workLocationId,
                ...(dateFilter ? { date: dateFilter } : {})
            },
            orderBy: { date: 'asc' }
        });

        // 5. Merge with precedence: Branch > Cluster > Master
        const holidayMap = new Map<string, any>();

        for (const h of masterHolidays) {
            const dateKey = h.date.toISOString().split('T')[0];
            holidayMap.set(dateKey, {
                ...h,
                source: 'COMPANY_MASTER' as PolicySource,
                isInherited: true
            });
        }

        for (const h of clusterHolidays) {
            const dateKey = h.date.toISOString().split('T')[0];
            holidayMap.set(dateKey, {
                ...h,
                source: 'CLUSTER' as PolicySource,
                isInherited: true
            });
        }

        for (const h of branchHolidays) {
            const dateKey = h.date.toISOString().split('T')[0];
            holidayMap.set(dateKey, {
                ...h,
                source: 'BRANCH' as PolicySource,
                isInherited: false
            });
        }

        return Array.from(holidayMap.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }

    /**
     * Resolves effective shifts available for a branch (Company Master shifts + Branch-specific shifts)
     */
    async getEffectiveShifts(companyId: string, workLocationId?: string) {
        if (!workLocationId) {
            return prisma.shift.findMany({
                where: { companyId, status: 'active' },
                orderBy: { name: 'asc' }
            });
        }

        return prisma.shift.findMany({
            where: {
                companyId,
                status: 'active',
                OR: [
                    { workLocationId: null },
                    { workLocationId: workLocationId }
                ]
            },
            include: {
                workLocation: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }
}
