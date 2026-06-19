import 'dotenv/config';
import { faker } from '@faker-js/faker';
import prisma from '../../src/common/utils/prisma';
import { companyFactory } from '../factories/company.factory';
import { departmentFactory } from '../factories/department.factory';
import { employeeFactory } from '../factories/employee.factory';
import { attendanceSimulator } from '../services/attendance-simulator';
import { rolePermissionSeeder } from '../services/role-permission-seeder';
import { shiftSimulator } from '../services/shift-simulator';
import { overtimeSimulator } from '../services/overtime-simulator';
import { SystemRole } from '../../src/common/enums/role.enum';

async function runFullSimulation() {
    console.log('🚀 Starting Full HRMS Workflow Simulation...');
    console.log('==================================================');

    // ═══════════════════════════════════════════════════════════════
    // PHASE 0: Seed Global Roles & Permissions
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 0: Seeding Roles & Permissions');
    await rolePermissionSeeder.runFullSeed();

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: Setup Company
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 1: Company Setup');
    const { company, adminRole } = await companyFactory.createWithBasics({ name: 'Simulated Corp' });
    console.log(`✅ Company Created: ${company.name} (${company.id})`);

    // 1b. Find all system roles for employee assignment
    const roles = await prisma.role.findMany({
        where: { companyId: null } // Global system roles
    });
    const roleMap = new Map(roles.map(r => [r.name, r.id]));

    // 1c. Create a fixed Admin User for testing
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

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: Setup Branches (WorkLocations)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 2: Branch Setup');
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

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: Setup Departments and Teams
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 3: Departments & Teams');
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

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: Setup Shifts & Assign to Employees (BEFORE hiring)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 4: Shift Setup');
    const shifts = await shiftSimulator.setupShifts(company.id, []);
    const shiftMap = new Map(shifts.map(s => [s.name, s.id]));
    console.log(`✅ ${shifts.length} Shifts Created: ${shifts.map(s => s.name).join(', ')}`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5: Setup Holidays
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 5: Holidays');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // Current month

    const holidayList = [
        { name: 'New Year', date: new Date(`${year}-01-01`), workLocationId: null },
        { name: 'Branch Day', date: new Date(`${year}-06-15`), workLocationId: branches[0].id },
        { name: 'Local Holiday', date: new Date(`${year}-10-20`), workLocationId: branches[1].id }
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

    // ═══════════════════════════════════════════════════════════════
    // PHASE 6: Hire Employees with Different Roles + Shift Assignments
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 6: Hiring Employees');
    const employees = [];
    const employeeIds = [];

    // Role distribution for 20 employees:
    // 1 HR Manager, 1 Payroll Manager, 1 Onboarding Manager, 1 Branch Manager, 16 Employees
    const roleDistribution = [
        { role: SystemRole.HR_MANAGER, count: 1 },
        { role: SystemRole.PAYROLL_MANAGER, count: 1 },
        { role: SystemRole.ONBOARDING_MANAGER, count: 1 },
        { role: SystemRole.BRANCH_MANAGER, count: 1 },
        { role: SystemRole.EMPLOYEE, count: 16 },
    ];

    let empIndex = 0;
    for (const { role, count } of roleDistribution) {
        const roleId = roleMap.get(role);
        if (!roleId) {
            console.warn(`⚠️ Role "${role}" not found, skipping`);
            continue;
        }

        for (let i = 0; i < count; i++) {
            const branch = branches[empIndex % branches.length];
            const dept = depts[empIndex % depts.length];
            const team = teams.filter(t => t.departmentId === dept.id)[empIndex % 2 === 0 ? 0 : 1] || teams.find(t => t.departmentId === dept.id);

            // Assign shifts: 70% General, 20% Morning, 10% Night
            let shiftId = shiftMap.get('General Shift');
            if (empIndex > count * 0.7) shiftId = shiftMap.get('Morning Shift');
            if (empIndex > count * 0.9) shiftId = shiftMap.get('Night Shift');

            const { user, employee } = await employeeFactory.createFull(company.id, dept.id, branch.id, roleId, {
                teamId: team?.id,
                shiftId
            });

            employees.push(employee);
            employeeIds.push(employee.id);
            empIndex++;
        }
    }
    console.log(`✅ ${employees.length} Employees Hired across branches with distributed roles`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 7: Simulate Attendance for Current Month
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 7: Attendance Simulation');
    const logs = await attendanceSimulator.simulateMonth(employeeIds, year, month);
    console.log(`✅ Generated ${logs.length} Attendance Logs`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 8: Simulate Leave Requests
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 8: Leave Simulation');
    const { leaveSimulator } = await import('../services/leave-simulator');
    await leaveSimulator.setupLeaveBasics(company.id, employeeIds);
    const leaves = await leaveSimulator.simulateRequests(employeeIds, 10);
    console.log(`✅ Generated ${leaves.length} Leave Requests`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 9: Simulate Overtime
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 9: Overtime Simulation');
    const overtimeRecords = await overtimeSimulator.simulateOvertime(employeeIds, year, month);
    console.log(`✅ Generated ${overtimeRecords.length} Overtime Records`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 10: Run Payroll for ALL Branches with PayrollRun Audit
    // ═══════════════════════════════════════════════════════════════
    console.log('\n📌 PHASE 10: Payroll Processing (All Branches)');
    const { payrollSimulator } = await import('../services/payroll-simulator');
    
    // Find admin user ID for audit trail
    const adminUser = await prisma.user.findFirst({
        where: { email: 'admin@simulated.com', companyId: company.id }
    });

    const payrollResult = await payrollSimulator.runFullPayroll(
        company.id, 
        year, 
        month, 
        adminUser?.id
    );
    console.log(`✅ PayrollRun Created: ${payrollResult.run.status}`);
    for (const cycle of payrollResult.cycles) {
        console.log(`   - ${cycle.branch}: ${cycle.records.length} records`);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPLETE
    // ═══════════════════════════════════════════════════════════════
    console.log('\n==================================================');
    console.log('🏁 Full HRMS Simulation Complete!');
    console.log('==================================================');
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`   - 1 Company: ${company.name}`);
    console.log(`   - ${branches.length} Branches`);
    console.log(`   - ${depts.length} Departments, ${teams.length} Teams`);
    console.log(`   - ${shifts.length} Shifts`);
    console.log(`   - ${employees.length} Employees (7 different roles)`);
    console.log(`   - ${logs.length} Attendance Logs`);
    console.log(`   - ${leaves.length} Leave Requests`);
    console.log(`   - ${overtimeRecords.length} Overtime Records`);
    console.log(`   - ${payrollResult.cycles.length} Payroll Cycles across all branches`);
    console.log(`   - Payroll Total: ₹${Number(payrollResult.run.totalAmount).toFixed(2)}`);
    console.log('\n🔑 Login: admin@simulated.com / Password123!');
}

runFullSimulation()
    .catch(err => {
        console.error('❌ Simulation Failed:', err);
        process.exit(1);
    });