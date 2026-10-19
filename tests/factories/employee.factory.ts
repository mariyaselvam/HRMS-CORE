import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { BaseFactory } from "./base.factory";
import prisma from "../../src/common/utils/prisma";
import { Employee, User } from "@prisma/client";

export class EmployeeFactory extends BaseFactory<Employee> {
  protected model = prisma.employee;

  protected async definition() {
    const step = faker.number.int({ min: 1, max: 6 });
    const progress = [0, 15, 30, 45, 60, 80][step - 1];

    return {
      employeeCode: `EMP${faker.string.uuid().split("-")[0].toUpperCase()}${faker.string.numeric(4)}`,
      dateOfJoining: faker.date.past(),
      employmentStatus: step === 6 ? "active" : "probation",
      onboardingStep: step,
      profileCompletion: progress,
    };
  }

  async createFull(
    companyId: string,
    departmentId: string,
    workLocationId: string,
    roleId: string,
    overrides: any = {},
  ) {
    const email = overrides.email || faker.internet.email();
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        companyId,
        email,
        passwordHash,
        roleId,
        isActive: true,
      },
    });

    const shiftId = overrides.shiftId;
    const managerId = overrides.managerId;

    delete overrides.shiftId;
    delete overrides.managerId;

    // 2. Create Employee
    const employee = await this.create({
      companyId,
      departmentId,
      workLocationId,
      userId: user.id,
      managerId,
      ...overrides,
    });

    if (shiftId) {
      await prisma.employeeShift.create({
        data: {
          employeeId: employee.id,
          shiftId: shiftId,
          effectiveFrom: new Date("2024-01-01"),
        },
      });
    }

    // 3. Create Personal Details
    await prisma.employeePersonalDetail.create({
      data: {
        employeeId: employee.id,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        gender: faker.helpers.arrayElement(["male", "female"]),
        mobile: faker.phone.number(),
        dob: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
        maritalStatus: faker.helpers.arrayElement(["Single", "Married"]),
        currentAddress: faker.location.streetAddress(),
        permAddress: faker.location.streetAddress(),
      },
    });

    // 4. Create Job Details
    await prisma.employeeJobDetail.create({
      data: {
        employeeId: employee.id,
        designation: faker.person.jobTitle(),
        employmentType: "Full-time",
        workLocationType: "Office",
        probationPeriod: 3,
        noticePeriod: 30,
        confirmationDate: faker.date.future({ years: 1 }),
      },
    });

    // 5. Create Salary Structure
    const defaultCodes = ["BASIC", "HRA", "TRANSPORT", "SPECIAL"];
    const components = [];
    for (const code of defaultCodes) {
      let comp = await prisma.salaryComponent.findFirst({
        where: { companyId, code },
      });
      if (!comp) {
        comp = await prisma.salaryComponent.create({
          data: {
            companyId,
            code,
            name: code.charAt(0) + code.slice(1).toLowerCase() + " Salary",
            type: "earning",
            calcType: "fixed",
            calcValue: 0,
            isTaxable: true,
            isActive: true,
          },
        });
      }
      components.push(comp);
    }

    const basicComp = components.find((c) => c.code === "BASIC")!;
    const hraComp = components.find((c) => c.code === "HRA")!;
    const transportComp = components.find((c) => c.code === "TRANSPORT")!;
    const specialComp = components.find((c) => c.code === "SPECIAL")!;

    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId: employee.id,
        grossSalary: 55000,
        netSalary: 55000,
        effectiveFrom: new Date("2024-01-01"),
        isActive: true,
      },
    });

    await prisma.salaryStructureItem.createMany({
      data: [
        {
          salaryStructureId: structure.id,
          salaryComponentId: basicComp.id,
          amount: 30000,
        },
        {
          salaryStructureId: structure.id,
          salaryComponentId: hraComp.id,
          amount: 15000,
        },
        {
          salaryStructureId: structure.id,
          salaryComponentId: transportComp.id,
          amount: 5000,
        },
        {
          salaryStructureId: structure.id,
          salaryComponentId: specialComp.id,
          amount: 5000,
        },
      ],
    });

    return { user, employee };
  }

  /**
   * Creates the super admin employee record with complete personal, job, bank, statutory, and shift details.
   */
  async createAdminEmployee(params: {
    companyId: string;
    userId: string;
    departmentId: string;
    workLocationId: string;
    teamId: string;
    shiftId: string;
    overrides?: Partial<Employee>;
  }): Promise<Employee> {
    const employee = await this.create({
      companyId: params.companyId,
      userId: params.userId,
      employeeCode: "ADMIN001",
      departmentId: params.departmentId,
      workLocationId: params.workLocationId,
      teamId: params.teamId,
      dateOfJoining: new Date("2022-01-01"),
      employmentStatus: "active",
      onboardingStep: 6,
      profileCompletion: 100,
      ...params.overrides,
    });

    await prisma.employeePersonalDetail.create({
      data: {
        employeeId: employee.id,
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
        employeeId: employee.id,
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
        employeeId: employee.id,
        accountNumber: "1234567890",
        ifscCode: "HDFC0001234",
        bankName: "HDFC Bank",
        branchName: "New York Branch",
      },
    });

    await prisma.employeeStatutoryDetail.create({
      data: {
        employeeId: employee.id,
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
        employeeId: employee.id,
        shiftId: params.shiftId,
        effectiveFrom: new Date("2022-01-01"),
      },
    });

    return employee;
  }

  /**
   * Seeds a batch of dummy employees with bank details, statutory records, and document attachments.
   */
  async seedDummyEmployees(params: {
    companyId: string;
    roleId: string;
    managerId: string;
    adminUserId: string;
    configs: Array<{
      dept: { id: string };
      loc: { id: string; name: string };
      team: { id: string };
      shift: { id: string };
      designation: string;
    }>;
  }): Promise<Array<{ user: User; employee: Employee }>> {
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
    const docTypes = ["Identity Proof", "Address Proof", "Degree Certificate"];

    const created: Array<{ user: User; employee: Employee }> = [];

    for (let i = 0; i < params.configs.length; i++) {
      const cfg = params.configs[i];
      const { user, employee } = await this.createFull(
        params.companyId,
        cfg.dept.id,
        cfg.loc.id,
        params.roleId,
        { shiftId: cfg.shift.id, managerId: params.managerId },
      );

      await prisma.employee.update({
        where: { id: employee.id },
        data: { teamId: cfg.team.id, managerId: params.managerId },
      });

      await prisma.employeeJobDetail.update({
        where: { employeeId: employee.id },
        data: { designation: cfg.designation, workLocationType: "Office" },
      });

      const pan = `${faker.string.alpha({ length: 5, casing: "upper" })}${faker.string.numeric(4)}${faker.string.alpha({ length: 1, casing: "upper" })}`;
      const uan = `1000000000${String(i + 10).padStart(2, "0")}`;
      const esiNum = `ESI10000${String(i + 10).padStart(2, "0")}`;
      const bankName = bankNames[i % bankNames.length];

      await prisma.employeeBankDetail.create({
        data: {
          employeeId: employee.id,
          accountNumber: faker.finance.accountNumber(10),
          ifscCode: `${faker.string.alpha({ length: 4, casing: "upper" })}0${faker.string.numeric(6)}`,
          bankName,
          branchName: `${cfg.loc.name} Branch`,
        },
      });

      await prisma.employeeStatutoryDetail.create({
        data: {
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

      for (const docType of docTypes) {
        await prisma.employeeDocument.create({
          data: {
            employeeId: employee.id,
            documentType: docType,
            fileUrl: `https://storage.example.com/docs/${employee.id}/${docType.replace(/ /g, "_").toLowerCase()}.pdf`,
            fileName: `${docType.replace(/ /g, "_").toLowerCase()}.pdf`,
            uploadedBy: params.adminUserId,
          },
        });
      }

      created.push({ user, employee });
    }

    return created;
  }
}

export const employeeFactory = new EmployeeFactory();
