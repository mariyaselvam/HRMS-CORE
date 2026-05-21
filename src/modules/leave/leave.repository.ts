import prisma from '../../common/utils/prisma';
import { CreateLeaveTypeInput, CreateLeaveRequestInput, HandleLeaveActionInput } from './leave.validator';

export class LeaveRepository {
    // --- Leave Types ---
    async createLeaveType(companyId: string, data: CreateLeaveTypeInput) {
        return prisma.leaveType.create({
            data: {
                ...data,
                companyId
            }
        });
    }

    async listLeaveTypes(companyId: string) {
        return prisma.leaveType.findMany({
            where: { companyId }
        });
    }

    // --- Leave Balances ---
    async getLeaveBalance(employeeId: string, leaveTypeId: string) {
        const currentYear = new Date().getFullYear();
        return prisma.leaveBalance.findUnique({
            where: {
                employeeId_leaveTypeId_year: {
                    employeeId,
                    leaveTypeId,
                    year: currentYear
                }
            }
        });
    }

    async initLeaveBalance(employeeId: string, leaveTypeId: string, entitledDays: number) {
        const currentYear = new Date().getFullYear();
        return prisma.leaveBalance.create({
            data: {
                employeeId,
                leaveTypeId,
                year: currentYear,
                entitledDays,
                balance: entitledDays
            }
        });
    }

    // --- Leave Requests ---
    async createLeaveRequest(employeeId: string, data: CreateLeaveRequestInput, totalDays: number) {
        return prisma.leaveRequest.create({
            data: {
                employeeId,
                leaveTypeId: data.leaveTypeId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                totalDays,
                reason: data.reason,
                status: 'pending'
            },
            include: {
                leaveType: true,
                employee: {
                    include: { user: { select: { email: true } } }
                }
            }
        });
    }

    async listRequests(companyId: string, employeeId?: string, locationId?: string) {
        const where: any = {
            employee: {
                companyId
            }
        };

        if (employeeId) {
            where.employee.id = employeeId;
        }

        if (locationId) {
            where.employee.workLocationId = locationId;
        }

        return prisma.leaveRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        user: { select: { email: true } },
                        personalDetails: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                leaveType: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findRequestById(id: string) {
        return prisma.leaveRequest.findUnique({
            where: { id },
            include: { leaveType: true }
        });
    }

    async updateRequestStatus(id: string, status: string, approvedBy: string) {
        return prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                approvedBy,
                approvedAt: new Date()
            },
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        user: { select: { email: true } },
                        personalDetails: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                leaveType: { select: { name: true } }
            }
        });
    }

    async deductBalance(employeeId: string, leaveTypeId: string, days: number) {
        const currentYear = new Date().getFullYear();
        return prisma.leaveBalance.update({
            where: {
                employeeId_leaveTypeId_year: {
                    employeeId,
                    leaveTypeId,
                    year: currentYear
                }
            },
            data: {
                balance: { decrement: days }
            }
        });
    }
}
