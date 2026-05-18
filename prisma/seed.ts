import 'dotenv/config';
import prisma from '../src/common/utils/prisma';
import { companyFactory } from '../tests/factories/company.factory';
import { departmentFactory } from '../tests/factories/department.factory';
import { employeeFactory } from '../tests/factories/employee.factory';
import * as bcrypt from 'bcrypt';

async function main() {
    console.log('Seeding database using factories...');

    // 1. Create Company and Admin Role
    const { company, adminRole } = await companyFactory.createWithBasics({
        name: 'Acme Corp',
        industryType: 'Technology'
    });
    console.log(`Created Company: ${company.name}`);

    // 2. Create HQ Branch (WorkLocation)
    const hq = await prisma.workLocation.create({
        data: {
            companyId: company.id,
            name: 'Headquarters (New York)',
            address: '123 Tech Blvd, NY'
        }
    });
    console.log(`Created Branch: ${hq.name}`);

    // 3. Create a Department
    const dept = await departmentFactory.create({
        companyId: company.id,
        name: 'Engineering'
    });
    console.log(`Created Department: ${dept.name}`);

    // 4. Create a Super Admin User
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

    // 5. Create some dummy employees using factories
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
