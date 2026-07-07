import { CompensationRepository } from './compensation.repository';
import prisma from '../../common/utils/prisma';
import { AppError, NotFoundError } from '../../common/errors/AppError';

export class CompensationService {
    private repository: CompensationRepository;

    constructor() {
        this.repository = new CompensationRepository();
    }

    async createCycle(companyId: string, name: string, effectiveFrom: string) {
        const date = new Date(effectiveFrom);
        if (isNaN(date.getTime())) {
            throw new AppError('Invalid effective date format', 400);
        }
        return this.repository.createCycle(companyId, name, date);
    }

    async getCycles(companyId: string) {
        return this.repository.getCycles(companyId);
    }

    async getCycleRevisions(cycleId: string) {
        const cycle = await this.repository.getCycleWithRevisions(cycleId);
        if (!cycle) {
            throw new NotFoundError('Compensation cycle not found');
        }
        return cycle;
    }

    async calculateBulkIncrement(
        companyId: string,
        cycleId: string,
        filters: { departmentId?: string; employeeIds?: string[] },
        incrementType: 'percentage' | 'fixed',
        value: number
    ) {
        const cycle = await prisma.compensationCycle.findUnique({
            where: { id: cycleId }
        });
        if (!cycle) throw new NotFoundError('Cycle not found');
        if (cycle.status === 'applied') {
            throw new AppError('Cannot update an already applied compensation cycle', 400);
        }

        // Get employees matching filter
        const whereClause: any = {
            companyId,
            employmentStatus: { in: ['active', 'probation'] }
        };

        if (filters.employeeIds && filters.employeeIds.length > 0) {
            whereClause.id = { in: filters.employeeIds };
        } else if (filters.departmentId) {
            whereClause.departmentId = filters.departmentId;
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: {
                salaryStructures: {
                    where: { isActive: true },
                    orderBy: { effectiveFrom: 'desc' },
                    take: 1
                }
            }
        });

        const revisionsToUpsert = [];

        for (const emp of employees) {
            const currentSalary = emp.salaryStructures[0];
            if (!currentSalary) continue; // Skip employees with no set salary

            const currentGross = Number(currentSalary.grossSalary);
            let proposedGross = currentGross;

            if (incrementType === 'percentage') {
                proposedGross = currentGross * (1 + value / 100);
            } else if (incrementType === 'fixed') {
                proposedGross = currentGross + value;
            }

            proposedGross = Math.round(proposedGross);

            // Compute standard component split:
            // Basic = 50% of Gross
            // HRA = 40% of Basic
            // Transport = same or default
            // Other allowances = remainder
            const basic = Math.round(proposedGross * 0.50);
            const hra = Math.round(basic * 0.40);
            const transport = Number(currentSalary.transportAllowance);
            const other = Math.max(0, proposedGross - (basic + hra + transport));

            revisionsToUpsert.push({
                compensationCycleId: cycleId,
                employeeId: emp.id,
                currentGross,
                proposedGross,
                basicSalary: basic,
                hra,
                transportAllowance: transport,
                otherAllowances: other,
                status: 'draft'
            });
        }

        if (revisionsToUpsert.length > 0) {
            await this.repository.upsertRevisions(revisionsToUpsert);
        }

        return { computedCount: revisionsToUpsert.length };
    }

    async applyCycle(companyId: string, cycleId: string) {
        const cycle = await prisma.compensationCycle.findFirst({
            where: { id: cycleId, companyId },
            include: { revisions: true }
        });

        if (!cycle) throw new NotFoundError('Compensation cycle not found');
        if (cycle.status === 'applied') {
            throw new AppError('Cycle already applied', 400);
        }
        if (cycle.revisions.length === 0) {
            throw new AppError('No draft revisions to apply in this cycle', 400);
        }

        await this.repository.applyRevisions(cycleId, cycle.revisions, cycle.effectiveFrom);
        return { success: true, appliedCount: cycle.revisions.length };
    }
}
