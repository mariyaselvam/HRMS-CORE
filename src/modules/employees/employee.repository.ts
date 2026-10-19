import prisma from "../../common/utils/prisma";
import {
  OnboardEmployeeInput,
  UpdateEmployeeInput,
  OnboardStep2Input,
  OnboardStep3Input,
  OnboardStep4Input,
  OnboardStep5Input,
} from "./employee.validator";
import { SystemRole } from "../../common/enums/role.enum";

export class EmployeeRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email },
    });
  }

  async findByEmployeeCode(companyId: string, employeeCode: string) {
    return prisma.employee.findFirst({
      where: {
        companyId,
        employeeCode,
      },
    });
  }

  async createEmployee(
    companyId: string,
    data: OnboardEmployeeInput,
    hashedPassword: string,
  ) {
    return prisma.$transaction(async (tx) => {
      let role = await tx.role.findFirst({
        where: {
          OR: [
            { companyId, name: data.role || SystemRole.EMPLOYEE },
            { companyId: null, name: data.role || SystemRole.EMPLOYEE },
          ],
        },
      });

      if (!role) {
        role = await tx.role.create({
          data: {
            name: data.role || SystemRole.EMPLOYEE,
            companyId,
            description: `${data.role || SystemRole.EMPLOYEE} access`,
            isSystemRole: true,
          },
        });
      }

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          companyId,
          roleId: role.id,
        },
      });

      let targetLocationId = data.workLocationId;
      if (!targetLocationId) {
        const defaultLoc = await tx.workLocation.findFirst({ where: { companyId } });
        if (!defaultLoc) throw new Error('No work location exists for company');
        targetLocationId = defaultLoc.id;
      }

      const employee = await tx.employee.create({
        data: {
          employeeCode: data.employeeCode,
          userId: user.id,
          companyId,
          departmentId: data.departmentId,
          workLocationId: targetLocationId,
          managerId: data.managerId,
          dateOfJoining: new Date(data.dateOfJoining),
          employmentStatus: data.status || "probation",
          onboardingStep: 2,
          profileCompletion: 15,
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          department: true,
          workLocation: true,
        },
      });

      return employee;
    });
  }

  async upsertPersonalDetails(employeeId: string, data: OnboardStep2Input) {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      mobile: data.mobile,
      gender: data.gender,
      dob: data.dob ? new Date(data.dob) : null,
      maritalStatus: data.maritalStatus,
      currentAddress: data.currentAddress,
      permAddress: data.permAddress,
    };

    return prisma.$transaction(async (tx) => {
      const details = await tx.employeePersonalDetail.upsert({
        where: { employeeId },
        update: payload,
        create: { ...payload, employeeId },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          onboardingStep: { set: 3 },
          profileCompletion: { set: 30 },
        },
      });

      return details;
    });
  }

  async upsertJobDetails(employeeId: string, data: OnboardStep3Input) {
    const payload = {
      designation: data.designation,
      employmentType: data.employmentType,
      workLocationType: data.workLocationType,
      probationPeriod: data.probationPeriod,
      noticePeriod: data.noticePeriod,
    };

    return prisma.$transaction(async (tx) => {
      const details = await tx.employeeJobDetail.upsert({
        where: { employeeId },
        update: payload,
        create: { ...payload, employeeId },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          salaryTemplateId: data.salaryTemplateId || null,
          onboardingStep: { set: 4 },
          profileCompletion: { set: 45 },
        },
      });

      return details;
    });
  }

  async upsertBankDetails(employeeId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const details = await tx.employeeBankDetail.upsert({
        where: { employeeId },
        update: {
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          bankName: data.bankName,
          branchName: data.branchName,
        },
        create: {
          employeeId,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          bankName: data.bankName,
          branchName: data.branchName,
        },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          onboardingStep: { set: 5 },
          profileCompletion: { set: 60 },
        },
      });

      return details;
    });
  }

  async upsertStatutoryDetails(employeeId: string, data: OnboardStep5Input) {
    return prisma.$transaction(async (tx) => {
      const statutory = await tx.employeeStatutoryDetail.upsert({
        where: { employeeId },
        update: {
          pan: data.pan,
          uan: data.uan,
          pfApplicable: data.pfApplicable,
          esiApplicable: data.esiApplicable,
          esiNumber: data.esiNumber,
          ptState: data.ptState,
          taxRegime: data.taxRegime,
        },
        create: {
          employeeId,
          pan: data.pan,
          uan: data.uan,
          pfApplicable: data.pfApplicable,
          esiApplicable: data.esiApplicable,
          esiNumber: data.esiNumber,
          ptState: data.ptState,
          taxRegime: data.taxRegime,
        },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          onboardingStep: { set: 6 },
          profileCompletion: { set: 80 },
        },
      });

      return statutory;
    });
  }

  async listEmployees(companyId: string, locationId?: string) {
    const where: any = { companyId };
    if (locationId) {
      where.workLocationId = locationId;
    }
    return prisma.employee.findMany({
      where,
      include: {
        user: { select: { email: true } },
        department: { select: { name: true } },
        workLocation: { select: { name: true } },
        manager: { select: { employeeCode: true } },
        team: { select: { name: true } },
        personalDetails: true,
        jobDetails: true,
        bankDetails: true,
        statutoryDetails: true,
        documents: true,
      },
    });
  }

  async getEmployeeById(id: string, companyId: string) {
    return prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { email: true, role: true } },
        department: true,
        workLocation: true,
        team: true,
        personalDetails: true,
        jobDetails: true,
        bankDetails: true,
        statutoryDetails: true,
        documents: true,
        manager: {
          select: {
            id: true,
            employeeCode: true,
            personalDetails: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async updateEmployee(
    id: string,
    companyId: string,
    data: UpdateEmployeeInput,
  ) {
    return prisma.employee.update({
      where: { id, companyId },
      data: {
        departmentId: data.departmentId,
        workLocationId: data.workLocationId,
        teamId: data.teamId,
        managerId: data.managerId,
        employmentStatus: data.status,
        // If finalizing, set progress to 100%
        profileCompletion: data.status === "active" ? 100 : undefined,
        onboardingStep: data.status === "active" ? 7 : undefined,
      },
    });
  }

  async addEmployeeDocument(data: {
    employeeId: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
    uploadedBy: string;
  }) {
    return prisma.employeeDocument.create({
      data: {
        employeeId: data.employeeId,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        uploadedBy: data.uploadedBy,
      },
    });
  }
}
