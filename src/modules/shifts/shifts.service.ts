import { ShiftsRepository } from './shifts.repository';
import { CreateShiftInput, UpdateShiftInput, BulkAssignShiftInput, BulkRemoveShiftInput, TransferShiftInput, ShiftEmployeeFilterInput } from './shifts.validator';
import { AppError, NotFoundError } from '../../common/errors/AppError';
import prisma from '../../common/utils/prisma';

export class ShiftsService {
    private repository: ShiftsRepository;

    constructor() {
        this.repository = new ShiftsRepository();
    }

    // --- Shift CRUD ---
    async addShift(companyId: string, data: CreateShiftInput) {
        // Check for duplicate code
        const existing = await prisma.shift.findFirst({
            where: { companyId, code: data.code }
        });
        if (existing) {
            throw new AppError(`Shift with code '${data.code}' already exists`, 409);
        }
        return this.repository.createShift(companyId, data);
    }

    async editShift(shiftId: string, companyId: string, data: UpdateShiftInput) {
        const shift = await this.repository.getShiftById(shiftId, companyId);
        if (!shift) {
            throw new NotFoundError('Shift not found');
        }

        // Check for duplicate code if code is being changed
        if (data.code && data.code !== (shift as any).code) {
            const existing = await prisma.shift.findFirst({
                where: { companyId, code: data.code, id: { not: shiftId } }
            });
            if (existing) {
                throw new AppError(`Shift with code '${data.code}' already exists`, 409);
            }
        }

        return this.repository.updateShift(shiftId, companyId, data);
    }

    async getAllShifts(companyId: string) {
        return this.repository.listShifts(companyId);
    }

    async getShiftById(shiftId: string, companyId: string) {
        const shift = await this.repository.getShiftById(shiftId, companyId);
        if (!shift) {
            throw new NotFoundError('Shift not found');
        }
        return shift;
    }

    // --- Bulk Assignment ---
    async bulkAssign(data: BulkAssignShiftInput) {
        // Validate shift exists
        const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
        if (!shift) {
            throw new NotFoundError('Shift not found');
        }

        // Validate all employees exist
        const employees = await prisma.employee.findMany({
            where: { id: { in: data.employeeIds } },
            select: { id: true }
        });
        const validEmployeeIds = new Set(employees.map(e => e.id));
        const invalidIds = data.employeeIds.filter(id => !validEmployeeIds.has(id));

        if (invalidIds.length > 0) {
            throw new AppError(`Invalid employee IDs: ${invalidIds.join(', ')}`, 400);
        }

        return this.repository.bulkAssignShift(data);
    }

    async bulkRemove(data: BulkRemoveShiftInput) {
        const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
        if (!shift) {
            throw new NotFoundError('Shift not found');
        }
        return this.repository.bulkRemoveShift(data);
    }

    async transfer(data: TransferShiftInput) {
        // Validate both shifts exist
        const [fromShift, toShift] = await Promise.all([
            prisma.shift.findUnique({ where: { id: data.fromShiftId } }),
            prisma.shift.findUnique({ where: { id: data.toShiftId } })
        ]);

        if (!fromShift) {
            throw new NotFoundError('Source shift not found');
        }
        if (!toShift) {
            throw new NotFoundError('Target shift not found');
        }

        return this.repository.transferShift(data);
    }

    // --- Shift Employee Queries ---
    async getShiftEmployees(shiftId: string, companyId: string, filter: ShiftEmployeeFilterInput) {
        const shift = await this.repository.getShiftById(shiftId, companyId);
        if (!shift) {
            throw new NotFoundError('Shift not found');
        }
        return this.repository.getShiftEmployees(shiftId, companyId, filter);
    }

    // --- Legacy: Used by Attendance module ---
    async getActiveShift(employeeId: string) {
        return this.repository.getActiveShift(employeeId);
    }
}