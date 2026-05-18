import 'dotenv/config';
import { faker } from '@faker-js/faker';
import prisma from '../../src/common/utils/prisma';
import { companyFactory } from '../factories/company.factory';
import { departmentFactory } from '../factories/department.factory';
import { employeeFactory } from '../factories/employee.factory';
import { attendanceSimulator } from '../services/attendance-simulator';

async function runFullSimulation() {
    console.log('🚀 Starting Full HRMS Workflow Simulation...');

    // 1. Setup Company
    const { company, adminRole } = await companyFactory.createWithBasics({ name: 'Simulated Corp' });
    console.log(`✅ Company Created: ${company.name} (${company.id})`);

    // 1b. Create a fixed Admin User for testing (Fresh Start)
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    // Delete if exists to ensure the password is what we expect
    await prisma.user.deleteMany({ where: { email: 'admin@simulated.com' } });
    
    await prisma.user.create({
        data: {
            companyId: company.id,
            email: 'admin@simulated.com',
            passwordHash,
            roleId: adminRole.id,
            isActive: true
        }
    });
    console.log('--------------------------------------------------');
    console.log('✅ TEST CREDENTIALS CREATED:');
    console.log('   Email: admin@simulated.com');
    console.log('   Password: Password123!');
    console.log('--------------------------------------------------');

    // 2. Setup Branches (WorkLocations)
    const branchNames = ['Headquarters (Main)', 'Remote Hub'];
    const branches = [];
    for (const name of branchNames) {
        const branch = await prisma.workLocation.create({
            data: {
                companyId: company.id,
                name,
                address: faker.location.streetAddress()
            }
        });
        branches.push(branch);
    }
    console.log(`✅ ${branches.length} Branches Created`);

    // 3. Setup Departments and Teams
    const deptData = [
        { name: 'Engineering', teams: ['Frontend', 'Backend', 'DevOps'] },
        { name: 'Sales', teams: ['Direct Sales', 'Inside Sales'] },
        { name: 'HR', teams: ['Recruitment', 'Operations'] }
    ];

    const depts = [];
    const teams = [];

    for (const data of deptData) {
        const dept = await departmentFactory.create({ companyId: company.id, name: data.name });
        depts.push(dept);

        for (const teamName of data.teams) {
            const team = await prisma.team.create({
                data: {
                    companyId: company.id,
                    departmentId: dept.id,
                    name: teamName
                }
            });
            teams.push(team);
        }
    }
    console.log(`✅ ${depts.length} Departments and ${teams.length} Teams Created`);

    // 4. Setup Holidays
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // Previous month

    const holidayList = [
        { name: 'New Year', date: new Date(`${year}-01-01`), workLocationId: null }, // Company wide
        { name: 'Branch Day', date: new Date(`${year}-06-15`), workLocationId: branches[0].id }, // Branch 1 only
        { name: 'Local Holiday', date: new Date(`${year}-10-20`), workLocationId: branches[1].id } // Branch 2 only
    ];

    for (const h of holidayList) {
        await prisma.holiday.create({
            data: {
                companyId: company.id,
                name: h.name,
                date: h.date,
                workLocationId: h.workLocationId
            }
        });
    }
    console.log(`✅ ${holidayList.length} Holidays Created`);

    // 5. Hire Employees (Distribute across branches and teams)
    const employees = [];
    for (let i = 0; i < 20; i++) {
        const branch = branches[i % branches.length];
        const dept = depts[i % depts.length];
        const team = teams.filter(t => t.departmentId === dept.id)[i % 2 === 0 ? 0 : 1] || teams.find(t => t.departmentId === dept.id);

        const { employee } = await employeeFactory.createFull(company.id, dept.id, branch.id, adminRole.id, {
            teamId: team?.id
        });
        employees.push(employee);
    }
    console.log(`✅ ${employees.length} Employees Hired across branches`);

    // 6. Simulate Attendance for Last Month
    console.log(`⏳ Simulating attendance for ${year}-${month + 1}...`);
    const logs = await attendanceSimulator.simulateMonth(employees.map(e => e.id), year, month + 1);
    console.log(`✅ Generated ${logs.length} Attendance Logs`);

    // 7. Simulate Leave Requests
    const { leaveSimulator } = await import('../services/leave-simulator');
    console.log('⏳ Simulating leave requests...');
    await leaveSimulator.setupLeaveBasics(company.id, employees.map(e => e.id));
    const leaves = await leaveSimulator.simulateRequests(employees.map(e => e.id), 10);
    console.log(`✅ Generated ${leaves.length} Leave Requests`);

    // 8. Run Payroll (for the first branch)
    const { payrollSimulator } = await import('../services/payroll-simulator');
    console.log(`⏳ Processing monthly payroll for ${branches[0].name}...`);
    const { records } = await payrollSimulator.runMonthlyPayroll(company.id, branches[0].id, year, month + 1);
    console.log(`✅ Generated ${records.length} Payroll Records for ${branches[0].name}`);

    console.log('🏁 Simulation Complete!');
}

runFullSimulation()
    .catch(err => {
        console.error('❌ Simulation Failed:', err);
        process.exit(1);
    });
