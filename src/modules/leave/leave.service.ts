import { LeaveRepository } from './leave.repository';
import { CreateLeaveTypeInput, CreateLeaveRequestInput, HandleLeaveActionInput } from './leave.validator';
import { AppError, NotFoundError } from '../../common/errors/AppError';
import prisma from '../../common/utils/prisma';

export class LeaveService {
    private repository: LeaveRepository;

    constructor() {
        this.repository = new LeaveRepository();
    }

    // Admin: Create Leave Type
    async addLeaveType(companyId: string, data: CreateLeaveTypeInput) {
        return this.repository.createLeaveType(companyId, data);
    }

    async getLeaveTypes(companyId: string) {
        return this.repository.listLeaveTypes(companyId);
    }

    // Employee: Submit Leave Request
    async submitLeaveRequest(userId: string, data: CreateLeaveRequestInput) {
        // 1. Get employee profile
        const employee = await prisma.employee.findUnique({
            where: { userId }
        });
        if (!employee) throw new NotFoundError('Employee profile not found');

        // 2. Calculate days
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays <= 0) throw new AppError('End date must be after start date', 400);

        // 3. Check Balance
        let balance = await this.repository.getLeaveBalance(employee.id, data.leaveTypeId);

        // Auto-init balance if not exists (using leave type max days)
        if (!balance) {
            const leaveType = await prisma.leaveType.findUnique({ where: { id: data.leaveTypeId } });
            if (!leaveType) throw new NotFoundError('Leave type not found');

            balance = await this.repository.initLeaveBalance(employee.id, data.leaveTypeId, leaveType.maxDays);
        }

        if (Number(balance.balance) < diffDays) {
            throw new AppError(`Insufficient leave balance. Remaining: ${balance.balance}, Requested: ${diffDays}`, 400);
        }

        // 4. Create Request
        return this.repository.createLeaveRequest(employee.id, data, diffDays);
    }

    // List requests
    async getRequests(companyId: string, userId?: string, locationId?: string) {
        let employeeId = undefined;
        if (userId) {
            const employee = await prisma.employee.findUnique({ where: { userId } });
            employeeId = employee?.id;
        }
        return this.repository.listRequests(companyId, employeeId, locationId);
    }

    // Admin/Manager: Approve/Reject
    async handleRequestAction(requestId: string, adminUserId: string, data: HandleLeaveActionInput) {
        const request = await this.repository.findRequestById(requestId);
        if (!request) throw new NotFoundError('Leave request not found');

        if (request.status !== 'pending') {
            throw new AppError(`Request already ${request.status}`, 400);
        }

        if (data.action === 'approve') {
            // Deduct balance on approval
            await this.repository.deductBalance(request.employeeId, request.leaveTypeId, Number(request.totalDays));
            return this.repository.updateRequestStatus(requestId, 'approved', adminUserId);
        } else {
            return this.repository.updateRequestStatus(requestId, 'rejected', adminUserId);
        }
    }
}
