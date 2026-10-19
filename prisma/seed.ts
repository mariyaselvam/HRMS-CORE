import "dotenv/config";
import prisma from "../src/common/utils/prisma";
import {
  roleFactory,
  companyFactory,
  workLocationFactory,
  departmentFactory,
  teamFactory,
  userFactory,
  employeeFactory,
  shiftFactory,
  salaryComponentFactory,
  salaryTemplateFactory,
  salaryStructureFactory,
  holidayFactory,
  leaveTypeFactory,
  leaveBalanceFactory,
  leaveRequestFactory,
  attendanceFactory,
} from "../tests/factories";
import { faker } from "@faker-js/faker";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns past N weekdays (Mon–Fri) from today, most recent first */
function getPastWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() - 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
  }
  return days;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Cleaning up existing database records...");

  // 1. Level 4 dependencies (Leaf nodes of foreign keys)
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.payrollRecord.deleteMany({});
  await prisma.salaryRevision.deleteMany({});

  // 2. Level 3 dependencies
  await prisma.compensationCycle.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.payrollCycle.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.approvalLog.deleteMany({});
  await prisma.approvalStep.deleteMany({});
  await prisma.workflow.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.payrollRule.deleteMany({});

  // 3. Level 2 dependencies (direct relations to Employee / Leave / Attendance)
  await prisma.attendanceRequest.deleteMany({});
  await prisma.overtimeRecord.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.leaveType.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.employeeShift.deleteMany({});
  await prisma.shift.deleteMany({});

  await prisma.salaryStructureItem.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.salaryTemplateItem.deleteMany({});
  await prisma.salaryTemplate.deleteMany({});
  await prisma.salaryComponent.deleteMany({});

  await prisma.employeeDocument.deleteMany({});
  await prisma.employeeStatutoryDetail.deleteMany({});
  await prisma.employeeBankDetail.deleteMany({});
  await prisma.employeeJobDetail.deleteMany({});
  await prisma.employeePersonalDetail.deleteMany({});

  // 4. Level 1 dependencies (Core tables)
  // Resolve circular department manager reference first
  await prisma.department.updateMany({ data: { managerId: null } });
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.workLocation.deleteMany({});
  await prisma.cluster.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.plan.deleteMany({});
  console.log("✔ Database cleanup completed.");

  // ── 1. System Permissions & Roles ────────────────────────────────────
  console.log("Seeding system permissions and roles via roleFactory...");
  const { permissions, roles } = await roleFactory.seedAll();
  console.log(`✔ Seeded ${permissions.length} permissions.`);
  console.log(`✔ Seeded ${roles.size} system roles with permissions.`);

  // ── 2. Company ────────────────────────────────────────────────────────
  const { company, adminRole } = await companyFactory.createWithBasics({
    name: "Acme Corp",
    industryType: "Technology",
  });
  console.log(`✔ Company created: ${company.name}`);

  // ── 3. Work Locations (3 branches) ───────────────────────────────────
  const workLocations = await workLocationFactory.createStandardLocations(company.id);
  const [hq, sf, london] = workLocations;
  console.log(`✔ Created ${workLocations.length} work locations.`);

  // ── 4. Departments (one per location) ─────────────────────────────────
  const deptEngineering = await departmentFactory.create({
    companyId: company.id,
    name: "Engineering",
    workLocationId: hq.id,
  });
  const deptProduct = await departmentFactory.create({
    companyId: company.id,
    name: "Product",
    workLocationId: sf.id,
  });
  const deptOperations = await departmentFactory.create({
    companyId: company.id,
    name: "Operations",
    workLocationId: london.id,
  });
  console.log("✔ Departments created.");

  // ── 5. Teams ──────────────────────────────────────────────────────────
  const { teamFE, teamBE, teamQA, teamOps } = await teamFactory.createStandardTeams({
    companyId: company.id,
    departments: {
      engineeringId: deptEngineering.id,
      productId: deptProduct.id,
      operationsId: deptOperations.id,
    },
    locations: {
      hqId: hq.id,
      sfId: sf.id,
      londonId: london.id,
    },
  });
  console.log("✔ Teams created.");

  // ── 6. Shifts ─────────────────────────────────────────────────────────
  const shifts = await shiftFactory.createStandardShifts(company.id);
  const [generalShift, morningShift, nightShift] = shifts;
  console.log(`✔ Created ${shifts.length} shifts.`);

  // ── 7. Super Admin User & Employee ────────────────────────────────────
  const adminUser = await userFactory.createUser({
    companyId: company.id,
    email: "admin@acme.com",
    password: "Admin@123",
    roleId: adminRole.id,
    workLocationId: hq.id,
  });

  const adminEmployee = await employeeFactory.createAdminEmployee({
    companyId: company.id,
    userId: adminUser.id,
    departmentId: deptEngineering.id,
    workLocationId: hq.id,
    teamId: teamBE.id,
    shiftId: generalShift.id,
  });

  // ── 8. Salary Components & Templates ──────────────────────────────────
  console.log("Seeding salary components and templates...");
  const seededComponents = await salaryComponentFactory.seedStandardComponents(company.id);
  const template = await salaryTemplateFactory.createStandardTemplate(company.id, seededComponents);

  const basicComp = seededComponents.find((c) => c.code === "BASIC")!;
  const hraComp = seededComponents.find((c) => c.code === "HRA")!;
  const transportComp = seededComponents.find((c) => c.code === "TRANSPORT")!;
  const specialComp = seededComponents.find((c) => c.code === "SPECIAL")!;
  const pfComp = seededComponents.find((c) => c.code === "PF_EMP")!;

  await salaryStructureFactory.assignStructureWithItems({
    employeeId: adminEmployee.id,
    templateId: template.id,
    grossSalary: 130000,
    netSalary: 120400,
    effectiveFrom: new Date("2022-01-01"),
    items: [
      { salaryComponentId: basicComp.id, amount: 80000 },
      { salaryComponentId: hraComp.id, amount: 32000 },
      { salaryComponentId: transportComp.id, amount: 8000 },
      { salaryComponentId: specialComp.id, amount: 10000 },
      { salaryComponentId: pfComp.id, amount: 9600 },
    ],
  });
  console.log("✔ Salary components and standard template seeded.");
  console.log("✔ Super Admin salary structure seeded: admin@acme.com / Admin@123");

  // ── 9. Dummy Employees ────────────────────────────────────────────────
  console.log("Creating dummy employees...");
  const empConfigs = [
    {
      dept: deptEngineering,
      loc: hq,
      team: teamFE,
      shift: generalShift,
      designation: "Frontend Developer",
    },
    {
      dept: deptEngineering,
      loc: hq,
      team: teamFE,
      shift: morningShift,
      designation: "UI Engineer",
    },
    {
      dept: deptEngineering,
      loc: hq,
      team: teamBE,
      shift: generalShift,
      designation: "Backend Developer",
    },
    {
      dept: deptEngineering,
      loc: hq,
      team: teamBE,
      shift: nightShift,
      designation: "DevOps Engineer",
    },
    {
      dept: deptProduct,
      loc: sf,
      team: teamQA,
      shift: generalShift,
      designation: "QA Engineer",
    },
    {
      dept: deptProduct,
      loc: sf,
      team: teamQA,
      shift: morningShift,
      designation: "Product Analyst",
    },
    {
      dept: deptOperations,
      loc: london,
      team: teamOps,
      shift: generalShift,
      designation: "Operations Manager",
    },
    {
      dept: deptOperations,
      loc: london,
      team: teamOps,
      shift: morningShift,
      designation: "HR Coordinator",
    },
  ];

  const createdEmployees = await employeeFactory.seedDummyEmployees({
    companyId: company.id,
    roleId: adminRole.id,
    managerId: adminEmployee.id,
    adminUserId: adminUser.id,
    configs: empConfigs,
  });
  console.log(
    `✔ Created ${createdEmployees.length} dummy employees with bank, statutory, and document details.`,
  );

  const allEmployees = [
    { user: adminUser, employee: adminEmployee },
    ...createdEmployees,
  ];

  // ── 10. Holidays ──────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  await holidayFactory.seedStandardHolidays({
    companyId: company.id,
    workLocations,
    year,
  });
  console.log("✔ Holidays seeded.");

  // ── 11. Leave Types ───────────────────────────────────────────────────
  const leaveTypes = await leaveTypeFactory.seedStandardLeaveTypes(company.id);
  console.log(`✔ Created ${leaveTypes.length} leave types.`);

  // ── 12. Leave Balances ────────────────────────────────────────────────
  await leaveBalanceFactory.seedBalancesForEmployees(
    allEmployees.map((e) => e.employee),
    leaveTypes,
    year,
  );
  console.log("✔ Leave balances seeded for all employees.");

  // ── 13. Leave Requests ────────────────────────────────────────────────
  await leaveRequestFactory.seedDummyRequests(
    createdEmployees.map((e) => e.employee),
    leaveTypes,
    adminUser.id,
    year,
  );
  console.log("✔ Leave requests seeded.");

  // ── 14. Attendance Logs (past 30 weekdays) ────────────────────────────
  console.log("Seeding attendance logs (past 30 weekdays)...");
  const pastDays = getPastWeekdays(30);
  const attendanceStatuses: Array<"present" | "absent" | "late"> = [
    "present",
    "present",
    "present",
    "present",
    "late",
    "absent",
  ];

  for (const { employee } of allEmployees) {
    const empShift = await prisma.employeeShift.findFirst({
      where: { employeeId: employee.id, isActive: true },
      include: { shift: true },
    });

    for (const day of pastDays) {
      const status = faker.helpers.arrayElement(attendanceStatuses);
      try {
        await attendanceFactory.generateForDate(
          employee.id,
          day,
          status,
          empShift?.shiftId,
          employee.workLocationId,
        );
      } catch {
        // Skip if unique constraint hit (date already logged)
      }
    }
  }
  console.log("✔ Attendance logs seeded for all employees.");

  console.log("\n🎉 Seeding completed successfully!\n");
  console.log("  Login: admin@acme.com / Admin@123");
  console.log(`  Employees seeded: ${allEmployees.length}`);
  console.log(
    `  Work Locations: ${workLocations.map((l) => l.name).join(", ")}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
