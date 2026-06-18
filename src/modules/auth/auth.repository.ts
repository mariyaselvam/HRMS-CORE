import prisma from '../../common/utils/prisma';
import { RegisterCompanyInput } from './auth.validator';
import { SystemRole } from '../../common/enums/role.enum';

export class AuthRepository {
    async findByEmail(email: string) {
        return prisma.user.findFirst({
            where: { email },
            include: { role: true }
        });
    }

    async createCompanyWithAdmin(data: RegisterCompanyInput, hashedPassword: string) {
        return prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name: data.companyName,
                    industryType: data.industryType,
                    employeeLimit: data.employeeLimit,
                }
            });

            let adminRole = await tx.role.findFirst({
                where: { companyId: null, name: SystemRole.COMPANY_ADMIN }
            });

            if (!adminRole) {
                adminRole = await tx.role.create({
                    data: {
                        name: SystemRole.COMPANY_ADMIN,
                        companyId: company.id,
                        description: 'Company Administrator with full access',
                        isSystemRole: true
                    }
                });
            }

            const user = await tx.user.create({
                data: {
                    email: data.adminEmail,
                    passwordHash: hashedPassword,
                    companyId: company.id,
                    roleId: adminRole.id,
                }
            });

            return { company, user };
        });
    }
}
