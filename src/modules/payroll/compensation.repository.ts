import prisma from '../../common/utils/prisma';

export class CompensationRepository {
    async createCycle(companyId: string, name: string, effectiveFrom: Date) {
        return prisma.compensationCycle.create({
            data: {
                companyId,
                name,
                effectiveFrom,
                status: 'draft'
            }
        });
    }

    async getCycles(companyId: string) {
        return prisma.compensationCycle.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getCycleWithRevisions(cycleId: string) {
        return prisma.compensationCycle.findUnique({
            where: { id: cycleId },
            include: {
                revisions: {
                    include: {
                        employee: {
                            include: {
                                personalDetails: {
                                    select: { firstName: true, lastName: true }
                                },
                                department: { select: { name: true } }
                            }
                        }
                    }
                }
            }
        });
    }

    async deleteRevisions(cycleId: string, employeeIds: string[]) {
        return prisma.salaryRevision.deleteMany({
            where: {
                compensationCycleId: cycleId,
                employeeId: { in: employeeIds }
            }
        });
    }

    async upsertRevisions(revisions: any[]) {
        // Since Prisma batch upsert isn't directly clean with unique constraints, we do it in a transaction
        return prisma.$transaction(
            revisions.map(rev =>
                prisma.salaryRevision.upsert({
                    where: {
                        compensationCycleId_employeeId: {
                            compensationCycleId: rev.compensationCycleId,
                            employeeId: rev.employeeId
                        }
                    },
                    update: {
                        currentGross: rev.currentGross,
                        proposedGross: rev.proposedGross,
                        basicSalary: rev.basicSalary,
                        hra: rev.hra,
                        transportAllowance: rev.transportAllowance,
                        otherAllowances: rev.otherAllowances,
                        status: rev.status || 'draft'
                    },
                    create: {
                        compensationCycleId: rev.compensationCycleId,
                        employeeId: rev.employeeId,
                        currentGross: rev.currentGross,
                        proposedGross: rev.proposedGross,
                        basicSalary: rev.basicSalary,
                        hra: rev.hra,
                        transportAllowance: rev.transportAllowance,
                        otherAllowances: rev.otherAllowances,
                        status: rev.status || 'draft'
                    }
                })
            )
        );
    }

    async applyRevisions(cycleId: string, revisions: any[], effectiveFrom: Date) {
        return prisma.$transaction(async (tx) => {
            // 1. Update cycle status
            await tx.compensationCycle.update({
                where: { id: cycleId },
                data: { status: 'applied' }
            });

            // 2. Process each revision
            for (const rev of revisions) {
                // Deactivate current active salary structure
                await tx.salaryStructure.updateMany({
                    where: { employeeId: rev.employeeId, isActive: true },
                    data: {
                        isActive: false,
                        effectiveTo: new Date(effectiveFrom.getTime() - 24 * 60 * 60 * 1000) // Day before new one starts
                    }
                });

                // Create new active salary structure
                await tx.salaryStructure.create({
                    data: {
                        employeeId: rev.employeeId,
                        basicSalary: rev.basicSalary,
                        hra: rev.hra,
                        transportAllowance: rev.transportAllowance,
                        otherAllowances: rev.otherAllowances,
                        grossSalary: rev.proposedGross,
                        effectiveFrom: effectiveFrom,
                        isActive: true
                    }
                });
            }
        });
    }
}
