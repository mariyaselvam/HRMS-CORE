import prisma from '../../common/utils/prisma';
import { CreateShiftInput, UpdateShiftInput, BulkAssignShiftInput, BulkRemoveShiftInput, TransferShiftInput, ShiftEmployeeFilterInput } from './shifts.validator';

export class ShiftsRepository {
    // --- Shift CRUD ---
    async createShift(companyId: string, data: CreateShiftInput) {
        const today = new Date().toISOString().split('T')[0];
        const startTime = new Date(`${today}T${data.startTime}:00Z`);
        const endTime = new Date(`${today}T${data.endTime}:00Z`);

        return prisma.shift.create({
            data: {
                name: data.name,
                code: data.code,
                startTime,
                endTime,
                graceMinutes: data.graceMinutes || 0,
                breakDuration: data.breakDuration || 0,
                status: data.status || 'active',
                companyId
            }
        });
    }

    async updateShift(shiftId: string, companyId: string, data: UpdateShiftInput) {
        const updateData: any = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (data.graceMinutes !== undefined) updateData.graceMinutes = data.graceMinutes;
        if (data.breakDuration !== undefined) updateData.breakDuration = data.breakDuration;
        if (data.status !== undefined) updateData.status = data.status;

        if (data.startTime !== undefined) {
            const today = new Date().toISOString().split('T')[0];
            updateData.startTime = new Date(`${today}T${data.startTime}:00Z`);
        }
        if (data.endTime !== undefined) {
            const today = new Date().toISOString().split('T')[0];
            updateData.endTime = new Date(`${today}T${data.endTime}:00Z`);
        }

        return prisma.shift.update({
            where: { id: shiftId, companyId },
            data: updateData
        });
    }

    async getShiftById(shiftId: string, companyId: string) {
        return prisma.shift.findFirst({
            where: { id: shiftId, companyId }
        });
    }

    async listShifts(companyId: string) {
        const shifts = await prisma.shift.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        // Efficiently get employee counts for all shifts in a single query
        const shiftIds = shifts.map(s => s.id);
        const counts = await prisma.employeeShift.groupBy({
            by: ['shiftId'],
            where: {
                shiftId: { in: shiftIds },
                isActive: true
            },
            _count: { id: true }
        });

        const countMap = new Map(counts.map(c => [c.shiftId, c._count.id]));

        return shifts.map(shift => ({
            ...shift,
            employeeCount: countMap.get(shift.id) || 0
        }));
    }

    // --- Bulk Assignment Operations ---
    async bulkAssignShift(data: BulkAssignShiftInput) {
        const { shiftId, employeeIds, effectiveFrom } = data;
        const effectiveDate = new Date(effectiveFrom);

        const results: { employeeId: string; success: boolean; error?: string }[] = [];

        for (const employeeId of employeeIds) {
            try {
                // Check for existing active assignment
                const existing = await prisma.employeeShift.findFirst({
                    where: {
                        employeeId,
                        isActive: true,
                        effectiveTo: null
                    }
                });

                if (existing) {
                    // Deactivate the old assignment
                    await prisma.employeeShift.update({
                        where: { id: existing.id },
                        data: {
                            isActive: false,
                            effectiveTo: effectiveDate
                        }
                    });
                }

                // Check for duplicate assignment on same effective date
                const duplicate = await prisma.employeeShift.findUnique({
                    where: {
                        employeeId_effectiveFrom: {
                            employeeId,
                            effectiveFrom: effectiveDate
                        }
                    }
                });

                if (duplicate) {
                    results.push({
                        employeeId,
                        success: false,
                        error: 'Duplicate assignment for this effective date'
                    });
                    continue;
                }

                await prisma.employeeShift.create({
                    data: {
                        employeeId,
                        shiftId,
                        effectiveFrom: effectiveDate,
                        isActive: true
                    }
                });

                results.push({ employeeId, success: true });
            } catch (error: any) {
                results.push({
                    employeeId,
                    success: false,
                    error: error.message || 'Assignment failed'
                });
            }
        }

        return results;
    }

    async bulkRemoveShift(data: BulkRemoveShiftInput) {
        const { shiftId, employeeIds } = data;

        const results: { employeeId: string; success: boolean; error?: string }[] = [];

        for (const employeeId of employeeIds) {
            try {
                const assignment = await prisma.employeeShift.findFirst({
                    where: {
                        employeeId,
                        shiftId,
                        isActive: true
                    }
                });

                if (!assignment) {
                    results.push({
                        employeeId,
                        success: false,
                        error: 'No active assignment found'
                    });
                    continue;
                }

                await prisma.employeeShift.update({
                    where: { id: assignment.id },
                    data: {
                        isActive: false,
                        effectiveTo: new Date()
                    }
                });

                results.push({ employeeId, success: true });
            } catch (error: any) {
                results.push({
                    employeeId,
                    success: false,
                    error: error.message || 'Removal failed'
                });
            }
        }

        return results;
    }

