import "dotenv/config";
import prisma from "../src/common/utils/prisma";
import { companyFactory } from "../tests/factories/company.factory";
import { departmentFactory } from "../tests/factories/department.factory";
import { employeeFactory } from "../tests/factories/employee.factory";
import { shiftFactory } from "../tests/factories/shift.factory";
import {
  leaveTypeFactory,
  leaveBalanceFactory,
  leaveRequestFactory,
} from "../tests/factories/leave.factory";
import { attendanceFactory } from "../tests/factories/attendance.factory";
import { SystemRole } from "../src/common/enums/role.enum";
import {
  SystemPermission,
  DEFAULT_ROLE_PERMISSIONS,
} from "../src/common/enums/permission.enum";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcrypt";

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
  await prisma.company.deleteMany({});
  await prisma.plan.deleteMany({});
  console.log("✔ Database cleanup completed.");

  // ── 1. System Permissions ──────────────────────────────────────────────
  console.log("Seeding system permissions...");
  const permissions = Object.values(SystemPermission);
  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: `Access to ${code}` },
    });
  }
  console.log(`✔ Seeded ${permissions.length} permissions.`);

  // ── 2. System Roles ───────────────────────────────────────────────────
  console.log("Seeding system roles...");
  for (const roleName of Object.values(SystemRole)) {
    let role = await prisma.role.findFirst({
      where: { companyId: null, name: roleName },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          companyId: null,
          description: `System role: ${roleName}`,
          isSystemRole: true,
        },
      });
    }
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
    for (const permCode of defaultPerms) {
      const dbPerm = await prisma.permission.findUnique({
        where: { code: permCode },
      });
      if (dbPerm) {
        const exists = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: dbPerm.id },
          },
        });
        if (!exists) {
          await prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: dbPerm.id },
          });
        }
      }
    }
  }
  console.log("✔ System roles and permissions seeded.");

  // ── 3. Company ────────────────────────────────────────────────────────
  const { company, adminRole } = await companyFactory.createWithBasics({
    name: "Acme Corp",
    industryType: "Technology",
  });
  console.log(`✔ Company created: ${company.name}`);

  // ── 4. Work Locations (3 branches) ───────────────────────────────────
  const locationData = [
    {
      name: "Headquarters (New York)",
      address: "123 Tech Blvd, New York, NY 10001",
    },
    {
      name: "Engineering Hub (San Francisco)",
      address: "456 Innovation Ave, San Francisco, CA 94107",
    },
    {
      name: "Operations Office (London)",
      address: "789 Business Park, London EC1A 1BB",
    },
  ];
  const workLocations = await Promise.all(
    locationData.map((loc) =>
      prisma.workLocation.create({ data: { companyId: company.id, ...loc } }),
    ),
  );
  const [hq, sf, london] = workLocations;
  console.log(`✔ Created ${workLocations.length} work locations.`);

  // ── 5. Departments (one per location) ─────────────────────────────────
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

  // ── 6. Teams ──────────────────────────────────────────────────────────
  const teamFE = await prisma.team.create({
    data: {
      companyId: company.id,
      departmentId: deptEngineering.id,
      workLocationId: hq.id,
      name: "Frontend Team",
    },
  });
  const teamBE = await prisma.team.create({
    data: {
      companyId: company.id,
      departmentId: deptEngineering.id,
      workLocationId: hq.id,
      name: "Backend Team",
    },
  });
  const teamQA = await prisma.team.create({
    data: {
      companyId: company.id,
      departmentId: deptProduct.id,
      workLocationId: sf.id,
      name: "QA Team",
    },
  });
  const teamOps = await prisma.team.create({
    data: {
      companyId: company.id,
      departmentId: deptOperations.id,
      workLocationId: london.id,
      name: "Ops Team",
    },
  });
  console.log("✔ Teams created.");

  // ── 7. Shifts ─────────────────────────────────────────────────────────
  const shifts = await shiftFactory.createStandardShifts(company.id);
  const [generalShift, morningShift, nightShift] = shifts;
  console.log(`✔ Created ${shifts.length} shifts.`);

  // ── 8. Super Admin user ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const adminUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "admin@acme.com",
      passwordHash,
      roleId: adminRole.id,
      workLocationId: hq.id,
    },
  });
  const adminEmployee = await prisma.employee.create({
    data: {
      companyId: company.id,
      userId: adminUser.id,
      employeeCode: "ADMIN001",
      departmentId: deptEngineering.id,
      workLocationId: hq.id,
      teamId: teamBE.id,
      dateOfJoining: new Date("2022-01-01"),
      employmentStatus: "active",
      onboardingStep: 6,
      profileCompletion: 100,
    },
  });
  // Admin personal details
  await prisma.employeePersonalDetail.create({
    data: {
      employeeId: adminEmployee.id,
      firstName: "Super",
      lastName: "Admin",
      gender: "male",
      mobile: "+1-555-000-0001",
      dob: new Date("1985-06-15"),
      maritalStatus: "Married",
      currentAddress: "123 Tech Blvd, New York, NY",
      permAddress: "123 Tech Blvd, New York, NY",
    },
  });
  await prisma.employeeJobDetail.create({
    data: {
      employeeId: adminEmployee.id,
      designation: "Chief Technology Officer",
      employmentType: "Full-time",
      workLocationType: "Office",
      probationPeriod: 0,
      noticePeriod: 90,
      confirmationDate: new Date("2022-04-01"),
    },
  });
  await prisma.employeeBankDetail.create({
    data: {
      employeeId: adminEmployee.id,
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      branchName: "New York Branch",
    },
  });
  await prisma.employeeStatutoryDetail.create({
    data: {
      employeeId: adminEmployee.id,
      pan: "AAAPL1234C",
      uan: "100000000001",
      pfApplicable: true,
      esiNumber: "ESI100001",
      esiApplicable: true,
      ptState: "NY",
      taxRegime: "new",
    },
  });
  await prisma.employeeShift.create({
    data: {
      employeeId: adminEmployee.id,
      shiftId: generalShift.id,
      effectiveFrom: new Date("2022-01-01"),
    },
  });
  // ── 8a. Salary Components & Templates ────────────────────────────────
  console.log("Seeding salary components and templates...");
  const componentConfigs = [
    {
      code: "BASIC",
      name: "Basic Salary",
      type: "earning" as const,
      calcType: "fixed" as const,
      calcValue: 0,
      isTaxable: true,
      pfApplicable: true,
      esiApplicable: true,
    },
    {
      code: "HRA",
      name: "House Rent Allowance",
      type: "earning" as const,
      calcType: "pct_basic" as const,
      calcValue: 40,
      isTaxable: true,
      pfApplicable: false,
      esiApplicable: true,
    },
    {
      code: "TRANSPORT",
      name: "Transport Allowance",
      type: "earning" as const,
      calcType: "fixed" as const,
      calcValue: 1600,
      isTaxable: false,
      pfApplicable: false,
      esiApplicable: false,
    },
    {
      code: "SPECIAL",
      name: "Special Allowance",
      type: "earning" as const,
      calcType: "remaining" as const,
      calcValue: 0,
      isTaxable: true,
      pfApplicable: false,
      esiApplicable: true,
    },
    {
      code: "PF_EMP",
      name: "Provident Fund (Employee)",
      type: "deduction" as const,
      calcType: "pct_basic" as const,
      calcValue: 12,
      isTaxable: false,
      pfApplicable: true,
      esiApplicable: false,
    },
  ];

  const seededComponents = [];
  for (const config of componentConfigs) {
    const comp = await prisma.salaryComponent.upsert({
      where: { companyId_code: { companyId: company.id, code: config.code } },
      update: {},
      create: { companyId: company.id, ...config },
    });
    seededComponents.push(comp);
  }

  const template = await prisma.salaryTemplate.create({
    data: {
      companyId: company.id,
      name: "Standard Corporate Template",
      description:
        "Standard salary template with HRA (40% of basic) and PF contribution (12% of basic).",
    },
  });

  const basicComp = seededComponents.find((c) => c.code === "BASIC")!;
  const hraComp = seededComponents.find((c) => c.code === "HRA")!;
  const transportComp = seededComponents.find((c) => c.code === "TRANSPORT")!;
  const specialComp = seededComponents.find((c) => c.code === "SPECIAL")!;
  const pfComp = seededComponents.find((c) => c.code === "PF_EMP")!;

  await prisma.salaryTemplateItem.createMany({
    data: [
      {
        salaryTemplateId: template.id,
        salaryComponentId: basicComp.id,
        calculationOrder: 1,
      },
      {
        salaryTemplateId: template.id,
        salaryComponentId: hraComp.id,
        calculationOrder: 2,
      },
      {
        salaryTemplateId: template.id,
        salaryComponentId: transportComp.id,
        calculationOrder: 3,
      },
      {
        salaryTemplateId: template.id,
        salaryComponentId: specialComp.id,
        calculationOrder: 4,
      },
      {
        salaryTemplateId: template.id,
        salaryComponentId: pfComp.id,
        calculationOrder: 5,
      },
    ],
  });
  console.log("✔ Salary components and standard template seeded.");

  // Link Admin to standard template
  await prisma.employee.update({
    where: { id: adminEmployee.id },
    data: { salaryTemplateId: template.id },
  });

  const adminSalaryStructure = await prisma.salaryStructure.create({
    data: {
      employeeId: adminEmployee.id,
      grossSalary: 130000,
      netSalary: 120400, // 130000 - 9600
      effectiveFrom: new Date("2022-01-01"),
      isActive: true,
    },
  });

  await prisma.salaryStructureItem.createMany({
    data: [
      {
        salaryStructureId: adminSalaryStructure.id,
        salaryComponentId: basicComp.id,
        amount: 80000,
      },
      {
        salaryStructureId: adminSalaryStructure.id,
        salaryComponentId: hraComp.id,
        amount: 32000,
      },
      {
        salaryStructureId: adminSalaryStructure.id,
        salaryComponentId: transportComp.id,
        amount: 8000,
      },
      {
        salaryStructureId: adminSalaryStructure.id,
        salaryComponentId: specialComp.id,
        amount: 10000,
      },
      {
        salaryStructureId: adminSalaryStructure.id,
        salaryComponentId: pfComp.id,
        amount: 9600,
      },
    ],
  });
  console.log(
    "✔ Super Admin salary structure seeded: admin@acme.com / Admin@123",
  );

  // ── 9. Dummy Employees ────────────────────────────────────────────────
  console.log("Creating dummy employees...");

  // Config: [dept, workLocation, team, shift, designation]
  type EmpConfig = {
    dept: any;
    loc: any;
    team: any;
    shift: any;
    designation: string;
  };
  const empConfigs: EmpConfig[] = [
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

  const createdEmployees: any[] = [];
  const bankNames = [
    "HDFC Bank",
    "ICICI Bank",
    "SBI",
    "Axis Bank",
    "Barclays",
    "Lloyds Bank",
    "Wells Fargo",
    "Chase Bank",
  ];
  const ptStates = ["NY", "CA", "London", "MH", "KA", "TN"];

  for (let i = 0; i < empConfigs.length; i++) {
    const cfg = empConfigs[i];
    const { user, employee } = await employeeFactory.createFull(
      company.id,
      cfg.dept.id,
      cfg.loc.id,
      adminRole.id,
      { shiftId: cfg.shift.id, managerId: adminEmployee.id },
    );

    // Update team & manager on employee
    await prisma.employee.update({
      where: { id: employee.id },
      data: { teamId: cfg.team.id, managerId: adminEmployee.id },
    });

    // Update job designation
    await prisma.employeeJobDetail.update({
      where: { employeeId: employee.id },
      data: { designation: cfg.designation, workLocationType: "Office" },
    });

    // Bank Details
    const pan = `${faker.string.alpha({ length: 5, casing: "upper" })}${faker.string.numeric(4)}${faker.string.alpha({ length: 1, casing: "upper" })}`;
    const uan = `1000000000${String(i + 10).padStart(2, "0")}`;
    const esiNum = `ESI10000${String(i + 10).padStart(2, "0")}`;
    const bankName = bankNames[i % bankNames.length];

    await prisma.employeeBankDetail.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        accountNumber: faker.finance.accountNumber(10),
        ifscCode: `${faker.string.alpha({ length: 4, casing: "upper" })}0${faker.string.numeric(6)}`,
        bankName,
        branchName: `${cfg.loc.name} Branch`,
      },
    });

    // Statutory Details
    await prisma.employeeStatutoryDetail.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        pan,
        uan,
        pfApplicable: true,
        esiNumber: esiNum,
        esiApplicable: i % 2 === 0,
        ptState: ptStates[i % ptStates.length],
        taxRegime: i % 2 === 0 ? "new" : "old",
      },
    });

    // Documents
    const docTypes = ["Identity Proof", "Address Proof", "Degree Certificate"];
    for (const docType of docTypes) {
      await prisma.employeeDocument.create({
        data: {
          employeeId: employee.id,
          documentType: docType,
          fileUrl: `https://storage.example.com/docs/${employee.id}/${docType.replace(/ /g, "_").toLowerCase()}.pdf`,
          fileName: `${docType.replace(/ /g, "_").toLowerCase()}.pdf`,
          uploadedBy: adminUser.id,
        },
      });
    }

    createdEmployees.push({ user, employee });
  }
  console.log(
    `✔ Created ${createdEmployees.length} dummy employees with bank, statutory, and document details.`,
  );

  // All employees including admin
  const allEmployees = [
    { user: adminUser, employee: adminEmployee },
    ...createdEmployees,
  ];

  // ── 10. Holidays ──────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const globalHolidays = [
    { date: new Date(`${year}-01-01`), name: "New Year's Day" },
    { date: new Date(`${year}-05-01`), name: "International Labour Day" },
    { date: new Date(`${year}-12-25`), name: "Christmas Day" },
    { date: new Date(`${year}-12-26`), name: "Boxing Day" },
  ];
  const hqHolidays = [
    {
      date: new Date(`${year}-07-04`),
      name: "Independence Day (US)",
      workLocationId: hq.id,
    },
    {
      date: new Date(`${year}-11-28`),
      name: "Thanksgiving Day",
      workLocationId: hq.id,
    },
  ];
  const londonHolidays = [
    {
      date: new Date(`${year}-04-18`),
      name: "Good Friday (UK)",
      workLocationId: london.id,
    },
    {
      date: new Date(`${year}-08-25`),
      name: "Summer Bank Holiday",
      workLocationId: london.id,
    },
  ];

  for (const h of globalHolidays) {
    for (const loc of workLocations) {
      await prisma.holiday.upsert({
        where: {
          companyId_workLocationId_date: {
            companyId: company.id,
            workLocationId: loc.id,
            date: h.date,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          workLocationId: loc.id,
          date: h.date,
          name: h.name,
        },
      });
    }
  }
  for (const h of [...hqHolidays, ...londonHolidays]) {
    await prisma.holiday.upsert({
      where: {
        companyId_workLocationId_date: {
          companyId: company.id,
          workLocationId: h.workLocationId,
          date: h.date,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        workLocationId: h.workLocationId,
        date: h.date,
        name: h.name,
      },
    });
  }
  console.log("✔ Holidays seeded.");

  // ── 11. Leave Types ───────────────────────────────────────────────────
  const leaveTypeConfigs = [
    { name: "Casual Leave", maxDays: 12, isPaid: true, carryForward: false },
    { name: "Sick Leave", maxDays: 8, isPaid: true, carryForward: false },
    { name: "Earned Leave", maxDays: 15, isPaid: true, carryForward: true },
    { name: "Unpaid Leave", maxDays: 30, isPaid: false, carryForward: false },
  ];
  const leaveTypes = await Promise.all(
    leaveTypeConfigs.map((lt) =>
      leaveTypeFactory.create({ companyId: company.id, ...lt }),
    ),
  );
  console.log(`✔ Created ${leaveTypes.length} leave types.`);

  // ── 12. Leave Balances ────────────────────────────────────────────────
  for (const { employee } of allEmployees) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: employee.id,
            leaveTypeId: lt.id,
            year,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year,
          entitledDays: lt.maxDays,
          balance:
            lt.maxDays -
            faker.number.int({ min: 0, max: Math.min(3, lt.maxDays) }),
          carriedForward: lt.carryForward
            ? faker.number.int({ min: 0, max: 5 })
            : 0,
        },
      });
    }
  }
  console.log("✔ Leave balances seeded for all employees.");

  // ── 13. Leave Requests ────────────────────────────────────────────────
  const statuses = ["approved", "approved", "pending", "rejected"];
  for (const { employee } of createdEmployees) {
    const lt = faker.helpers.arrayElement(leaveTypes.slice(0, 3));
    const startDate = faker.date.between({
      from: new Date(`${year}-01-01`),
      to: new Date(`${year}-06-30`),
    });
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + faker.number.int({ min: 1, max: 3 }));
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / 86400000,
    );
    const status = faker.helpers.arrayElement(statuses);

    await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: lt.id,
        startDate,
        endDate,
        totalDays,
        reason: faker.lorem.sentence(),
        status,
        approvedBy: status !== "pending" ? adminUser.id : null,
        approvedAt: status !== "pending" ? new Date() : null,
        rejectionReason:
          status === "rejected"
            ? "Insufficient leave balance or business requirement."
            : null,
      },
    });
  }
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
    // Find employee's shift assignment
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
