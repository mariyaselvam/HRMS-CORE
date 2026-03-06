import 'dotenv/config';
import { companyFactory } from '../factories/company.factory';
import { departmentFactory } from '../factories/department.factory';
import { employeeFactory } from '../factories/employee.factory';
import { attendanceSimulator } from '../services/attendance-simulator';

async function runFullSimulation() {
    console.log('🚀 Starting Full HRMS Workflow Simulation...');

    // 1. Setup Company
    const { company, adminRole } = await companyFactory.createWithBasics({ name: 'Simulated Corp' });
    console.log(`✅ Company Created: ${company.name} (${company.id})`);

    // 2. Setup Departments
    const deptNames = ['Engineering', 'HR', 'Sales', 'Marketing'];
    const depts = [];
    for (const name of deptNames) {
        const dept = await departmentFactory.create({ companyId: company.id, name });
        depts.push(dept);
    }
    console.log(`✅ ${depts.length} Departments Created`);

    // 3. Hire Employees
    const employees = [];
    for (const dept of depts) {
        // 5 employees per department
        for (let i = 0; i < 5; i++) {
            const { employee } = await employeeFactory.createFull(company.id, dept.id, adminRole.id);
            employees.push(employee);
        }
    }
    console.log(`✅ ${employees.length} Employees Hired`);

    // 4. Simulate Attendance for Last Month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // Previous month (0-indexed)

    console.log(`⏳ Simulating attendance for ${year}-${month + 1}...`);
    const logs = await attendanceSimulator.simulateMonth(employees.map(e => e.id), year, month + 1);
    console.log(`✅ Generated ${logs.length} Attendance Logs`);

    // 5. Simulate Leave Requests
    const { leaveSimulator } = await import('../services/leave-simulator');
    console.log('⏳ Simulating leave requests...');
    await leaveSimulator.setupLeaveBasics(company.id, employees.map(e => e.id));
    const leaves = await leaveSimulator.simulateRequests(employees.map(e => e.id), 10);
    console.log(`✅ Generated ${leaves.length} Leave Requests`);

    // 6. Run Payroll
    const { payrollSimulator } = await import('../services/payroll-simulator');
    console.log('⏳ Processing monthly payroll...');
    const { records } = await payrollSimulator.runMonthlyPayroll(company.id, year, month + 1);
    console.log(`✅ Generated ${records.length} Payroll Records`);

    console.log('🏁 Simulation Complete!');
}

runFullSimulation()
    .catch(err => {
        console.error('❌ Simulation Failed:', err);
        process.exit(1);
    });