    async transferShift(data: TransferShiftInput) {
        const { fromShiftId, toShiftId, employeeIds, effectiveFrom } = data;
        const effectiveDate = new Date(effectiveFrom);

        const results: { employeeId: string; success: boolean; error?: string }[] = [];

        for (const employeeId of employeeIds) {
            try {
                // Deactivate current assignment
                const currentAssignment = await prisma.employeeShift.findFirst({
                    where: {
                        employeeId,
                        shiftId: fromShiftId,
                        isActive: true
                    }
                });

                if (!currentAssignment) {
                    results.push({
                        employeeId,
                        success: false,
                        error: 'No active assignment found for source shift'
                    });
                    continue;
                }

                await prisma.employeeShift.update({
                    where: { id: currentAssignment.id },
                    data: {
                        isActive: false,
                        effectiveTo: effectiveDate
                    }
                });

                // Check for duplicate on same effective date
                const duplicate = await prisma.employeeShift.findUnique({
                    where: {
                        employeeId_effectiveFrom: {
                            employeeId,
                            effectiveFrom: effectiveDate
                        }
                    }
                });

                if (duplicate) {
                    results.push({
                        employeeId,
                        success: false,
                        error: 'Duplicate assignment for this effective date'
                    });
                    continue;
                }

                // Create new assignment
                await prisma.employeeShift.create({
                    data: {
                        employeeId,
                        shiftId: toShiftId,
                        effectiveFrom: effectiveDate,
                        isActive: true
                    }
                });

                results.push({ employeeId, success: true });
            } catch (error: any) {
                results.push({
                    employeeId,
                    success: false,
                    error: error.message || 'Transfer failed'
                });
            }
        }

        return results;
    }

    // --- Shift Employee Queries ---
    async getShiftEmployees(shiftId: string, companyId: string, filter: ShiftEmployeeFilterInput) {
        const page = Number(filter.page) || 1;
        const limit = Number(filter.limit) || 10;
        const skip = (page - 1) * limit;

        const where: any = {
            shiftId,
            isActive: true,
            employee: {
                companyId,
                ...(filter.search ? {
                    OR: [
                        { employeeCode: { contains: filter.search, mode: 'insensitive' as const } },
                        { personalDetails: { firstName: { contains: filter.search, mode: 'insensitive' as const } } },
                        { personalDetails: { lastName: { contains: filter.search, mode: 'insensitive' as const } } }
                    ]
                } : {}),
                ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
                ...(filter.workLocationId ? { workLocationId: filter.workLocationId } : {}),
                ...(filter.status ? { employmentStatus: filter.status } : {})
            }
        };

        const [records, total] = await Promise.all([
            prisma.employeeShift.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            personalDetails: {
                                select: { firstName: true, lastName: true }
                            },
                            department: {
                                select: { id: true, name: true }
                            },
                            workLocation: {
                                select: { id: true, name: true }
                            }
                        }
                    },
                    shift: {
                        select: { id: true, name: true, code: true }
                    }
                },
                orderBy: { effectiveFrom: 'desc' },
                skip,
                take: limit
            }),
            prisma.employeeShift.count({ where })
        ]);

        return {
            total,
            records: records.map(r => ({
                id: r.id,
                employeeId: r.employeeId,
                employeeCode: r.employee.employeeCode,
                employeeName: r.employee.personalDetails
                    ? `${r.employee.personalDetails.firstName} ${r.employee.personalDetails.lastName}`
                    : 'N/A',
                department: r.employee.department,
                branch: r.employee.workLocation,
                shift: r.shift,
                isActive: r.isActive,
                effectiveFrom: r.effectiveFrom,
                effectiveTo: r.effectiveTo,
                createdAt: r.createdAt
            }))
        };
    }

    // --- Legacy: Single employee shift operations ---
    async assignSingleShift(employeeId: string, shiftId: string, effectiveFrom: Date) {
        return prisma.employeeShift.create({
            data: {
                employeeId,
                shiftId,
                effectiveFrom,
                isActive: true
            }
        });
    }

    async getActiveShift(employeeId: string) {
        const now = new Date();
        return prisma.employeeShift.findFirst({
            where: {
                employeeId,
                isActive: true,
                effectiveFrom: { lte: now }
            },
            include: { shift: true },
            orderBy: { effectiveFrom: 'desc' }
        });
    }
}