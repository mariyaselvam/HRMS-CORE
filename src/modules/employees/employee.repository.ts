import prisma from '../../common/utils/prisma';
import {
    OnboardEmployeeInput,
    UpdateEmployeeInput,
    OnboardStep2Input,
    OnboardStep3Input,
    OnboardStep4Input
} from './employee.validator';

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
            let role = await tx.role.findFirst({
                where: { companyId, name: data.role || 'Employee' }
            });

            if (!role) {
                role = await tx.role.create({
                    data: {
                        name: data.role || 'Employee',
                        companyId,
                        description: `${data.role || 'Standard employee'} access`
                    }
                });
            }

            const user = await tx.user.create({
                data: {
                    email: data.email,
                    passwordHash: hashedPassword,
                    companyId,
                    roleId: role.id
                }
            });

            const employee = await tx.employee.create({
                data: {
                    employeeCode: data.employeeCode,
                    userId: user.id,
                    companyId,
                    departmentId: data.departmentId,
                    managerId: data.managerId,
                    dateOfJoining: new Date(data.dateOfJoining),
                    employmentStatus: data.status || 'probation',
                    onboardingStep: 2, // Account created, next is step 2
                },
                include: {
                    user: {
                        select: {
                            email: true
                        }
                    },
                    department: true
                }
            });

            return employee;
        });
    }

    async upsertPersonalDetails(employeeId: string, data: OnboardStep2Input) {
        const payload = {
            firstName: data.firstName,
            lastName: data.lastName,
            mobile: data.mobile,
            gender: data.gender,
            dob: data.dob ? new Date(data.dob) : null,
            maritalStatus: data.maritalStatus,
            currentAddress: data.currentAddress,
            permAddress: data.permAddress,
        };

        return prisma.$transaction(async (tx) => {
            const details = await tx.employeePersonalDetail.upsert({
                where: { employeeId },
                update: payload,
                create: { ...payload, employeeId }
            });

            await tx.employee.update({
                where: { id: employeeId },
                data: {
                    onboardingStep: { set: 3 },
                    profileCompletion: { increment: 20 }
                }
            });

            return details;
        });
    }

    async upsertJobDetails(employeeId: string, data: OnboardStep3Input) {
        const payload = {
            designation: data.designation,
            employmentType: data.employmentType,
            workLocationType: data.workLocationType,
            probationPeriod: data.probationPeriod,
            noticePeriod: data.noticePeriod,
        };

        return prisma.$transaction(async (tx) => {
            const details = await tx.employeeJobDetail.upsert({
                where: { employeeId },
                update: payload,
                create: { ...payload, employeeId }
            });

            await tx.employee.update({
                where: { id: employeeId },
                data: {
                    onboardingStep: { set: 4 },
                    profileCompletion: { increment: 20 }
                }
            });

            return details;
        });
    }

    async upsertStatutoryDetails(employeeId: string, data: OnboardStep4Input) {
        return prisma.$transaction(async (tx) => {
            // 1. Update Bank Details
            await tx.employeeBankDetail.upsert({
                where: { employeeId },
                update: {
                    accountNumber: data.accountNumber,
                    ifscCode: data.ifscCode,
                    bankName: data.bankName,
                    branchName: data.branchName,
                },
                create: {
                    employeeId,
                    accountNumber: data.accountNumber,
                    ifscCode: data.ifscCode,
                    bankName: data.bankName,
                    branchName: data.branchName,
                }
            });

            // 2. Update Statutory Details
            const statutory = await tx.employeeStatutoryDetail.upsert({
                where: { employeeId },
                update: {
                    pan: data.pan,
                    uan: data.uan,
                    pfApplicable: data.pfApplicable,
                    esiApplicable: data.esiApplicable,
                    esiNumber: data.esiNumber,
                    ptState: data.ptState,
                    taxRegime: data.taxRegime,
                },
                create: {
                    employeeId,
                    pan: data.pan,
                    uan: data.uan,
                    pfApplicable: data.pfApplicable,
                    esiApplicable: data.esiApplicable,
                    esiNumber: data.esiNumber,
                    ptState: data.ptState,
                    taxRegime: data.taxRegime,
                }
            });

            await tx.employee.update({
                where: { id: employeeId },
                data: {
                    onboardingStep: { set: 5 }, // Documents is next
                    profileCompletion: { increment: 30 }
                }
            });

            return statutory;
        });
    }

    async listEmployees(companyId: string) {
        return prisma.employee.findMany({
            where: { companyId },
            include: {
                user: { select: { email: true } },
                department: { select: { name: true } },
                manager: { select: { employeeCode: true } },
                personalDetails: true,
                jobDetails: true,
                bankDetails: true,
                statutoryDetails: true
            }
        });
    }

    async getEmployeeById(id: string, companyId: string) {
        return prisma.employee.findFirst({
            where: { id, companyId },
            include: {
                user: { select: { email: true, role: true } },
                department: true,
                personalDetails: true,
                jobDetails: true,
                bankDetails: true,
                statutoryDetails: true
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

