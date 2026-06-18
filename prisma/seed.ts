import 'dotenv/config';
import prisma from '../src/common/utils/prisma';
import { companyFactory } from '../tests/factories/company.factory';
import { departmentFactory } from '../tests/factories/department.factory';
import { employeeFactory } from '../tests/factories/employee.factory';
import { SystemRole } from '../src/common/enums/role.enum';
import { SystemPermission, DEFAULT_ROLE_PERMISSIONS } from '../src/common/enums/permission.enum';
import * as bcrypt from 'bcrypt';

async function main() {
    console.log('Seeding system permissions and roles...');

    const permissions = Object.values(SystemPermission);
    for (const code of permissions) {
        await prisma.permission.upsert({
            where: { code },
            update: {},
            create: { code, description: `Access to ${code}` }
        });
    }
    console.log(`Seeded ${permissions.length} permissions.`);

    // Let's write the seed logic correctly without pseudo-code:
    console.log('Upserting System Roles...');
    for (const roleName of Object.values(SystemRole)) {
        let role = await prisma.role.findFirst({
            where: { companyId: null, name: roleName }
        });

        if (!role) {
            role = await prisma.role.create({
                data: {
                    name: roleName,
                    companyId: null,
                    description: `System role for ${roleName}`,
                    isSystemRole: true
                }
            });
        }

        // Map default permissions to this role
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
        for (const permCode of defaultPerms) {
            const dbPerm = await prisma.permission.findUnique({
                where: { code: permCode }
            });
            if (dbPerm) {
                // Upsert role permission mapping
                const existingMapping = await prisma.rolePermission.findUnique({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: dbPerm.id
                        }
                    }
                });
                if (!existingMapping) {
                    await prisma.rolePermission.create({
                        data: {
                            roleId: role.id,
                            permissionId: dbPerm.id
                        }
                    });
                }
            }
        }
    }
    console.log('Predefined system roles and permissions successfully seeded.');

    // 3. Create Company and Admin Role (resolves global or creates under company)
    const { company, adminRole } = await companyFactory.createWithBasics({
        name: 'Acme Corp',
        industryType: 'Technology'
    });
    console.log(`Created Company: ${company.name}`);

    // 4. Create HQ Branch (WorkLocation)
    const hq = await prisma.workLocation.create({
        data: {
            companyId: company.id,
            name: 'Headquarters (New York)',
            address: '123 Tech Blvd, NY'
        }
    });
    console.log(`Created Branch: ${hq.name}`);

    // 5. Create a Department
    const dept = await departmentFactory.create({
        companyId: company.id,
        name: 'Engineering'
    });
    console.log(`Created Department: ${dept.name}`);

    // 6. Create a Super Admin User
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.create({
        data: {
            companyId: company.id,
            email: 'admin@acme.com',
            passwordHash: passwordHash,
            roleId: adminRole.id,
        }
    });

    // Create the actual employee record for the admin
    await prisma.employee.create({
        data: {
            companyId: company.id,
            userId: adminUser.id,
            employeeCode: 'ADMIN001',
            departmentId: dept.id,
            workLocationId: hq.id,
            dateOfJoining: new Date(),
            employmentStatus: 'active',
            onboardingStep: 6,
            profileCompletion: 100
        }
    });
    console.log(`Created Super Admin: admin@acme.com / Admin@123`);

    // 7. Create some dummy employees using factories
    console.log('Creating dummy employees...');
    for (let i = 0; i < 5; i++) {
        await employeeFactory.createFull(company.id, dept.id, hq.id, adminRole.id);
    }

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
