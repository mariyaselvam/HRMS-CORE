import prisma from '../../common/utils/prisma';
import { OnboardEmployeeInput, UpdateEmployeeInput } from './employee.validator';

export class EmployeeRepository {
    async findByEmail(email: string) {
        return prisma.user.findFirst({
            where: { email },
        });
    }

    async findByEmployeeCode(companyId: string, employeeCode: string) {
        return prisma.employee.findFirst({
            where: {
                companyId,
                employeeCode
            }
        });
    }

    async createEmployee(companyId: string, data: OnboardEmployeeInput, hashedPassword: string) {
        return prisma.$transaction(async (tx) => {
            let employeeRole = await tx.role.findFirst({
                where: { companyId, name: 'Employee' }
            });

            if (!employeeRole) {
                employeeRole = await tx.role.create({
                    data: {
                        name: 'Employee',
                        companyId,
                        description: 'Standard employee access'
                    }
                });
            }

            const user = await tx.user.create({
                data: {
                    email: data.email,
                    passwordHash: hashedPassword,
                    companyId,
                    roleId: employeeRole.id
                }
            });

            const employee = await tx.employee.create({
                data: {
                    employeeCode: data.employeeCode,
                    userId: user.id,
                    companyId,
                    departmentId: data.departmentId,
                    teamId: data.teamId,
                    managerId: data.managerId,
                    dateOfJoining: new Date(data.dateOfJoining),
                    employmentStatus: data.status || 'probation',
                },
                include: {
                    user: {
                        select: {
                            email: true
                        }
                    },
                    department: true,
                    team: true
                }
            });

            return employee;
        });
    }

    async listEmployees(companyId: string) {
        return prisma.employee.findMany({
            where: { companyId },
            include: {
                user: { select: { email: true } },
                department: { select: { name: true } },
                team: { select: { name: true } },
                manager: { select: { employeeCode: true } }
            }
        });
    }

    async getEmployeeById(id: string, companyId: string) {
        return prisma.employee.findFirst({
            where: { id, companyId },
            include: {
                user: { select: { email: true } },
                department: true,
                team: true
            }
        });
    }

    async updateEmployee(id: string, companyId: string, data: UpdateEmployeeInput) {
        return prisma.employee.update({
            where: { id, companyId },
            data: {
                departmentId: data.departmentId,
                teamId: data.teamId,
                managerId: data.managerId,
                employmentStatus: data.status
            }
        });
    }
}
