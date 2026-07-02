import { ShiftsRepository } from './shifts.repository';
import { CreateShiftInput, AssignShiftInput } from './shifts.validator';

export class ShiftsService {
    private repository: ShiftsRepository;

    constructor() {
        this.repository = new ShiftsRepository();
    }

    async addShift(companyId: string, data: CreateShiftInput) {
        return this.repository.createShift(companyId, data);
    }

    async getAllShifts(companyId: string) {
        return this.repository.listShifts(companyId);
    }

    async assignEmployeeShift(data: AssignShiftInput) {
        return this.repository.assignShift(data);
    }

    async getActiveShift(employeeId: string) {
        return this.repository.getActiveShift(employeeId);
    }
}