import prisma from '../../common/utils/prisma';
import { RegisterCompanyInput } from './auth.validator';

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

            const adminRole = await tx.role.create({
                data: {
                    name: 'Admin',
                    companyId: company.id,
                    description: 'Company Administrator with full access'
                }
            });

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
