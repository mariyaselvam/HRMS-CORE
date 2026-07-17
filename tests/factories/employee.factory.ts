import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { BaseFactory } from "./base.factory";
import prisma from "../../src/common/utils/prisma";
import { Employee } from "@prisma/client";

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
}

export const employeeFactory = new EmployeeFactory();
