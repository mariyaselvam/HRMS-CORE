import * as dotenv from 'dotenv';
dotenv.config();

import { companyFactory } from '../factories/company.factory';
import { departmentFactory } from '../factories/department.factory';
import { employeeFactory } from '../factories/employee.factory';
import { attendanceSimulator } from '../services/attendance-simulator';
import { leaveSimulator } from '../services/leave-simulator';
import { payrollSimulator } from '../services/payroll-simulator';
import prisma from '../../src/common/utils/prisma';

async function runPerformanceSimulation() {
    const NUM_DEPARTMENTS = 3;
    const EMP_PER_DEPT = 10;
    const TOTAL_EMPLOYEES = NUM_DEPARTMENTS * EMP_PER_DEPT;

    console.log(`📈 Starting Performance Simulation for ${TOTAL_EMPLOYEES} employees...`);
    const startTime = Date.now();

    // 1. Create Company`
    const { company, adminRole } = await companyFactory.createWithBasics({ name: 'Mega Corp' });
    console.log(`✅ Company Created: ${company.id}`);

    // 2. Create Departments, WorkLocation, Shift
    const workLocation = await prisma.workLocation.create({
        data: {
            companyId: company.id,
            name: 'Headquarters',
            address: '123 Fake Street, Tech City',
        }
    });

    const shift = await prisma.shift.create({
        data: {
            companyId: company.id,
            name: 'General Shift',
            code: 'GEN',
            startTime: new Date('2024-01-01T09:00:00.000Z'),
            endTime: new Date('2024-01-01T18:00:00.000Z'),
        }
    });

    console.log(`✅ Work Location & Shift Created`);

    const depts = [];
    for (let i = 0; i < NUM_DEPARTMENTS; i++) {
        const dept = await departmentFactory.create({ companyId: company.id, name: `Department ${i + 1}` });

        // Create 2 Teams per department
        const team1 = await prisma.team.create({ data: { companyId: company.id, departmentId: dept.id, name: `Alpha Team ${i + 1}` } });
        const team2 = await prisma.team.create({ data: { companyId: company.id, departmentId: dept.id, name: `Beta Team ${i + 1}` } });

        depts.push({ ...dept, teams: [team1, team2] });
    }
    console.log(`✅ ${NUM_DEPARTMENTS} Departments and Teams Created`);

    // 3. Hire Employees in Bulk
    console.log(`⏳ Hiring ${TOTAL_EMPLOYEES} employees (this may take a minute)...`);
    const empStartTime = Date.now();
    const employeeIds: string[] = [];

    for (const dept of depts) {
        const hires = [];
        let managerId: string | undefined = undefined;

        for (let i = 0; i < EMP_PER_DEPT; i++) {
            const team = i % 2 === 0 ? dept.teams[0] : dept.teams[1];

            hires.push(employeeFactory.createFull(company.id, dept.id, adminRole.id, managerId!, {
                workLocationId: workLocation.id,
                teamId: team.id,
                shiftId: shift.id,
            }));
        }

        const results = await Promise.all(hires);

        // After they are created, let's assign the first employee as the manager for the rest of the department
        managerId = results[0].employee.id;
        await prisma.employee.updateMany({
            where: { id: { in: results.slice(1).map(r => r.employee.id) } },
            data: { managerId }
        });

        results.forEach(r => employeeIds.push(r.employee.id));
        console.log(`   - Hired 100 employees for ${dept.name}`);
    }
    console.log(`✅ Employee creation took: ${(Date.now() - empStartTime) / 1000}s`);

    // 4. Heavy Attendance Simulation (Approx 30,000 records)
    console.log(`⏳ Simulating 1 month of attendance (~${TOTAL_EMPLOYEES * 22} records)...`);
    const attStartTime = Date.now();
    const logs = await attendanceSimulator.simulateMonth(employeeIds, 2024, 1);
    console.log(`✅ Attendance simulation took: ${(Date.now() - attStartTime) / 1000}s [${logs.length} records]`);

    // 5. Leave Simulation
    console.log(`⏳ Simulating leaves...`);
    await leaveSimulator.setupLeaveBasics(company.id, employeeIds);
    const requests = await leaveSimulator.simulateRequests(employeeIds, 200);
    console.log(`✅ ${requests.length} Leave requests generated`);

    // 6. Full Payroll Calculation
    console.log(`⏳ Running payroll calculation...`);
    const payStartTime = Date.now();
    const { records } = await payrollSimulator.runMonthlyPayroll(company.id, 2024, 1);
    console.log(`✅ Payroll calculation took: ${(Date.now() - payStartTime) / 1000}s [${records.length} records]`);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n🏁 PERFORMANCE SUMMARY`);
    console.log(`------------------------------`);
    console.log(`Total Employees:  ${TOTAL_EMPLOYEES}`);
    console.log(`Data Points:      ~${logs.length + records.length + requests.length}`);
    console.log(`Total Run Time:   ${totalTime}s`);
    console.log(`Avg Time per Emp: ${totalTime / TOTAL_EMPLOYEES}s`);
    console.log(`------------------------------`);
}

runPerformanceSimulation()
    .catch(err => {
        console.error('❌ Performance Simulation Failed:', err);
        process.exit(1);
    });
